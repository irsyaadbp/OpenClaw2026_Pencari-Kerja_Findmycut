import { runAgent } from "../runner";
import { imagegenTools } from "../tools/imagegen-tools";
import type { AgentStep, Recommendation } from "../types";

const SYSTEM_PROMPT = `You are a hairstyle image generation agent.
Generate reference images for recommended hairstyles using the generate_hairstyle_image tool.
For each recommendation, call the tool to generate a front-view image.
After generating all images, return a JSON summary.`;

// Track generated images from tool results
const generatedImages: { style_name: string; image_url: string }[] = [];

export async function runImageGenAgent(
  recommendations: Recommendation[],
  onStep?: (step: AgentStep) => void
): Promise<void> {
  // Clear previous results
  generatedImages.length = 0;

  // Wrap imagegen tools to capture results
  const wrappedTools = imagegenTools.map((tool) => ({
    ...tool,
    execute: async (params: any) => {
      const result = await tool.execute(params);
      // Capture the generated image URL
      if (result?.image_url && result?.style_name) {
        generatedImages.push({ style_name: result.style_name, image_url: result.image_url });
      }
      return result;
    },
  }));

  const styleList = recommendations.slice(0, 1).map((r) => `${r.rank}. ${r.style_name}: ${r.barber_instruction}`).join("\n");

  await runAgent(
    { name: "Image Gen Agent", systemPrompt: SYSTEM_PROMPT, tools: wrappedTools, maxIterations: 4 },
    `Generate a front-view reference image for this top hairstyle only:\n${styleList}`,
    onStep
  );

  // Map generated images back to recommendations (from captured tool results)
  for (const img of generatedImages) {
    const rec = recommendations.find((r) =>
      r.style_name.toLowerCase() === img.style_name.toLowerCase()
    );
    if (rec) {
      if (!rec.image_urls) rec.image_urls = {};
      rec.image_urls.front = img.image_url;
      rec.reference_image_url = img.image_url;
    }
  }
}
