import * as recRepo from "../repositories/recommendation.repo";
import * as analysisRepo from "../repositories/analysis.repo";
import { auth } from "../lib/auth";

export async function getRecommendations(analysisId: string, headers: Headers) {
  const analysis = await analysisRepo.findById(analysisId);
  if (!analysis) throw new Error("Analysis not found");

  // Determine tier from Better Auth session
  const session = await auth.api.getSession({ headers });
  let tier = "free";

  // Check if user has paid (via payments table)
  // For now, default to free unless explicitly pro
  const recs = await recRepo.findByAnalysisId(analysisId);

  if (tier === "free") {
    const sorted = [...recs].sort((a, b) => (a.matchScore || 0) - (b.matchScore || 0));
    return {
      tier: "free",
      analysis: {
        id: analysis.id,
        status: analysis.status,
        face_shape: analysis.faceShape,
        face_confidence: analysis.faceConfidence,
        hair_density: analysis.hairDensity,
        hair_texture: analysis.hairTexture,
      },
      data: sorted.map((r, i) => ({
        name: r.styleName,
        match: r.matchScore,
        image: i === 0 && (r.imageUrls as any)?.front
          ? [{ type: "Front", url: (r.imageUrls as any).front }]
          : [],
        barbershop: i === 0 ? r.barbershop : null,
        barber_instruction: i === 0 ? r.barberInstruction : null,
        styling_tips: i === 0 ? r.stylingTips : null,
        is_locked: i > 0,
      })),
    };
  }

  // Pro tier
  const sorted = [...recs].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
  return {
    tier: "pro",
    analysis: {
      id: analysis.id,
      status: analysis.status,
      face_shape: analysis.faceShape,
      face_confidence: analysis.faceConfidence,
      hair_density: analysis.hairDensity,
      hair_texture: analysis.hairTexture,
    },
    data: sorted.map((r) => {
      const urls = r.imageUrls as any || {};
      return {
        name: r.styleName,
        match: r.matchScore,
        image: [
          urls.front ? { type: "Front", url: urls.front } : null,
          urls.left ? { type: "Side", url: urls.left } : null,
          urls.right ? { type: "Side", url: urls.right } : null,
          urls.back ? { type: "Back", url: urls.back } : null,
          urls.top ? { type: "Top", url: urls.top } : null,
        ].filter(Boolean),
        barbershop: r.barbershop,
        barber_instruction: r.barberInstruction,
        maintenance: r.maintenance,
        styling_tips: r.stylingTips,
        is_locked: false,
      };
    }),
  };
}
