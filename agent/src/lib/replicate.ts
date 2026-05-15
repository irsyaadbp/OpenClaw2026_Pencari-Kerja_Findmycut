import Replicate from "replicate";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function analyzeVision(imageUrl: string, angle: string): Promise<any> {
  const output = await replicate.run(
    process.env.REPLICATE_VISION_MODEL as any,
    {
      input: {
        image: imageUrl,
        prompt: `Analyze this ${angle} photo of a person. Return JSON with:
{
  "face_shape": "oval|round|square|heart|oblong|diamond",
  "face_confidence": 0.0-1.0,
  "hair_thickness": "thin|medium|thick",
  "hair_texture": "straight|wavy|curly|coily",
  "hairline": "high|medium|low|receding",
  "forehead_size": "small|medium|large",
  "jawline": "soft|angular|strong",
  "current_hairstyle": "description",
  "notes": "observations"
}
Return ONLY valid JSON.`,
      },
    }
  );

  const text = Array.isArray(output) ? output.join("") : String(output);
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : {};
  } catch {
    return {};
  }
}

export async function generateImage(prompt: string): Promise<string> {
  const output = await replicate.run(
    process.env.REPLICATE_IMAGEGEN_MODEL as any,
    { input: { prompt, num_outputs: 1, output_format: "webp", output_quality: 80 } }
  );

  return Array.isArray(output) ? String(output[0]) : String(output);
}
