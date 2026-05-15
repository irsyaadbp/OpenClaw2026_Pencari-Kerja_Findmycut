import { Hono } from "hono";
import * as paymentService from "../services/payment.service";

const payments = new Hono();

payments.post("/checkout", async (c) => {
  try {
    const { user_id, analysis_id } = await c.req.json();
    if (!user_id) return c.json({ error: "user_id required" }, 400);

    const result = await paymentService.createPayment(user_id, analysis_id);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

payments.post("/webhook", async (c) => {
  try {
    const body = await c.req.text();
    const signature = c.req.header("Signature") || "";
    const result = await paymentService.handleWebhook(body, signature);
    return c.json(result);
  } catch (err: any) {
    return c.json({ error: err.message }, 400);
  }
});

export default payments;
