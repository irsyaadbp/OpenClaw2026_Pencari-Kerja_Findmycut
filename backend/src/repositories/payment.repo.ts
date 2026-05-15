import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";

export async function create(data: {
  userId: string;
  invoiceNumber: string;
  amount: number;
  tier: string;
}) {
  const [payment] = await db.insert(schema.payments).values(data).returning();
  return payment;
}

export async function updateStatus(invoiceNumber: string, status: string, paymentMethod?: string) {
  const updateData: any = { status };
  if (paymentMethod) updateData.paymentMethod = paymentMethod;
  if (status === "paid") updateData.paidAt = new Date();
  await db.update(schema.payments).set(updateData).where(eq(schema.payments.invoiceNumber, invoiceNumber));
}

export async function findByInvoiceNumber(invoiceNumber: string) {
  const [payment] = await db.select().from(schema.payments).where(eq(schema.payments.invoiceNumber, invoiceNumber));
  return payment;
}

export async function updateDokuInfo(invoiceNumber: string, info: { dokuSessionId?: string; dokuTokenId?: string }) {
  await db.update(schema.payments).set(info).where(eq(schema.payments.invoiceNumber, invoiceNumber));
}
