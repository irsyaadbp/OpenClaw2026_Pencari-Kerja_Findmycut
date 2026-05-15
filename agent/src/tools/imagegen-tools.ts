import type { Tool } from "../runner";
import { generateImage } from "../lib/replicate";

export const imagegenTools: Tool[] = [
  {
    name: "generate_hairstyle_image",
    description: "Generate a reference image for a hairstyle",
    parameters: {
      type: "object",
      properties: {
        style_name: { type: "string" },
        description: { type: "string" },
        angle: { type: "string", default: "front" },
      },
      required: ["style_name"],
    },
    execute: async ({ style_name, description, angle }) => {
      const prompt = `Professional barber shop photo of a man with ${style_name} haircut, ${description || "clean modern style"}, studio lighting, clean white background, ${angle || "front"} view, photorealistic`;
      const imageUrl = await generateImage(prompt);
      return { style_name, angle: angle || "front", image_url: imageUrl };
    },
  },
];
