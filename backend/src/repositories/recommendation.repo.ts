import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";

export async function create(data: {
  analysisId: string;
  styleName: string;
  matchScore: number;
  barberInstruction?: string;
  maintenance?: string;
  stylingTips?: string;
  imageUrls?: any;
  barbershop?: any;
  isLocked?: boolean;
}) {
  const [rec] = await db.insert(schema.recommendations).values(data).returning();
  return rec;
}

export async function findByAnalysisId(analysisId: string) {
  return db.select().from(schema.recommendations)
    .where(eq(schema.recommendations.analysisId, analysisId));
}

export async function unlockByAnalysisId(analysisId: string) {
  await db.update(schema.recommendations)
    .set({ isLocked: false })
    .where(eq(schema.recommendations.analysisId, analysisId));
}
