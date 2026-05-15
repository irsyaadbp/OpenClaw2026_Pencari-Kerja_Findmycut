import type { Tool } from "../runner";
import faceShapes from "../knowledge/face-shapes.json";
import hairTypes from "../knowledge/hair-types.json";
import styles from "../knowledge/styles.json";

export const knowledgeTools: Tool[] = [
  {
    name: "query_face_shape_guide",
    description: "Get hairstyle recommendations for a specific face shape",
    parameters: {
      type: "object",
      properties: { face_shape: { type: "string" } },
      required: ["face_shape"],
    },
    execute: async ({ face_shape }) => {
      const guide = (faceShapes as any)[face_shape];
      return guide || { recommended: [], notes: "Unknown face shape" };
    },
  },
  {
    name: "query_hair_compatibility",
    description: "Check if a hairstyle is compatible with specific hair type and thickness",
    parameters: {
      type: "object",
      properties: {
        style_name: { type: "string" },
        hair_texture: { type: "string" },
        hair_thickness: { type: "string" },
      },
      required: ["style_name", "hair_texture", "hair_thickness"],
    },
    execute: async ({ style_name, hair_texture, hair_thickness }) => {
      const typeData = (hairTypes as any)[hair_texture];
      if (!typeData) return { compatible: false, reason: "Unknown hair texture" };
      const compatible = typeData.compatible?.[hair_thickness] || [];
      const isCompatible = compatible.includes(style_name);
      return { compatible: isCompatible, reason: isCompatible ? "Compatible" : "Not ideal for this hair type" };
    },
  },
  {
    name: "get_style_details",
    description: "Get full details about a specific hairstyle",
    parameters: {
      type: "object",
      properties: { style_name: { type: "string" } },
      required: ["style_name"],
    },
    execute: async ({ style_name }) => {
      const style = (styles as any[]).find((s) => s.name.toLowerCase() === style_name.toLowerCase());
      return style || { name: style_name, description: "Style not found in database" };
    },
  },
];
