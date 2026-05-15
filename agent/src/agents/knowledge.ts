import { runAgent } from "../runner";
import { knowledgeTools, setDbClient } from "../tools/knowledge-tools";
import type { AgentStep, FaceFeatures, StyleCandidate } from "../types";

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

  return result.output?.candidates || result.output?.styles || [];
}
