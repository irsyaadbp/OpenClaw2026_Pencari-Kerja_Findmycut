import { Hono } from "hono";
import { auth } from "../lib/auth";

const authRoutes = new Hono();

// Mount Better Auth handler — handles ALL auth routes:
// POST /sign-up/email     — username + password register
// POST /sign-in/email     — username + password login
// POST /sign-in/username  — username login
// POST /sign-in/anonymous — anonymous session
// GET  /sign-in/social/google — Google OAuth redirect
// GET  /callback/google   — Google OAuth callback
// POST /sign-out          — logout
// GET  /get-session       — current session info
authRoutes.all("/*", (c) => {
  return auth.handler(c.req.raw);
});

export default authRoutes;
