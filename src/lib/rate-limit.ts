/**
 * Small in-memory sliding-window rate limiter.
 * It protects sensitive endpoints (login, bookings, contact, availability)
 * from brute-force / spam. The map is capped so it can never grow unbounded.
 */
type Bucket = { hits: number[]; blockedUntil?: number };

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000;

function cleanup(now: number) {
  if (buckets.size <= MAX_KEYS) return;
  for (const [key, bucket] of buckets) {
    const last = bucket.hits[bucket.hits.length - 1] ?? 0;
    if (now - last > 10 * 60 * 1000) buckets.delete(key);
  }
  while (buckets.size > MAX_KEYS) {
    const first = buckets.keys().next();
    if (first.done) break;
    buckets.delete(first.value);
  }
}

export type RateLimitResult = { ok: boolean; remaining: number; retryAfter: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  cleanup(now);
  const bucket = buckets.get(key) ?? { hits: [] };
  if (bucket.blockedUntil && bucket.blockedUntil > now) {
    return { ok: false, remaining: 0, retryAfter: Math.ceil((bucket.blockedUntil - now) / 1000) };
  }
  bucket.hits = bucket.hits.filter((time) => now - time < windowMs);
  if (bucket.hits.length >= limit) {
    bucket.blockedUntil = now + windowMs;
    buckets.set(key, bucket);
    return { ok: false, remaining: 0, retryAfter: Math.ceil(windowMs / 1000) };
  }
  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { ok: true, remaining: Math.max(0, limit - bucket.hits.length), retryAfter: 0 };
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function clientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? "local";
}

export function tooManyRequests(retryAfter: number, message = "درخواست‌های بیش از حد؛ کمی بعد دوباره تلاش کنید.") {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(Math.max(1, retryAfter)),
    },
  });
}
