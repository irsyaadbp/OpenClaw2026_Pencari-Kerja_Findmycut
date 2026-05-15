import { createChildLogger } from "../lib/logger";
import { downloadAndUpload } from "../lib/r2";
import * as analysisRepo from "../repositories/analysis.repo";
import * as agentLogRepo from "../repositories/agent-log.repo";
import * as recRepo from "../repositories/recommendation.repo";

const log = createChildLogger("agent-runner");

// Dynamic import for agent pipeline (loaded once on first use)
let pipelineModule: any = null;

async function loadPipeline() {
  if (!pipelineModule) {
    try {
      const { join } = await import("path");
      const agentPath = join(process.cwd(), "..", "agent", "src", "pipeline.ts");
      pipelineModule = await import(agentPath);
      log.info("Agent pipeline module loaded successfully");
    } catch (err) {
      log.error({ err }, "Failed to load agent pipeline module");
      throw err;
    }
  }
  return pipelineModule;
}

export interface RunAgentOptions {
  analysisId: string;
  imageUrls: string[];
  userLatitude?: number;
  userLongitude?: number;
  tier?: "free" | "pro";
}

/**
 * Run the agent pipeline asynchronously.
 * This function returns immediately — the pipeline runs in the background.
 * Progress is logged to the agent_logs table in real-time.
 */
export function runAgentAsync(options: RunAgentOptions): void {
  const { analysisId, imageUrls, userLatitude, userLongitude, tier } = options;

  executePipeline(analysisId, imageUrls, userLatitude, userLongitude, tier).catch(
    (err) => {
      log.error({ err, analysisId }, "Agent pipeline crashed unexpectedly");
    }
  );
}

async function executePipeline(
  analysisId: string,
  imageUrls: string[],
  userLatitude?: number,
  userLongitude?: number,
  tier?: "free" | "pro"
): Promise<void> {
  const startTime = Date.now();

  log.info({ analysisId, imageCount: imageUrls.length, tier }, "🚀 Starting agent pipeline");

  try {
    await analysisRepo.updateStatus(analysisId, "processing", "vision");

    const { runPipeline } = await loadPipeline();

    const result = await runPipeline(
      imageUrls,
      {
        onProgress: async (agent: string, step: string, message: string, toolCall?: string) => {
          try {
            await agentLogRepo.create({
              analysisId,
              agentName: agent,
              step,
              message,
              toolCall: toolCall || undefined,
              // Reasoning is embedded in "thinking" step messages
              reasoning: step === "thinking" ? message : undefined,
            });

            if (step === "start") {
              await analysisRepo.updateStatus(analysisId, "processing", agent);
            }

            log.info({ analysisId, agent, step, toolCall }, `${message}`);
          } catch (logErr) {
            log.warn({ err: logErr, analysisId, agent }, "Failed to log agent step");
          }
        },
      },
      {
        userLatitude,
        userLongitude,
        tier: tier || "free",
      }
    );

    // Save face features (skip if features are undefined/empty)
    const features = result.features || {};
    const featureUpdate: Record<string, any> = {};
    if (features.face_shape) featureUpdate.faceShape = features.face_shape;
    if (features.face_confidence) featureUpdate.faceConfidence = features.face_confidence;
    if (features.hair_thickness) featureUpdate.hairDensity = features.hair_thickness;
    if (features.hair_texture) featureUpdate.hairTexture = features.hair_texture;

    if (Object.keys(featureUpdate).length > 0) {
      await analysisRepo.updateFeatures(analysisId, featureUpdate);
    }

    // Download Replicate generated images → save to R2 (permanent URLs)
    // Wrapped in try-catch so image download failures don't block completion
    let processedRecs = result.recommendations;
    try {
      log.info({ analysisId }, "⬇️ Downloading generated images to R2...");
      processedRecs = await Promise.all(
        result.recommendations.map(async (rec: any) => {
          let imageUrls: Record<string, string> = {};

          if (rec.image_urls) {
            for (const [angle, url] of Object.entries(rec.image_urls)) {
              if (url && typeof url === "string" && url.startsWith("http")) {
                try {
                  const saved = await downloadAndUpload(url as string, "hairstyles");
                  imageUrls[angle] = saved.url;
                } catch (dlErr) {
                  log.warn({ err: dlErr, angle, url }, "Failed to download image, keeping original URL");
                  imageUrls[angle] = url as string;
                }
              }
            }
          }

          if (Object.keys(imageUrls).length === 0 && rec.reference_image_url?.startsWith("http")) {
            try {
              const saved = await downloadAndUpload(rec.reference_image_url, "hairstyles");
              imageUrls.front = saved.url;
            } catch (dlErr) {
              log.warn({ err: dlErr }, "Failed to download reference image");
            }
          }

          return { ...rec, image_urls: imageUrls };
        })
      );
    } catch (imgErr) {
      log.warn({ err: imgErr, analysisId }, "Image download phase failed, continuing with original URLs");
    }

    // Save recommendations to DB
    for (const rec of processedRecs) {
      try {
        await recRepo.create({
          analysisId,
          styleName: rec.style_name,
          matchScore: rec.match_percentage,
          barberInstruction: rec.barber_instruction,
          maintenance: rec.maintenance_tips,
          stylingTips: rec.styling_tips,
          imageUrls: rec.image_urls || {},
          barbershop: result.barbershops
            ? result.barbershops.barbershops.find(
                (b: any) => b.recommended_style === rec.style_name
              ) || null
            : null,
          isLocked: false,
        });
      } catch (recErr) {
        log.warn({ err: recErr, analysisId, style: rec.style_name }, "Failed to save recommendation");
      }
    }

    // Mark as completed — always reaches here even if image downloads or saves partially fail
    // Use small delay to ensure any in-flight onProgress callbacks finish first
    await new Promise((r) => setTimeout(r, 500));
    await analysisRepo.updateStatus(analysisId, "completed", "done");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(
      { analysisId, elapsed_s: elapsed, recommendations: processedRecs.length },
      `✅ Pipeline completed in ${elapsed}s`
    );
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.error({ err, analysisId, elapsed_s: elapsed }, "❌ Pipeline failed");

    try {
      await analysisRepo.updateStatus(analysisId, "failed", undefined);
      await agentLogRepo.create({
        analysisId,
        agentName: "pipeline",
        step: "error",
        message: `Pipeline failed: ${err.message}`,
      });
    } catch (updateErr) {
      log.error({ err: updateErr, analysisId }, "Failed to update error status");
    }
  }
}
