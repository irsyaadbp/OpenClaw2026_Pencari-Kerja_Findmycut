import { chatCompletion } from "../lib/llm";
import {
  barbershopTools,
  handleBarbershopTool,
  loadBarbershopData,
} from "../tools/barbershop-tools";
import barbershopData from "../knowledge/barbershops.json";
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

export async function runBarbershopAgent(
  recommendations: Recommendation[],
  userLatitude?: number,
  userLongitude?: number
): Promise<BarbershopMatchResult | null> {
  // Load barbershop dataset
  loadBarbershopData(barbershopData as any);

  // If no location provided, skip this agent
  if (!userLatitude || !userLongitude) {
    console.log("[Barbershop Agent] No user location provided — skipping");
    return null;
  }

  const styleNames = recommendations.map((r) => r.style_name).join(", ");

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    {
      role: "user" as const,
      content: `User location: ${userLatitude}, ${userLongitude}
Recommended hairstyles: ${styleNames}

Find the best nearby barbershops that match these styles. Search within 10km radius.`,
    },
  ];

  try {
    // Multi-turn tool calling loop (max 3 rounds)
    let currentMessages = [...messages];
    let finalResponse = "";

    for (let round = 0; round < 3; round++) {
      const response = await chatCompletion(currentMessages, barbershopTools);
      const content = response.content || "";
      const toolCalls = (response as any).tool_calls || [];

      if (toolCalls.length === 0) {
        // No more tool calls — final answer
        finalResponse = content;
        break;
      }

      // Process tool calls and add results
      currentMessages.push(response as any);
      for (const call of toolCalls) {
        const fnName = call.function.name;
        const args = JSON.parse(call.function.arguments);
        const result = handleBarbershopTool(fnName, args);
        currentMessages.push({
          role: "tool" as any,
          tool_call_id: call.id,
          content: JSON.stringify(result),
        } as any);
      }
    }

    return parseBarbershopResult(finalResponse);
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
