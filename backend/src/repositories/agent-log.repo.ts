import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";

export async function create(data: {
  analysisId: string;
  agentName: string;
  step: string;
  message: string;
  toolCall?: string;
  toolInput?: any;
  toolOutput?: any;
  reasoning?: string;
}) {
  await db.insert(schema.agentLogs).values(data);
}

export async function findByAnalysisId(analysisId: string) {
  return db.select().from(schema.agentLogs)
    .where(eq(schema.agentLogs.analysisId, analysisId))
    .orderBy(schema.agentLogs.createdAt);
}
