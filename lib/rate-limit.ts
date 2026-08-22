/**
 * Minimal fixed-window in-memory rate limiter. Good enough for a hackathon on a
 * single instance; on multi-instance serverless it degrades to per-instance,
 * which still throttles abusive bursts. Applied to AI-calling and auth routes.
 */

type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 };
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: existing.resetAt - now };
  }

  existing.count++;
  return { ok: true, remaining: limit - existing.count, retryAfterMs: 0 };
}

/** Derive a limiter key from a request + logical bucket name. */
export function clientKey(req: Request, bucket: string): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip = fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  return `${bucket}:${ip}`;
}
