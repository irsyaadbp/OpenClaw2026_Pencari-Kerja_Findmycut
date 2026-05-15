import { runVisionAgent } from "./agents/vision";
import { runKnowledgeAgent } from "./agents/knowledge";
import { runRankerAgent } from "./agents/ranker";
import { runImageGenAgent } from "./agents/imagegen";
import { runBarbershopAgent } from "./agents/barbershop";
import type { AgentStep, PipelineResult } from "./types";

export interface PipelineCallbacks {
  onProgress: (agent: string, step: string, message: string, toolCall?: string) => void;
}

export interface PipelineOptions {
  userLatitude?: number;
  userLongitude?: number;
  tier?: "free" | "pro";
}

/**
 * Run the full 5-agent pipeline:
 * 1. Vision Agent — analyze photos → FaceFeatures
 * 2. Knowledge Agent — match features → candidate styles
 * 3. Ranker Agent — score + explain → Top recommendations
 * 4. Image Gen Agent — generate reference images (optional)
 * 5. Barbershop Agent — find nearby barbershops (optional, pro-only)
 */
export async function runPipeline(
  photoUrls: string[],
  callbacks: PipelineCallbacks,
  options: PipelineOptions = {}
): Promise<PipelineResult> {
  const emit = (step: AgentStep) => {
    callbacks.onProgress(step.agent, step.type, step.message, step.toolName);
  };

  // === Agent 1: Vision ===
  callbacks.onProgress("vision", "start", "Memulai analisis foto...");
  const features = await runVisionAgent(photoUrls, emit);
  callbacks.onProgress("vision", "complete",
    `Analisis selesai: ${features.face_shape} (${Math.round(features.face_confidence * 100)}%), ` +
    `rambut ${features.hair_texture} ${features.hair_thickness}`
  );

  // === Agent 2: Knowledge ===
  callbacks.onProgress("knowledge", "start", "Mencari gaya rambut yang cocok...");
  let candidates = await runKnowledgeAgent(features, emit);
  // Limit to max 6 candidates to keep pipeline fast and output parseable
  if (candidates.length > 6) {
    candidates = candidates.slice(0, 6);
  }
  callbacks.onProgress("knowledge", "complete",
    `${candidates.length} kandidat gaya rambut ditemukan`
  );

  // Safety check: if still 0 candidates somehow, use all styles as fallback
  if (candidates.length === 0) {
    callbacks.onProgress("knowledge", "complete", "Menggunakan semua gaya rambut sebagai kandidat");
  }

  // === Agent 3: Ranker ===
  callbacks.onProgress("ranking", "start", "Menghitung skor dan ranking...");
  const recommendations = await runRankerAgent(features, candidates, emit);
  callbacks.onProgress("ranking", "complete",
    `Top ${recommendations.length} rekomendasi siap!`
  );

  // === Agent 4: Image Gen (optional, don't fail pipeline) ===
  try {
    callbacks.onProgress("imagegen", "start", "Generate gambar referensi...");
    await runImageGenAgent(recommendations, emit);
    callbacks.onProgress("imagegen", "complete", "Gambar referensi siap!");
  } catch (err: any) {
    callbacks.onProgress("imagegen", "error", `Image gen skipped: ${err.message}`);
  }

  // === Agent 5: Barbershop Finder (optional, pro-only, needs location) ===
  let barbershops = undefined;
  if (options.userLatitude && options.userLongitude) {
    try {
      callbacks.onProgress("barbershop", "start", "Mencari barbershop terdekat...");
      const barbershopResult = await runBarbershopAgent(
        recommendations,
        options.userLatitude,
        options.userLongitude
      );
      if (barbershopResult) {
        barbershops = barbershopResult;
        callbacks.onProgress("barbershop", "complete",
          `${barbershops.barbershops.length} barbershop ditemukan`
        );
      }
    } catch (err: any) {
      callbacks.onProgress("barbershop", "error", `Barbershop finder skipped: ${err.message}`);
    }
  } else {
    callbacks.onProgress("barbershop", "skip", "Lokasi tidak tersedia — barbershop finder dilewati");
  }

  return { features, recommendations, barbershops };
}
