import { Hono } from "hono";
import { auth } from "../lib/auth";

const authRoutes = new Hono();

// Mount Better Auth handler — handles ALL /api/auth/* routes.
// Better Auth uses basePath: "/api/auth" so it expects the full path.
// We pass the raw request directly — Better Auth matches routes internally.
authRoutes.all("/*", (c) => {
  return auth.handler(c.req.raw);
});

export default authRoutes;
