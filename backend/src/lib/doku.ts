import crypto from "crypto";

const DOKU_CLIENT_ID = process.env.DOKU_CLIENT_ID!;
const DOKU_SECRET_KEY = process.env.DOKU_SECRET_KEY!;
const DOKU_BASE_URL = "https://sandbox.doku.com";

export interface DokuCheckoutRequest {
  invoiceNumber: string;
  amount: number;
  callbackUrl?: string;
}

export async function createCheckout(req: DokuCheckoutRequest) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const body = {
    order: {
      amount: req.amount,
      invoice_number: req.invoiceNumber,
      currency: "IDR",
      callback_url: req.callbackUrl || `${process.env.GOOGLE_CALLBACK_URL?.replace("/auth/google/callback", "")}`,
    },
    payment: {
      payment_due_date: 60,
    },
  };

  const signature = generateSignature(requestId, timestamp, JSON.stringify(body));

  const response = await fetch(`${DOKU_BASE_URL}/checkout/v1/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": DOKU_CLIENT_ID,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      "Signature": signature,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json() as any;
  return {
    checkoutUrl: data?.response?.payment?.url,
    tokenId: data?.response?.payment?.token_id,
    sessionId: data?.response?.order?.session_id,
  };
}

function generateSignature(requestId: string, timestamp: string, body: string): string {
  const digest = crypto.createHash("sha256").update(body).digest("hex");
  const signString = `Client-Id:${DOKU_CLIENT_ID}\nRequest-Id:${requestId}\nRequest-Timestamp:${timestamp}\nSignature:${digest}`;
  return crypto
    .createHmac("sha256", DOKU_SECRET_KEY)
    .update(signString)
    .digest("base64");
}

export function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", DOKU_SECRET_KEY)
    .update(payload)
    .digest("base64");
  return expected === signature;
}
