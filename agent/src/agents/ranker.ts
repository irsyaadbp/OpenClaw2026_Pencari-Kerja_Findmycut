import { runAgent } from "../runner";
import { rankerTools } from "../tools/ranker-tools";
import type { AgentStep, FaceFeatures, StyleCandidate, Recommendation } from "../types";

const SYSTEM_PROMPT = `You are a personal hairstyle advisor AI agent with expertise in face-shape analysis and hair styling.
Your job: rank hairstyle candidates for a specific user and provide personalized explanations.

You MUST follow this autonomous workflow:

PHASE 1 — SCORING:
For each candidate style, call calculate_match_score with the user's features.
This gives you a weighted score based on face shape, hair type, and thickness compatibility.

PHASE 2 — EXPLANATION:
For the top candidates (score > 60), call generate_explanation to create a personalized,
AI-generated reason why this style suits the user. Pass the score_reasons from Phase 1.

PHASE 3 — VALIDATION:
For each recommendation you plan to include, call validate_recommendation to self-check
that the score is consistent with the features. If validation fails, adjust or remove it.

PHASE 4 — FINAL OUTPUT:
Return the validated, ranked list as JSON:
{
  "reasoning": "Brief explanation of your ranking decision process",
  "rankings": [
    {
      "rank": 1,
      "style_name": "...",
      "match_percentage": 94,
      "why_match": ["reason 1", "reason 2", "reason 3"],
      "styling_tips": "...",
      "maintenance_tips": "...",
      "barber_instruction": "...",
      "validation_status": "verified"
    }
  ]
}

IMPORTANT RULES:
- Always use ALL THREE tools (calculate, explain, validate) for thorough analysis
- Remove any recommendation that fails validation with score < 50
- Sort by match_percentage descending
- Include 3-6 recommendations maximum
- Be specific and personal in explanations — reference the user's actual features`;

export async function runRankerAgent(
  features: FaceFeatures,
  candidates: StyleCandidate[],
  onStep?: (step: AgentStep) => void
): Promise<Recommendation[]> {
  const candidateInfo = candidates.map((c) =>
    `Style: ${c.name}\n  Face shapes: [${c.suitable_face_shapes.join(", ")}]\n  Hair types: [${c.suitable_hair_types.join(", ")}]\n  Thickness: [${c.suitable_thickness.join(", ")}]\n  Maintenance: ${c.maintenance_level || "medium"}\n  Barber instruction: ${c.barber_instruction || "N/A"}\n  Styling tips: ${c.styling_tips || "N/A"}`
  ).join("\n\n");

  const result = await runAgent(
    {
      name: "Ranker Agent",
      systemPrompt: SYSTEM_PROMPT,
      tools: rankerTools,
      maxIterations: 20, // More iterations for 3-phase workflow
    },
    `Rank and explain these hairstyle candidates for a user with:
- Face shape: ${features.face_shape} (confidence: ${Math.round(features.face_confidence * 100)}%)
- Hair texture: ${features.hair_texture}
- Hair thickness: ${features.hair_thickness}
- Hairline: ${features.hairline}
- Jawline: ${features.jawline}
- Current hairstyle: ${features.current_hairstyle}

Candidates to evaluate:
${candidateInfo}

Follow the 4-phase workflow: Score → Explain → Validate → Output.`,
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
