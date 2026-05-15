import { runAgent } from "../runner";
import { knowledgeTools, setDbClient } from "../tools/knowledge-tools";
import type { AgentStep, FaceFeatures, StyleCandidate } from "../types";
import faceShapes from "../knowledge/face-shapes.json";
import styles from "../knowledge/styles.json";

const SYSTEM_PROMPT = `You are a hairstyle knowledge specialist AI agent.
Given a person's face and hair features, find hairstyles that would suit them best.

Use your tools:
1. query_face_shape_guide - get recommended styles for a face shape
2. query_hair_compatibility - check if a style works with hair type
3. get_style_details - get full details about a style
4. list_all_styles - list all available styles from knowledge base

Steps:
1. Call query_face_shape_guide with the user's face shape
2. For each recommended style, call query_hair_compatibility
3. For compatible styles, call get_style_details
4. Return the list of compatible styles with details`;

/**
 * Fallback: directly match styles from local JSON when LLM fails.
 * Guarantees we always return candidates (never 0).
 */
function getFallbackCandidates(features: FaceFeatures): StyleCandidate[] {
  const faceGuide = (faceShapes as any)[features.face_shape];
  const recommended: string[] = faceGuide?.recommended || ["Textured Crop", "Side Part", "French Crop"];

  // Limit to 6 max
  return (styles as any[])
    .filter((s) => recommended.includes(s.name))
    .slice(0, 6)
    .map((s) => ({
      name: s.name,
      style_name: s.name,
      description: s.description,
      suitable_face_shapes: s.suitable_face_shapes,
      suitable_hair_types: s.suitable_hair_types,
      suitable_thickness: s.suitable_thickness,
      maintenance_level: s.maintenance_level,
      reference_image_url: s.reference_image_url || "",
      styling_tips: s.styling_tips,
      barber_instruction: s.barber_instruction,
    }));
}

export async function runKnowledgeAgent(
  features: FaceFeatures,
  onStep?: (step: AgentStep) => void
): Promise<StyleCandidate[]> {
  // Configure DB client if available (agent runs in Bun — env inherited from backend)
  const env = (globalThis as any).process?.env || {};
  if (env.DATABASE_URL) {
    try {
      const mod = await import("@neondatabase/serverless" as any);
      const sql = mod.neon(env.DATABASE_URL);
      setDbClient(sql);
    } catch {
      // DB not available — will use JSON fallback
    }
  }

  const result = await runAgent(
    { name: "Knowledge Agent", systemPrompt: SYSTEM_PROMPT, tools: knowledgeTools, maxIterations: 15 },
    `Find matching hairstyles for:\n- Face shape: ${features.face_shape}\n- Hair texture: ${features.hair_texture}\n- Hair thickness: ${features.hair_thickness}\n- Current style: ${features.current_hairstyle}`,
    onStep
  );

  const candidates = result.output?.candidates || result.output?.styles || [];

  // FALLBACK: if LLM returned 0 candidates, use local JSON matching
  if (candidates.length === 0) {
    const fallback = getFallbackCandidates(features);
    onStep?.({
      agent: "Knowledge Agent",
      type: "thinking",
      message: `💭 Menggunakan knowledge base lokal — ${fallback.length} gaya rambut cocok ditemukan`,
      timestamp: new Date(),
    });
    return fallback;
  }

  return candidates;
}
