import { chatCompletion, type LlmTool } from "../lib/llm";
import {
  barbershopTools,
  handleBarbershopToolAsync,
  loadBarbershopData,
  setBarbershopDbClient,
  setGoogleMapsConfig,
} from "../tools/barbershop-tools";
import barbershopData from "../knowledge/barbershops.json";
import type Anthropic from "@anthropic-ai/sdk";
import type { Recommendation, BarbershopMatchResult } from "../types";

const SYSTEM_PROMPT = `You are a Barbershop Finder agent for FindMyCut.

Your job: find the best nearby barbershops for the user based on their location and recommended hairstyles.

Rules:
1. Use search_nearby_barbershops to find barbershops near the user
2. Match barbershop specialties with recommended styles
3. Rank by: style match > distance > rating
4. Return top 3 barbershops with clear reasoning

Output format (JSON):
{
  "barbershops": [
    {
      "barbershop_id": "b001",
      "name": "...",
      "match_reason": "Specializes in [style], only X.Xkm away, rated 4.8",
      "recommended_style": "Which recommended style this barbershop is best for"
    }
  ]
}`;

// Convert barbershop tools to Anthropic format
const anthropicTools: LlmTool[] = barbershopTools.map((t) => ({
  name: t.function.name,
  description: t.function.description,
  input_schema: {
    type: "object" as const,
    properties: t.function.parameters.properties || {},
    required: t.function.parameters.required || [],
  },
}));

export async function runBarbershopAgent(
  recommendations: Recommendation[],
  userLatitude?: number,
  userLongitude?: number
): Promise<BarbershopMatchResult | null> {
  // Load barbershop dataset (JSON fallback)
  loadBarbershopData(barbershopData as any);

  // Configure Google Maps if env vars available
  const env = (globalThis as any).process?.env || {};
  const mapsKey = env.GOOGLE_MAPS_API_KEY;
  const mapsRadius = parseInt(env.GOOGLE_MAPS_RADIUS || "5000");
  if (mapsKey) {
    setGoogleMapsConfig(mapsKey, mapsRadius);
  }

  // Configure DB client if DATABASE_URL available
  const dbUrl = env.DATABASE_URL;
  if (dbUrl) {
    try {
      const mod = await import("@neondatabase/serverless" as any);
      const sql = mod.neon(dbUrl);
      setBarbershopDbClient(sql);
    } catch {
      // DB not available — will use JSON fallback
    }
  }

  // If no location provided, skip this agent
  if (!userLatitude || !userLongitude) {
    console.log("[Barbershop Agent] No user location provided — skipping");
    return null;
  }

  const styleNames = recommendations.map((r) => r.style_name).join(", ");

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${SYSTEM_PROMPT}\n\n---\n\nUser location: ${userLatitude}, ${userLongitude}\nRecommended hairstyles: ${styleNames}\n\nFind the best nearby barbershops that match these styles. Search within 10km radius.`,
    },
  ];

  try {
    // Multi-turn tool calling loop (max 3 rounds)
    for (let round = 0; round < 3; round++) {
      const response = await chatCompletion(messages, anthropicTools);

      const textBlocks = response.content.filter((b) => b.type === "text");
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");

      if (toolUseBlocks.length === 0) {
        // No more tool calls — final answer
        const finalText = textBlocks.map((b) => (b as any).text).join("\n");
        return parseBarbershopResult(finalText);
      }

      // Push assistant response
      messages.push({ role: "assistant", content: response.content });

      // Execute tools and push results
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        const toolUse = block as Anthropic.ToolUseBlock;
        const result = await handleBarbershopToolAsync(toolUse.name, toolUse.input as any);
        const resultStr = JSON.stringify(result);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: resultStr.length > 3000 ? resultStr.slice(0, 3000) + "..." : resultStr,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    return { barbershops: [] };
  } catch (err) {
    console.error("[Barbershop Agent] Error:", err);
    return null;
  }
}

function parseBarbershopResult(raw: string): BarbershopMatchResult {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*"barbershops"[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {}
  return { barbershops: [] };
}
