import type { Tool } from "../runner";

export const rankerTools: Tool[] = [
  {
    name: "calculate_match_score",
    description: "Calculate match score between user features and a hairstyle",
    parameters: {
      type: "object",
      properties: {
        face_shape: { type: "string" },
        hair_texture: { type: "string" },
        hair_thickness: { type: "string" },
        style_name: { type: "string" },
        suitable_face_shapes: { type: "array" },
        suitable_hair_types: { type: "array" },
        suitable_thickness: { type: "array" },
      },
      required: ["face_shape", "style_name"],
    },
    execute: async (params) => {
      let score = 50;
      const reasons: string[] = [];

      if (params.suitable_face_shapes?.includes(params.face_shape)) {
        score += 25;
        reasons.push(`Bentuk wajah ${params.face_shape} cocok untuk style ini`);
      }
      if (params.suitable_hair_types?.includes(params.hair_texture)) {
        score += 15;
        reasons.push(`Tipe rambut ${params.hair_texture} compatible`);
      }
      if (params.suitable_thickness?.includes(params.hair_thickness)) {
        score += 10;
        reasons.push(`Ketebalan rambut ${params.hair_thickness} ideal`);
      }

      return { overall: Math.min(score, 98), reasons };
    },
  },
  {
    name: "generate_explanation",
    description: "Generate personalized explanation for why a style suits the user",
    parameters: {
      type: "object",
      properties: {
        style_name: { type: "string" },
        face_shape: { type: "string" },
        hair_texture: { type: "string" },
        hair_thickness: { type: "string" },
        score: { type: "number" },
      },
      required: ["style_name", "face_shape"],
    },
    execute: async (params) => {
      return {
        main_reason: `${params.style_name} adalah pilihan tepat untuk wajah ${params.face_shape} kamu`,
        detail_reasons: [
          `Bentuk wajah ${params.face_shape} proporsional dengan potongan ini`,
          params.hair_texture ? `Rambut ${params.hair_texture} kamu bisa bikin tekstur terlihat natural` : "",
        ].filter(Boolean),
        styling_tips: "Ikuti instruksi barber untuk hasil terbaik",
      };
    },
  },
];
