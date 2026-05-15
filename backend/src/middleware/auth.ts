import { Context, Next } from "hono";
import { auth } from "../lib/auth";

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (session) {
    c.set("userId", session.user.id);
    c.set("user", session.user);
    c.set("session", session.session);
  } else {
    c.set("userId", null);
    c.set("user", null);
    c.set("session", null);
  }

  await next();
}

export function requireAuth(c: Context): string {
  const userId = c.get("userId");
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

export function getUser(c: Context) {
  return c.get("user");
}

export function getSession(c: Context) {
  return c.get("session");
}
