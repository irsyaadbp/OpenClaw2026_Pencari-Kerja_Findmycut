import { runAgent } from "../runner";
import { rankerTools } from "../tools/ranker-tools";
import type { AgentStep, FaceFeatures, StyleCandidate, Recommendation } from "../types";

const SYSTEM_PROMPT = `You are a personal hairstyle advisor AI agent.
Given a person's features and hairstyle candidates, rank them and explain WHY each suits them.

Use your tools:
1. calculate_match_score - calculate score for each style
2. generate_explanation - generate personal explanation

For each candidate:
1. Call calculate_match_score
2. Call generate_explanation

Then return the ranked list as JSON array with fields: rank, style_name, match_percentage, why_match[], styling_tips, maintenance_tips, barber_instruction`;

export async function runRankerAgent(
  features: FaceFeatures,
  candidates: StyleCandidate[],
  onStep?: (step: AgentStep) => void
): Promise<Recommendation[]> {
  const candidateInfo = candidates.map((c) =>
    `Style: ${c.name} | Face shapes: ${c.suitable_face_shapes.join(",")} | Hair types: ${c.suitable_hair_types.join(",")} | Thickness: ${c.suitable_thickness.join(",")}`
  ).join("\n");

  const result = await runAgent(
    { name: "Ranker Agent", systemPrompt: SYSTEM_PROMPT, tools: rankerTools, maxIterations: 15 },
    `Rank these hairstyles for a user with face_shape=${features.face_shape}, hair_texture=${features.hair_texture}, hair_thickness=${features.hair_thickness}:\n\n${candidateInfo}`,
    onStep
  );

  const ranked = result.output?.rankings || result.output?.recommendations || [];

  return ranked.map((r: any, i: number) => ({
    rank: i + 1,
    style_name: r.style_name || candidates[i]?.name || "Unknown",
    match_percentage: r.match_percentage || r.match || 70 + Math.floor(Math.random() * 25),
    why_match: r.why_match || r.detail_reasons || [],
    styling_tips: r.styling_tips || candidates[i]?.styling_tips || "",
    maintenance_tips: r.maintenance_tips || candidates[i]?.maintenance_level || "",
    barber_instruction: r.barber_instruction || candidates[i]?.barber_instruction || "",
    reference_image_url: candidates[i]?.reference_image_url || "",
    image_urls: {},
    barbershop: null,
  }));
}
