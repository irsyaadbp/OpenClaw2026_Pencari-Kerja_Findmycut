import { analyzeVision } from "../lib/replicate";
import type { Tool } from "../runner";

export const visionTools: Tool[] = [
  {
    name: "analyze_image",
    description: "Analyze a single photo to detect face shape, hair properties",
    parameters: {
      type: "object",
      properties: {
        image_url: { type: "string", description: "URL of the photo" },
        angle: { type: "string", enum: ["front", "back", "left", "right", "depan", "kanan", "kiri", "belakang"] },
      },
      required: ["image_url", "angle"],
    },
    execute: async ({ image_url, angle }) => {
      return analyzeVision(image_url, angle);
    },
  },
  {
    name: "merge_analyses",
    description: "Merge multiple per-angle analyses into one profile using majority vote",
    parameters: {
      type: "object",
      properties: { analyses: { type: "array" } },
      required: ["analyses"],
    },
    execute: async ({ analyses }) => {
      if (!analyses.length) return {};
      if (analyses.length === 1) return analyses[0];

      const pick = (key: string) => {
        const counts: Record<string, number> = {};
        for (const a of analyses) { const v = a[key]; counts[v] = (counts[v] || 0) + 1; }
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      };

      return {
        face_shape: pick("face_shape"),
        face_confidence: analyses.reduce((s: number, a: any) => s + (a.face_confidence || 0.5), 0) / analyses.length,
        hair_thickness: pick("hair_thickness"),
        hair_texture: pick("hair_texture"),
        hairline: pick("hairline"),
        forehead_size: pick("forehead_size"),
        jawline: pick("jawline"),
        current_hairstyle: analyses.map((a: any) => a.current_hairstyle).filter(Boolean)[0] || "unknown",
        photos_analyzed: analyses.length,
        notes: analyses.map((a: any) => a.notes).filter(Boolean).join("; "),
      };
    },
  },
];
