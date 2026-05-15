import { runVisionAgent } from "./agents/vision";
import { runKnowledgeAgent } from "./agents/knowledge";
import { runRankerAgent } from "./agents/ranker";
import { runImageGenAgent } from "./agents/imagegen";
import type { AgentStep, PipelineResult } from "./types";

export interface PipelineCallbacks {
  onProgress: (agent: string, step: string, message: string, toolCall?: string) => void;
}

/**
 * Run the full 4-agent pipeline:
 * 1. Vision Agent — analyze photos → FaceFeatures
 * 2. Knowledge Agent — match features → candidate styles
 * 3. Ranker Agent — score + explain → Top recommendations
 * 4. Image Gen Agent — generate reference images
 */
export async function runPipeline(
  photoUrls: string[],
  callbacks: PipelineCallbacks
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
  const candidates = await runKnowledgeAgent(features, emit);
  callbacks.onProgress("knowledge", "complete",
    `${candidates.length} kandidat gaya rambut ditemukan`
  );

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

  return { features, recommendations };
}
