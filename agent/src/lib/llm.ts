import Anthropic from "@anthropic-ai/sdk";

// Use Z.AI Anthropic-compatible endpoint for all LLM calls (tool calling + reasoning)
const client = new Anthropic({
  baseURL: process.env.VISION_BASE_URL || "https://api.z.ai/api/anthropic",
  apiKey: process.env.VISION_API_KEY || process.env.MAIN_LLM_API_KEY || "dummy",
});

const MODEL = process.env.MAIN_LLM_MODEL || "GLM-5-Turbo";

export interface LlmTool {
  name: string;
  description: string;
  input_schema: { type: "object"; properties?: Record<string, any>; required?: string[] };
}

/**
 * Chat completion with tool calling via Anthropic SDK.
 * Returns the full message response.
 */
export async function chatCompletion(
  messages: Anthropic.MessageParam[],
  tools?: LlmTool[],
  model?: string
): Promise<Anthropic.Message> {
  try {
    const response = await client.messages.create({
      model: model || MODEL,
      max_tokens: 2048,
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      ...(tools && tools.length > 0 ? {} : {}),
    });

    return response;
  } catch (err: any) {
    const status = err?.status || "";
    const detail = err?.error?.message || err?.message || "Unknown LLM error";
    console.error(`[LLM] ${status} Error: ${detail}`);
    throw new Error(`${status} ${detail}`.trim());
  }
}

/**
 * Simple text completion (no tools) — returns just the text content.
 */
export async function textCompletion(
  systemPrompt: string,
  userMessage: string,
  model?: string
): Promise<string> {
  const response = await client.messages.create({
    model: model || MODEL,
    max_tokens: 2048,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text || "";
}

export function parseJsonFromText(text: string): any {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  // Try array
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) { try { return JSON.parse(arrMatch[0]); } catch {} }
  return { raw_response: text };
}
