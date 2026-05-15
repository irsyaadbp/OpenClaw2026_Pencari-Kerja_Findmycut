const store = new Map<string, { count: number; resetAt: number }>();

const MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "10");
const WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000");

export function checkRateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + WINDOW });
    return { allowed: true, remaining: MAX - 1 };
  }

  if (entry.count >= MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX - entry.count };
}
