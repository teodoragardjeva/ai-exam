// In-memory sliding-window rate limit for the public endpoints (one app container).
// Keyed by client IP (Cloudflare's cf-connecting-ip, see clientIp in turnstile.ts).

type Bucket = number[];
const buckets = new Map<string, Bucket>();
let lastSweep = 0;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): RateLimitResult {
  sweep(now, windowMs);
  const recent = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(key, recent);
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true };
}

export function tooManyRequests(result: { retryAfterSeconds: number }): Response {
  return Response.json(
    { error: "rate_limited", retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { "retry-after": String(result.retryAfterSeconds) } },
  );
}

// Drops empty buckets now and then so the map can't grow without bound.
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, times] of buckets) {
    if (!times.some((t) => now - t < windowMs)) buckets.delete(key);
  }
}

export function resetRateLimits() {
  buckets.clear();
  lastSweep = 0;
}
