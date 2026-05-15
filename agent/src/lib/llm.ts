import OpenAI from "openai";

const client = new OpenAI({
  baseURL: process.env.MAIN_LLM_BASE_URL || "https://api.openai.com/v1",
  apiKey: process.env.MAIN_LLM_API_KEY || "dummy",
});

export async function chatCompletion(
  messages: any[],
  tools?: any[],
  model?: string
) {
  try {
    const response = await client.chat.completions.create({
      model: model || process.env.MAIN_LLM_MODEL || "gpt-4o-mini",
      messages,
      tools: tools && tools.length > 0 ? tools : undefined,
      tool_choice: tools && tools.length > 0 ? "auto" : undefined,
      temperature: 0.1,
      max_tokens: 2048,
    });

    return response.choices[0].message;
  } catch (err: any) {
    // Log detailed error for debugging
    const status = err?.status || err?.response?.status;
    const detail = err?.error?.message || err?.message || "Unknown LLM error";
    console.error(`[LLM] ${status} Error: ${detail}`);
    throw new Error(`${status || ""} ${detail}`.trim());
  }
}

export function parseJsonFromText(text: string): any {
  try { return JSON.parse(text); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return { raw_response: text };
}
