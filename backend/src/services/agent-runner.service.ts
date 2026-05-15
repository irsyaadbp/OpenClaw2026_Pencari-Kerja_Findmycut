import { createChildLogger } from "../lib/logger";
import * as analysisRepo from "../repositories/analysis.repo";
import * as agentLogRepo from "../repositories/agent-log.repo";
import * as recRepo from "../repositories/recommendation.repo";

const log = createChildLogger("agent-runner");

// Dynamic import for agent pipeline (loaded once on first use)
let pipelineModule: any = null;

async function loadPipeline() {
  if (!pipelineModule) {
    try {
      // Use path.join so TypeScript can't statically follow the import
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

  // Fire and forget — but with proper error handling
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
    // Update analysis status
    await analysisRepo.updateStatus(analysisId, "processing", "vision");

    // Load and run the pipeline
    const { runPipeline } = await loadPipeline();

    const result = await runPipeline(
      imageUrls,
      {
        onProgress: async (agent: string, step: string, message: string, toolCall?: string) => {
          // Log every step to DB for frontend polling
          try {
            await agentLogRepo.create({
              analysisId,
              agentName: agent,
              step,
              message,
              toolCall: toolCall || undefined,
            });

            // Update current agent in analysis
            if (step === "start") {
              await analysisRepo.updateStatus(analysisId, "processing", agent);
            }

            log.info({ analysisId, agent, step }, `${message}`);
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

    // Save face features to analysis
    await analysisRepo.updateFeatures(analysisId, {
      faceShape: result.features.face_shape,
      faceConfidence: result.features.face_confidence,
      hairDensity: result.features.hair_thickness,
      hairTexture: result.features.hair_texture,
    });

    // Save recommendations to DB
    for (const rec of result.recommendations) {
      await recRepo.create({
        analysisId,
        styleName: rec.style_name,
        matchScore: rec.match_percentage,
        barberInstruction: rec.barber_instruction,
        maintenance: rec.maintenance_tips,
        stylingTips: rec.styling_tips,
        imageUrls: rec.image_urls || { front: rec.reference_image_url },
        barbershop: result.barbershops
          ? result.barbershops.barbershops.find(
              (b: any) => b.recommended_style === rec.style_name
            ) || null
          : null,
        isLocked: false, // Will be filtered by tier in recommendation.service
      });
    }

    // Mark as completed
    await analysisRepo.updateStatus(analysisId, "completed", "done");

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.info(
      { analysisId, elapsed_s: elapsed, recommendations: result.recommendations.length },
      `✅ Pipeline completed in ${elapsed}s`
    );
  } catch (err: any) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log.error({ err, analysisId, elapsed_s: elapsed }, "❌ Pipeline failed");

    // Update analysis status to failed
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
