import type { Tool } from "../runner";

export const rankerTools: Tool[] = [
  {
    name: "calculate_match_score",
    description: "Calculate weighted match score between user features and a hairstyle. Uses multi-factor scoring: face shape (25%), hair type (15%), thickness (10%), base compatibility (50%).",
    parameters: {
      type: "object",
      properties: {
        face_shape: { type: "string", description: "User's face shape" },
        hair_texture: { type: "string", description: "User's hair texture" },
        hair_thickness: { type: "string", description: "User's hair thickness" },
        style_name: { type: "string", description: "Hairstyle name to score" },
        suitable_face_shapes: { type: "array", items: { type: "string" }, description: "Face shapes this style suits" },
        suitable_hair_types: { type: "array", items: { type: "string" }, description: "Hair types this style suits" },
        suitable_thickness: { type: "array", items: { type: "string" }, description: "Hair thickness this style suits" },
        maintenance_level: { type: "string", description: "Style maintenance level (low/medium/high)" },
      },
      required: ["face_shape", "style_name"],
    },
    execute: async (params) => {
      const weights = { face: 0.25, hair: 0.15, thickness: 0.10, base: 0.50 };
      const reasons: string[] = [];
      let weightedScore = 0;

      // Face shape scoring
      const faceMatch = params.suitable_face_shapes?.includes(params.face_shape);
      if (faceMatch) {
        weightedScore += weights.face * 100;
        reasons.push(`Bentuk wajah ${params.face_shape} sangat cocok untuk ${params.style_name}`);
      } else {
        weightedScore += weights.face * 30;
        reasons.push(`Bentuk wajah ${params.face_shape} bukan yang paling ideal, tapi masih bisa diaplikasikan`);
      }

      // Hair type scoring
      const hairMatch = params.suitable_hair_types?.includes(params.hair_texture);
      if (hairMatch) {
        weightedScore += weights.hair * 100;
        reasons.push(`Tipe rambut ${params.hair_texture} mendukung tekstur yang dibutuhkan`);
      } else {
        weightedScore += weights.hair * 40;
        reasons.push(`Rambut ${params.hair_texture} perlu sedikit penyesuaian styling`);
      }

      // Thickness scoring
      const thicknessMatch = params.suitable_thickness?.includes(params.hair_thickness);
      if (thicknessMatch) {
        weightedScore += weights.thickness * 100;
        reasons.push(`Ketebalan rambut ${params.hair_thickness} ideal untuk volume yang dibutuhkan`);
      } else {
        weightedScore += weights.thickness * 50;
      }

      // Base compatibility (always contributes)
      weightedScore += weights.base * 70;

      const finalScore = Math.min(Math.round(weightedScore), 98);

      return {
        overall: finalScore,
        breakdown: {
          face_shape_score: faceMatch ? 100 : 30,
          hair_type_score: hairMatch ? 100 : 40,
          thickness_score: thicknessMatch ? 100 : 50,
          base_score: 70,
        },
        reasons,
        confidence: faceMatch && hairMatch && thicknessMatch ? "high" : faceMatch ? "medium" : "low",
      };
    },
  },
  {
    name: "generate_explanation",
    description: "Generate a personalized, AI-written explanation for why a specific hairstyle suits this user. Uses LLM to create natural, conversational reasoning.",
    parameters: {
      type: "object",
      properties: {
        style_name: { type: "string", description: "Hairstyle name" },
        face_shape: { type: "string", description: "User's face shape" },
        hair_texture: { type: "string", description: "User's hair texture" },
        hair_thickness: { type: "string", description: "User's hair thickness" },
        score: { type: "number", description: "Match score (0-100)" },
        score_reasons: { type: "array", items: { type: "string" }, description: "Scoring reasons from calculate_match_score" },
        barber_instruction: { type: "string", description: "Barber cutting instructions for this style" },
      },
      required: ["style_name", "face_shape"],
    },
    execute: async (params) => {
      try {
        const { textCompletion } = await import("../lib/llm");
        const response = await textCompletion(
          `Kamu adalah konsultan gaya rambut profesional yang ramah dan personal.
Tugasmu: jelaskan MENGAPA gaya rambut tertentu cocok untuk user ini.

Rules:
- Gunakan bahasa Indonesia yang natural dan conversational
- Sebutkan fitur spesifik user (bentuk wajah, tipe rambut) dalam penjelasan
- Berikan 2-3 alasan detail yang personal
- Tambahkan 1 styling tip yang actionable
- Tambahkan 1 maintenance tip
- Jangan generic — harus terasa personal untuk user ini
- Response dalam JSON format`,
          `Jelaskan mengapa "${params.style_name}" cocok untuk user dengan:
- Bentuk wajah: ${params.face_shape}
- Tipe rambut: ${params.hair_texture || "tidak diketahui"}
- Ketebalan: ${params.hair_thickness || "tidak diketahui"}
- Match score: ${params.score || "N/A"}%
- Alasan scoring: ${(params.score_reasons || []).join("; ")}
${params.barber_instruction ? `- Instruksi potong: ${params.barber_instruction}` : ""}

Return JSON:
{
  "main_reason": "1 kalimat utama mengapa cocok",
  "detail_reasons": ["alasan 1", "alasan 2", "alasan 3"],
  "styling_tips": "tip styling spesifik",
  "maintenance_tips": "tip perawatan"
}`
        );

        const { parseJsonFromText } = await import("../lib/llm");
        const parsed = parseJsonFromText(response);
        if (parsed.main_reason) return parsed;

        return buildFallbackExplanation(params);
      } catch {
        return buildFallbackExplanation(params);
      }
    },
  },
  {
    name: "validate_recommendation",
    description: "Self-check: validate that a recommendation makes sense before finalizing. Checks for logical consistency between score, reasons, and style suitability.",
    parameters: {
      type: "object",
      properties: {
        style_name: { type: "string" },
        match_score: { type: "number" },
        face_shape: { type: "string" },
        hair_texture: { type: "string" },
        hair_thickness: { type: "string" },
        suitable_face_shapes: { type: "array", items: { type: "string" } },
        suitable_hair_types: { type: "array", items: { type: "string" } },
        why_match: { type: "array", items: { type: "string" } },
      },
      required: ["style_name", "match_score", "face_shape"],
    },
    execute: async (params) => {
      const issues: string[] = [];
      let isValid = true;

      // Check 1: Score consistency — high score should have matching features
      const faceMatch = params.suitable_face_shapes?.includes(params.face_shape);
      const hairMatch = params.suitable_hair_types?.includes(params.hair_texture);

      if (params.match_score > 85 && !faceMatch) {
        issues.push(`Score ${params.match_score}% is high but face shape ${params.face_shape} is not in suitable list`);
        isValid = false;
      }

      if (params.match_score > 90 && !faceMatch && !hairMatch) {
        issues.push(`Score ${params.match_score}% is very high but neither face nor hair type match`);
        isValid = false;
      }

      // Check 2: Low score should not be ranked too high
      if (params.match_score < 50) {
        issues.push(`Score ${params.match_score}% is too low — consider removing from recommendations`);
        isValid = false;
      }

      // Check 3: Reasons should exist
      if (!params.why_match || params.why_match.length === 0) {
        issues.push("No reasons provided — explanation is missing");
        isValid = false;
      }

      // Check 4: Score should be reasonable range
      if (params.match_score > 100 || params.match_score < 0) {
        issues.push(`Invalid score: ${params.match_score}`);
        isValid = false;
      }

      return {
        valid: isValid,
        issues,
        suggestion: isValid
          ? "Recommendation is consistent and ready to present"
          : `Found ${issues.length} issue(s) — consider adjusting score or removing this recommendation`,
        confidence: isValid ? "verified" : "needs_review",
      };
    },
  },
];

/**
 * Fallback explanation when LLM is unavailable
 */
function buildFallbackExplanation(params: any) {
  return {
    main_reason: `${params.style_name} adalah pilihan yang cocok untuk wajah ${params.face_shape} kamu`,
    detail_reasons: [
      `Bentuk wajah ${params.face_shape} proporsional dengan potongan ${params.style_name}`,
      params.hair_texture
        ? `Rambut ${params.hair_texture} kamu mendukung tekstur yang dibutuhkan style ini`
        : "Style ini versatile untuk berbagai tipe rambut",
      params.hair_thickness
        ? `Ketebalan rambut ${params.hair_thickness} memberikan volume yang pas`
        : "",
    ].filter(Boolean),
    styling_tips: "Gunakan produk styling sesuai rekomendasi barber untuk hasil terbaik",
    maintenance_tips: "Rapikan setiap 3-5 minggu untuk menjaga bentuk optimal",
  };
}
