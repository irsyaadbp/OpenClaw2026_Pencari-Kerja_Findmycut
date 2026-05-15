import * as paymentRepo from "../repositories/payment.repo";
import * as userRepo from "../repositories/user.repo";
import * as recRepo from "../repositories/recommendation.repo";
import { createCheckout, verifyWebhookSignature } from "../lib/doku";
import { v4 as uuid } from "uuid";

export async function createPayment(userId: string, analysisId?: string) {
  const invoiceNumber = `INV-${Date.now()}-${uuid().slice(0, 8)}`;

  const payment = await paymentRepo.create({
    userId,
    invoiceNumber,
    amount: 15000,
    tier: "pro",
  });

  const checkout = await createCheckout({ invoiceNumber, amount: 15000 });

  await paymentRepo.updateDokuInfo(invoiceNumber, {
    dokuSessionId: checkout.sessionId,
    dokuTokenId: checkout.tokenId,
  });

  return {
    checkout_url: checkout.checkoutUrl,
    transaction_id: invoiceNumber,
  };
}

export async function handleWebhook(body: string, signature: string) {
  if (!verifyWebhookSignature(body, signature)) {
    throw new Error("Invalid webhook signature");
  }

  const payload = JSON.parse(body);
  const invoiceNumber = payload.order?.invoice_number;
  const status = payload.transaction?.status;

  if (status === "SUCCESS" && invoiceNumber) {
    const payment = await paymentRepo.findByInvoiceNumber(invoiceNumber);
    if (payment) {
      await paymentRepo.updateStatus(invoiceNumber, "paid", payload.payment?.payment_method);
      await userRepo.updateTier(payment.userId || "", "pro");
      // Unlock recommendations if analysisId available
    }
  }

  return { status: "success" };
}
