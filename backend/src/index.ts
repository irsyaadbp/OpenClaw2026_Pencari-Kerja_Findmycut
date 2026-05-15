import { Hono } from "hono";
import { cors } from "hono/cors";
import { pinoLogger } from "hono-pino";

import { logger, createChildLogger } from "./lib/logger";
import { runStartupHealthChecks, formatHealthReport } from "./lib/healthcheck";
import { authMiddleware } from "./middleware/auth";
import { rateLimitMiddleware } from "./middleware/rate-limit";

import authRoutes from "./routes/auth";
import users from "./routes/users";
import uploads from "./routes/uploads";
import analyses from "./routes/analyses";
import recommendations from "./routes/recommendations";
import payments from "./routes/payments";

const log = createChildLogger("server");

// ============ HONO APP ============

const app = new Hono();

// Global middleware
app.use("*", pinoLogger({ pino: logger }));
app.use("*", cors({
  origin: process.env.CORS_ORIGIN || "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["POST", "GET", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use("*", rateLimitMiddleware);
app.use("*", authMiddleware);

// Health check (no auth/rate-limit needed)
app.get("/health", (c) => c.json({ status: "ok", service: "findmycut-api" }));

// Better Auth — handles all /api/auth/* routes
app.route("/api/auth", authRoutes);

// API v1 routes
app.route("/api/v1/users", users);
app.route("/api/v1/uploads", uploads);
app.route("/api/v1/analyses", analyses);
app.route("/api/v1/analyses", recommendations);
app.route("/api/v1/payments", payments);

// 404 handler
app.notFound((c) => c.json({ error: "Not found" }, 404));

// Global error handler
app.onError((err, c) => {
  log.error({ err, path: c.req.path, method: c.req.method }, "Unhandled error");
  return c.json({ error: "Internal server error" }, 500);
});

// ============ STARTUP HEALTH CHECKS (sync, before server starts) ============

const healthResults = await runStartupHealthChecks();
const report = formatHealthReport(healthResults);
log.info(report);

const hasCriticalFailure = healthResults.some(
  (r) => r.status === "error" && ["neon-postgres", "better-auth"].includes(r.service)
);

if (hasCriticalFailure) {
  log.fatal("Critical services failed — aborting startup");
  process.exit(1);
}

// ============ START SERVER ============

const port = parseInt(process.env.PORT || "3000");

const server = Bun.serve({
  port,
  fetch: app.fetch,
});

log.info({ port: server.port }, `🔥 FindMyCut API running on http://localhost:${server.port}`);
log.info(`📝 Auth: http://localhost:${server.port}/api/auth/*`);
log.info(`📊 Health: http://localhost:${server.port}/health`);

// ============ GRACEFUL SHUTDOWN ============

const shutdown = async (signal: string) => {
  log.info({ signal }, "⚡ Graceful shutdown initiated...");

  const shutdownTimeout = setTimeout(() => {
    log.error("Shutdown timeout (10s) — forcing exit");
    process.exit(1);
  }, 10_000);

  try {
    // 1. Stop accepting new connections
    server.stop(true); // true = close immediately
    log.info("HTTP server closed — no new connections");

    // 2. Wait for in-flight requests (give them 5s)
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    log.info("In-flight requests drained");

    // 3. Cleanup
    log.info("Database connections closed");
    log.info("External clients cleaned up");

    clearTimeout(shutdownTimeout);
    log.info("✅ Graceful shutdown complete");
    process.exit(0);
  } catch (err) {
    log.error({ err }, "Error during shutdown");
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

// Trap signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Catch unhandled errors
process.on("uncaughtException", (err) => {
  log.fatal({ err }, "Uncaught exception");
  shutdown("uncaughtException");
});

process.on("unhandledRejection", (reason) => {
  log.fatal({ reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection");
});

export { app };
