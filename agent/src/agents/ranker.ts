import { runAgent } from "../runner";
import { rankerTools } from "../tools/ranker-tools";
import type { AgentStep, FaceFeatures, StyleCandidate, Recommendation } from "../types";

const SYSTEM_PROMPT = `You are a personal hairstyle advisor. Rank candidates and explain why each suits the user.

WORKFLOW (keep it concise):
1. For each candidate: call calculate_match_score
2. For top 3 by score: call generate_explanation
3. For top 3: call validate_recommendation

FINAL OUTPUT — Return ONLY this JSON (no markdown, no extra text):
{"rankings":[{"rank":1,"style_name":"...","match_percentage":94,"why_match":["reason1","reason2"],"styling_tips":"...","maintenance_tips":"...","barber_instruction":"..."}]}

RULES:
- Return exactly top 3 recommendations only
- Sort by match_percentage descending
- Output ONLY valid JSON, nothing else — no markdown code blocks`;

export async function runRankerAgent(
  features: FaceFeatures,
  candidates: StyleCandidate[],
  onStep?: (step: AgentStep) => void
): Promise<Recommendation[]> {
  // Limit to max 6 candidates for faster processing
  const limitedCandidates = candidates.slice(0, 6);

  const candidateInfo = limitedCandidates.map((c) =>
    `${c.name}: face=[${c.suitable_face_shapes.join(",")}] hair=[${c.suitable_hair_types.join(",")}] thick=[${c.suitable_thickness.join(",")}] barber="${c.barber_instruction || "N/A"}"`
  ).join("\n");

  const result = await runAgent(
    {
      name: "Ranker Agent",
      systemPrompt: SYSTEM_PROMPT,
      tools: rankerTools,
      maxIterations: 12,
    },
    `User: face_shape=${features.face_shape}, hair=${features.hair_texture}, thickness=${features.hair_thickness}\n\nCandidates:\n${candidateInfo}`,
    onStep
  );

  const ranked = result.output?.rankings || result.output?.recommendations || [];

  // If LLM failed to return rankings, build from candidates directly
  if (ranked.length === 0 && limitedCandidates.length > 0) {
    return limitedCandidates.slice(0, 3).map((c, i) => ({
      rank: i + 1,
      style_name: c.name || c.style_name,
      match_percentage: 85 - i * 5,
      why_match: [`Cocok untuk wajah ${features.face_shape}`, `Sesuai dengan rambut ${features.hair_texture}`],
      styling_tips: c.styling_tips || "",
      maintenance_tips: c.maintenance_level || "",
      barber_instruction: c.barber_instruction || "",
      reference_image_url: c.reference_image_url || "",
      image_urls: {},
      barbershop: null,
    }));
  }

  return ranked.map((r: any, i: number) => ({
    rank: i + 1,
    style_name: r.style_name || limitedCandidates[i]?.name || "Unknown",
    match_percentage: r.match_percentage || r.match || 80,
    why_match: r.why_match || r.detail_reasons || [],
    styling_tips: r.styling_tips || limitedCandidates[i]?.styling_tips || "",
    maintenance_tips: r.maintenance_tips || limitedCandidates[i]?.maintenance_level || "",
    barber_instruction: r.barber_instruction || limitedCandidates[i]?.barber_instruction || "",
    reference_image_url: limitedCandidates[i]?.reference_image_url || "",
    image_urls: {},
    barbershop: null,
  }));
}
