import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// Vision client — uses Anthropic-compatible API (Z.AI proxy)
const visionClient = new Anthropic({
  baseURL: process.env.VISION_BASE_URL || "https://api.z.ai/api/anthropic",
  apiKey: process.env.VISION_API_KEY || "dummy",
});

export async function analyzeVision(imageUrl: string, angle: string): Promise<any> {
  const model = process.env.VISION_MODEL || "glm-5v-turbo";

  try {
    const response = await visionClient.messages.create({
      model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "url", url: imageUrl },
            },
            {
              type: "text",
              text: `Analyze this ${angle} photo of a person's head/face. Return ONLY valid JSON with these fields:
{
  "face_shape": "oval|round|square|heart|oblong|diamond",
  "face_confidence": 0.0-1.0,
  "hair_thickness": "thin|medium|thick",
  "hair_texture": "straight|wavy|curly|coily",
  "hairline": "high|medium|low|receding",
  "forehead_size": "small|medium|large",
  "jawline": "soft|angular|strong",
  "current_hairstyle": "brief description of current hairstyle",
  "notes": "any additional observations"
}
Return ONLY the JSON object, no other text.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch (err: any) {
    console.error(`[Vision] ${model} error: ${err.message}`);
    return {};
  }
}

export async function generateImage(prompt: string): Promise<string> {
  const output = await replicate.run(
    process.env.REPLICATE_IMAGEGEN_MODEL as any,
    { input: { prompt, num_outputs: 1, output_format: "webp", output_quality: 80 } }
  );

  // Replicate SDK v1.x returns FileOutput object or array of FileOutput
  if (Array.isArray(output)) {
    const first = output[0];
    return first?.url?.()?.href || first?.toString?.() || String(first);
  }
  return (output as any)?.url?.()?.href || (output as any)?.toString?.() || String(output);
}
