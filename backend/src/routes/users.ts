import { Hono } from "hono";
import { auth } from "../lib/auth";

const users = new Hono();

// Get current session/user
users.get("/me", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Not authenticated" }, 401);
  return c.json({
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    image: session.user.image,
  });
});

export default users;
