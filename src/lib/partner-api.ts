import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { partnerLogs, partners, type Partner } from "@/db/schema";
import { rateLimit } from "./rate-limit";

/**
 * Partner (agency / partner website) web service authentication
 *   Authorization: Bearer <token>
 *   X-Timestamp:   unix seconds (±300s)
 *   X-Signature:   hex( HMAC_SHA256(secret, `${timestamp}.${METHOD}.${path}.${rawBody}`) )
 * Token is stored hashed; the signing secret is only used server-side for HMAC verification.
 */

export const tokenHash = (t: string) => createHash("sha256").update(t).digest("hex");

export function newCredentials() {
  const token = `esp_${randomBytes(24).toString("base64url")}`;
  const secret = randomBytes(32).toString("hex");
  return { token, secret, tokenHash: tokenHash(token), tokenHint: token.slice(-4) };
}

export function signRequest(secret: string, ts: string, method: string, path: string, body: string) {
  return createHmac("sha256", secret).update(`${ts}.${method.toUpperCase()}.${path}.${body}`).digest("hex");
}

function ipOf(req: Request) {
  return (req.headers.get("x-forwarded-for")?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "").trim().slice(0, 64);
}

export type PartnerCtx = { partner: Partner; body: string; ip: string };

export async function logPartner(partnerId: number | null, req: Request, status: number, message = "") {
  const u = new URL(req.url);
  await db
    .insert(partnerLogs)
    .values({ partnerId, method: req.method, path: u.pathname + (u.search ? u.search.slice(0, 200) : ""), status, ip: ipOf(req), message: message.slice(0, 300) })
    .catch(() => {});
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

/** Authenticate + verify signature. Returns the partner or an error response (already logged). */
export async function authPartner(req: Request): Promise<PartnerCtx | NextResponse> {
  const body = req.method === "GET" || req.method === "HEAD" ? "" : await req.text();
  const ip = ipOf(req);
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    await logPartner(null, req, 401, "missing token");
    return apiError(401, "unauthorized", "Missing bearer token");
  }
  const [p] = await db.select().from(partners).where(eq(partners.tokenHash, tokenHash(token)));
  if (!p || !p.isActive) {
    await logPartner(p?.id ?? null, req, 401, "invalid token");
    return apiError(401, "unauthorized", "Invalid or inactive token");
  }
  const rl = await rateLimit(`partner:${p.id}`, 120, 60);
  if (!rl.ok) {
    await logPartner(p.id, req, 429, "rate limited");
    return apiError(429, "rate_limited", "Too many requests");
  }
  if (p.allowedIps.trim()) {
    const allowed = p.allowedIps.split(/[\s,]+/).filter(Boolean);
    if (!allowed.includes(ip)) {
      await logPartner(p.id, req, 403, `ip ${ip} not allowed`);
      return apiError(403, "forbidden", "IP address not allowed");
    }
  }
  const ts = req.headers.get("x-timestamp") ?? "";
  const sig = (req.headers.get("x-signature") ?? "").toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  if (!/^\d{10}$/.test(ts) || Math.abs(now - Number(ts)) > 300) {
    await logPartner(p.id, req, 401, "bad timestamp");
    return apiError(401, "bad_timestamp", "X-Timestamp missing or outside the ±300s window");
  }
  const path = new URL(req.url).pathname;
  const expected = signRequest(p.secret, ts, req.method, path, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await logPartner(p.id, req, 401, "bad signature");
    return apiError(401, "bad_signature", "Signature mismatch");
  }
  await db.update(partners).set({ lastUsedAt: new Date() }).where(eq(partners.id, p.id));
  return { partner: p, body, ip };
}
