import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";

export async function create(data: {
  userId: string;
  imageUrl: string;
}) {
  const [analysis] = await db.insert(schema.analyses).values(data).returning();
  return analysis;
}

export async function findById(id: string) {
  const [analysis] = await db.select().from(schema.analyses).where(eq(schema.analyses.id, id));
  return analysis;
}

export async function updateStatus(id: string, status: string, currentAgent?: string) {
  const update: any = { status };
  if (currentAgent) update.currentAgent = currentAgent;
  await db.update(schema.analyses).set(update).where(eq(schema.analyses.id, id));
}

export async function updateFeatures(id: string, features: {
  faceShape?: string;
  faceConfidence?: number;
  hairDensity?: string;
  hairTexture?: string;
}) {
  await db.update(schema.analyses).set(features).where(eq(schema.analyses.id, id));
}
