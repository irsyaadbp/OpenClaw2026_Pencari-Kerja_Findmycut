import { Context, Next } from "hono";
import { checkRateLimit } from "../lib/rate-limit";

export async function rateLimitMiddleware(c: Context, next: Next) {
  const key = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
  const { allowed, remaining } = checkRateLimit(key);

  c.header("X-RateLimit-Remaining", String(remaining));

  if (!allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }

  await next();
}
