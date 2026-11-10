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

export function clientIpFromHeaders(headers: Pick<Headers, "get">): string {
  // Trust only headers that the ingress proxy overwrites. The first XFF value
  // is client-controlled on many stacks; use the rightmost forwarded address.
  const trusted = headers.get("cf-connecting-ip") ?? headers.get("x-real-ip");
  if (trusted?.trim()) return trusted.trim();
  const forwarded = headers.get("x-forwarded-for");
  if (!forwarded) return "local";
  const addresses = forwarded.split(",");
  return addresses[addresses.length - 1]?.trim() || "local";
}

export function clientIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
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
