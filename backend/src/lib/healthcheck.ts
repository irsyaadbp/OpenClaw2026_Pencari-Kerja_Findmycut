import { neon } from "@neondatabase/serverless";
import { createChildLogger } from "./logger";

const log = createChildLogger("healthcheck");

interface HealthStatus {
  service: string;
  status: "ok" | "error" | "skipped";
  latency_ms?: number;
  detail?: string;
}

export async function runStartupHealthChecks(): Promise<HealthStatus[]> {
  const checks: Promise<HealthStatus>[] = [];

  // 1. Neon PostgreSQL
  checks.push(
    checkService("neon-postgres", async () => {
      const sql = neon(process.env.DATABASE_URL!);
      const start = Date.now();
      await sql`SELECT 1`;
      return { latency_ms: Date.now() - start, detail: "Connected" };
    })
  );

  // 2. Better Auth secret
  checks.push(
    checkService("better-auth", async () => {
      const secret = process.env.BETTER_AUTH_SECRET;
      if (!secret || secret.length < 32) {
        if (process.env.NODE_ENV === "production") {
          throw new Error("BETTER_AUTH_SECRET missing or too short (<32 chars)");
        }
        return { status: "skipped" as const, detail: "Secret not set (dev mode)" };
      }
      return { detail: "Secret configured" };
    })
  );

  // 3. Replicate API
  checks.push(
    checkService("replicate", async () => {
      const token = process.env.REPLICATE_API_TOKEN;
      if (!token) throw new Error("REPLICATE_API_TOKEN not set");
      const start = Date.now();
      const res = await fetch("https://api.replicate.com/v1/account", {
        headers: { Authorization: `Token ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { latency_ms: Date.now() - start, detail: "API reachable" };
    })
  );

  // 4. MiMo LLM
  checks.push(
    checkService("mimo-llm", async () => {
      const baseUrl = process.env.MAIN_LLM_BASE_URL;
      const apiKey = process.env.MAIN_LLM_API_KEY;
      if (!baseUrl || !apiKey) throw new Error("MAIN_LLM env vars not set");
      return { detail: `Configured: ${baseUrl}` };
    })
  );

  // 5. Cloudflare R2
  checks.push(
    checkService("cloudflare-r2", async () => {
      const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
      const missing = required.filter((k) => !process.env[k]);
      if (missing.length > 0) throw new Error(`Missing: ${missing.join(", ")}`);
      return { detail: `Bucket: ${process.env.R2_BUCKET_NAME}` };
    })
  );

  // 6. DOKU Payment
  checks.push(
    checkService("doku-payment", async () => {
      const clientId = process.env.DOKU_CLIENT_ID;
      const secretKey = process.env.DOKU_SECRET_KEY;
      if (!clientId || !secretKey) throw new Error("DOKU env vars not set");
      return { detail: "Credentials configured" };
    })
  );

  // 7. Google Maps (optional)
  checks.push(
    checkService("google-maps", async () => {
      const key = process.env.GOOGLE_MAPS_API_KEY;
      if (!key) return { status: "skipped" as const, detail: "Not configured (optional)" };
      return { detail: "API key configured" };
    })
  );

  const results = await Promise.allSettled(checks);
  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { service: "unknown", status: "error" as const, detail: r.reason?.message }
  );
}

async function checkService(
  name: string,
  fn: () => Promise<{ latency_ms?: number; detail?: string; status?: "skipped" }>
): Promise<HealthStatus> {
  try {
    const result = await fn();
    const status: HealthStatus = {
      service: name,
      status: result.status || "ok",
      latency_ms: result.latency_ms,
      detail: result.detail,
    };
    if (status.status === "ok") {
      log.info({ service: name, latency_ms: status.latency_ms }, `✅ ${name}: ${status.detail}`);
    } else {
      log.warn({ service: name }, `⏭️  ${name}: ${status.detail}`);
    }
    return status;
  } catch (err: any) {
    log.error({ service: name, err: err.message }, `❌ ${name}: ${err.message}`);
    return { service: name, status: "error", detail: err.message };
  }
}

export function formatHealthReport(results: HealthStatus[]): string {
  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "error").length;
  return `Health: ${ok} ok, ${skipped} skipped, ${failed} failed (${results.length} total)`;
}
