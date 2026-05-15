import type { Tool } from "../runner";
import faceShapes from "../knowledge/face-shapes.json";
import hairTypes from "../knowledge/hair-types.json";
import styles from "../knowledge/styles.json";

// DB connection (optional — fallback to JSON if not available)
let dbClient: any = null;

export function setDbClient(client: any) {
  dbClient = client;
}

/**
 * Query hairstyle_embeddings table in DB.
 * Returns null if DB not available or no results.
 */
async function queryStylesFromDb(styleName?: string): Promise<any[] | null> {
  if (!dbClient) return null;

  try {
    if (styleName) {
      const result = await dbClient`
        SELECT * FROM hairstyle_embeddings 
        WHERE LOWER(style_name) = LOWER(${styleName})
        LIMIT 1
      `;
      return result.length > 0 ? result : null;
    } else {
      const result = await dbClient`
        SELECT * FROM hairstyle_embeddings ORDER BY style_name
      `;
      return result.length > 0 ? result : null;
    }
  } catch {
    return null;
  }
}

/**
 * Query styles from DB by face shape compatibility.
 */
async function queryStylesByFaceShape(faceShape: string): Promise<any[] | null> {
  if (!dbClient) return null;

  try {
    const result = await dbClient`
      SELECT * FROM hairstyle_embeddings 
      WHERE suitable_face_shapes @> ${JSON.stringify([faceShape])}::jsonb
    `;
    return result.length > 0 ? result : null;
  } catch {
    return null;
  }
}

export const knowledgeTools: Tool[] = [
  {
    name: "query_face_shape_guide",
    description: "Get hairstyle recommendations for a specific face shape. Checks DB first, falls back to local knowledge base.",
    parameters: {
      type: "object",
      properties: { face_shape: { type: "string" } },
      required: ["face_shape"],
    },
    execute: async ({ face_shape }) => {
      // Try DB first — get styles that match this face shape
      const dbStyles = await queryStylesByFaceShape(face_shape);
      if (dbStyles && dbStyles.length > 0) {
        // Limit to top 8 styles to avoid overwhelming the LLM context
        const limited = dbStyles.slice(0, 8);
        const recommended = limited.map((s: any) => s.style_name);
        const localGuide = (faceShapes as any)[face_shape];
        return {
          recommended,
          avoid: localGuide?.avoid || [],
          notes: localGuide?.notes || `Top ${recommended.length} styles from database for ${face_shape} face shape`,
          source: "hybrid_db",
          total_available: dbStyles.length,
        };
      }

      // Fallback to JSON
      const guide = (faceShapes as any)[face_shape];
      return guide
        ? { ...guide, source: "json" }
        : { recommended: [], notes: "Unknown face shape", source: "json" };
    },
  },
  {
    name: "query_hair_compatibility",
    description: "Check if a hairstyle is compatible with specific hair type and thickness. Checks DB first, falls back to local knowledge base.",
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
      // Try DB first
      const dbStyles = await queryStylesFromDb(style_name);
      if (dbStyles && dbStyles.length > 0) {
        const style = dbStyles[0];
        const hairTypesMatch = (style.suitable_hair_types || []).includes(hair_texture);
        const thicknessMatch = (style.suitable_thickness || []).includes(hair_thickness);
        const isCompatible = hairTypesMatch && thicknessMatch;
        return {
          compatible: isCompatible,
          reason: isCompatible
            ? `${style_name} works well with ${hair_texture} ${hair_thickness} hair`
            : `${style_name} may not be ideal for ${hair_texture} ${hair_thickness} hair`,
          source: "db",
        };
      }

      // Fallback to JSON
      const typeData = (hairTypes as any)[hair_texture];
      if (!typeData) return { compatible: false, reason: "Unknown hair texture", source: "json" };
      const compatible = typeData.compatible?.[hair_thickness] || [];
      const isCompatible = compatible.includes(style_name);
      return {
        compatible: isCompatible,
        reason: isCompatible ? "Compatible" : "Not ideal for this hair type",
        source: "json",
      };
    },
  },
  {
    name: "get_style_details",
    description: "Get full details about a specific hairstyle including barber instructions and styling tips. Checks DB first, falls back to local knowledge base.",
    parameters: {
      type: "object",
      properties: { style_name: { type: "string" } },
      required: ["style_name"],
    },
    execute: async ({ style_name }) => {
      // Try DB first
      const dbStyles = await queryStylesFromDb(style_name);
      if (dbStyles && dbStyles.length > 0) {
        const s = dbStyles[0];
        return {
          name: s.style_name,
          description: s.description,
          suitable_face_shapes: s.suitable_face_shapes,
          suitable_hair_types: s.suitable_hair_types,
          suitable_thickness: s.suitable_thickness,
          maintenance_level: s.maintenance_level,
          reference_image_url: s.reference_image_url,
          styling_tips: s.styling_tips,
          barber_instruction: s.barber_instruction,
          source: "db",
        };
      }

      // Fallback to JSON
      const style = (styles as any[]).find(
        (s) => s.name.toLowerCase() === style_name.toLowerCase()
      );
      return style
        ? { ...style, source: "json" }
        : { name: style_name, description: "Style not found in database", source: "not_found" };
    },
  },
  {
    name: "list_all_styles",
    description: "List all available hairstyles from the knowledge base (DB + JSON combined).",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
    execute: async () => {
      // Merge DB + JSON styles (DB takes priority for duplicates)
      const allStyles: Map<string, any> = new Map();

      // Load JSON styles first
      for (const s of styles as any[]) {
        allStyles.set(s.name.toLowerCase(), { ...s, source: "json" });
      }

      // Override/add from DB
      const dbStyles = await queryStylesFromDb();
      if (dbStyles) {
        for (const s of dbStyles) {
          allStyles.set(s.style_name.toLowerCase(), {
            name: s.style_name,
            description: s.description,
            suitable_face_shapes: s.suitable_face_shapes,
            suitable_hair_types: s.suitable_hair_types,
            suitable_thickness: s.suitable_thickness,
            maintenance_level: s.maintenance_level,
            source: "db",
          });
        }
      }

      return {
        count: allStyles.size,
        styles: Array.from(allStyles.values()),
      };
    },
  },
];
