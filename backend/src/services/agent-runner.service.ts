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

    // Save face features
    await analysisRepo.updateFeatures(analysisId, {
      faceShape: result.features.face_shape,
      faceConfidence: result.features.face_confidence,
      hairDensity: result.features.hair_thickness,
      hairTexture: result.features.hair_texture,
    });

    // Download Replicate generated images → save to R2 (permanent URLs)
    log.info({ analysisId }, "⬇️ Downloading generated images to R2...");
    const processedRecs = await Promise.all(
      result.recommendations.map(async (rec: any) => {
        let imageUrls: Record<string, string> = {};

        // If recommendation has generated image URLs (from Replicate), download them
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

        // If no images yet but has reference_image_url, save that too
        if (Object.keys(imageUrls).length === 0 && rec.reference_image_url?.startsWith("http")) {
          try {
            const saved = await downloadAndUpload(rec.reference_image_url, "hairstyles");
            imageUrls.front = saved.url;
          } catch (dlErr) {
            log.warn({ err: dlErr }, "Failed to download reference image");
          }
        }

        return {
          ...rec,
          image_urls: imageUrls,
        };
      })
    );

    // Save recommendations to DB
    for (const rec of processedRecs) {
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
    }

    // Mark as completed
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
