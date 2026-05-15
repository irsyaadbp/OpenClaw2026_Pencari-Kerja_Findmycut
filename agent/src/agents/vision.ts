import { runAgent } from "../runner";
import { visionTools } from "../tools/vision-tools";
import type { AgentStep, FaceFeatures } from "../types";

const SYSTEM_PROMPT = `You are a professional hair and face analysis AI agent.
Analyze photos and extract structured features about face shape, hair properties, and head proportions.

You have tools:
1. analyze_image - analyze a single photo
2. merge_analyses - merge multiple angle analyses into one profile

For each photo provided, call analyze_image. Then call merge_analyses to combine results.
Return the final merged FaceFeatures as your answer.`;

export async function runVisionAgent(
  photoUrls: string[],
  onStep?: (step: AgentStep) => void
): Promise<FaceFeatures> {
  const angles = ["depan", "kanan", "kiri", "belakang"];
  const photoList = photoUrls.map((url, i) => `Photo ${i + 1} (${angles[i] || "front"}): ${url}`).join("\n");

  const result = await runAgent(
    { name: "Vision Agent", systemPrompt: SYSTEM_PROMPT, tools: visionTools, maxIterations: 10 },
    `Analyze these photos and extract face/hair features:\n\n${photoList}`,
    onStep
  );

  return result.output || {
    face_shape: "oval", face_confidence: 0.5,
    hair_thickness: "medium", hair_texture: "straight",
    hairline: "medium", forehead_size: "medium", jawline: "soft",
    current_hairstyle: "unknown", photos_analyzed: photoUrls.length, notes: "Fallback analysis",
  };
}
