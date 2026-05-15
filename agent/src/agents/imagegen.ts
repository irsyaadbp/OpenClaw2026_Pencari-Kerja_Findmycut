import { runAgent } from "../runner";
import { imagegenTools } from "../tools/imagegen-tools";
import type { AgentStep, Recommendation } from "../types";

const SYSTEM_PROMPT = `You are a hairstyle image generation agent.
Generate reference images for recommended hairstyles using the generate_hairstyle_image tool.
For each recommendation, call the tool to generate a front-view image.`;

export async function runImageGenAgent(
  recommendations: Recommendation[],
  onStep?: (step: AgentStep) => void
): Promise<void> {
  const styleList = recommendations.map((r) => `${r.rank}. ${r.style_name}: ${r.barber_instruction}`).join("\n");

  const result = await runAgent(
    { name: "Image Gen Agent", systemPrompt: SYSTEM_PROMPT, tools: imagegenTools, maxIterations: 10 },
    `Generate reference images for these hairstyles:\n${styleList}`,
    onStep
  );

  // Map generated images back to recommendations
  if (result.output?.images) {
    for (const img of result.output.images) {
      const rec = recommendations.find((r) => r.style_name === img.style_name);
      if (rec) {
        rec.image_urls.front = img.image_url;
        rec.reference_image_url = img.image_url;
      }
    }
  }
}
