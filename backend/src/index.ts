import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";

import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";

import authRoutes from "./routes/auth";
import users from "./routes/users";
import uploads from "./routes/uploads";
import analyses from "./routes/analyses";
import recommendations from "./routes/recommendations";
import payments from "./routes/payments";

const app = new Hono();

// Global middleware
app.use("*", logger());
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use("*", rateLimitMiddleware);
app.use("*", authMiddleware);

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "findmycut-api" }));

// Better Auth — handles all /api/auth/* routes
app.route("/api/auth", authRoutes);

// API v1 routes
app.route("/api/v1/users", users);
app.route("/api/v1/uploads", uploads);
app.route("/api/v1/analyses", analyses);
app.route("/api/v1/analyses", recommendations);
app.route("/api/v1/payments", payments);

// Start server
const port = parseInt(process.env.PORT || "3000");
serve({ fetch: app.fetch, port }, () => {
  console.log(`🔥 FindMyCut API running on http://localhost:${port}`);
  console.log(`📝 Auth endpoints: http://localhost:${port}/api/auth/*`);
});

export default app;
