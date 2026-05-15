import { neon } from "@neondatabase/serverless";

// Better Auth manages the "user" table.
// We query it directly via raw SQL for tier management.

const sql = neon(process.env.DATABASE_URL!);

export async function findById(id: string) {
  const result = await sql`SELECT * FROM "user" WHERE id = ${id}`;
  return result[0] ?? null;
}

export async function updateTier(id: string, tier: string) {
  await sql`UPDATE "user" SET tier = ${tier} WHERE id = ${id}`;
}

export async function getTier(id: string): Promise<string> {
  const result = await sql`SELECT tier FROM "user" WHERE id = ${id}`;
  return (result[0] as any)?.tier || "free";
}
