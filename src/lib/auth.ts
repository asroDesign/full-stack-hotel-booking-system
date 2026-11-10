import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { and, eq, gt, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { admins, sessions } from "@/db/schema";
import { isHttpsRequest } from "./security";

const COOKIE = "atalar_session";
const MAX_AGE_SEC = 30 * 86400;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

/** Constant-time-ish dummy check so missing accounts take as long as wrong passwords. */
const DUMMY_HASH = hashPassword(randomBytes(8).toString("hex"));
export function dummyVerify() {
  verifyPassword("dummy-password", DUMMY_HASH);
}

/** Only a SHA-256 hash of the session token is stored in the database. */
function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Cookie options.
 * - HTTPS: SameSite=None + Secure + Partitioned so the session also survives a
 *   refresh when the panel is opened inside an iframe/preview (a Lax cookie is
 *   dropped by the browser there, which logged the admin out after refresh).
 * - HTTP: SameSite=Lax without Secure (a Secure cookie is rejected over HTTP).
 */
async function cookieOptions() {
  const https = await isHttpsRequest();
  return https
    ? ({ httpOnly: true, secure: true, sameSite: "none", partitioned: true, path: "/", maxAge: MAX_AGE_SEC } as const)
    : ({ httpOnly: true, secure: false, sameSite: "lax", path: "/", maxAge: MAX_AGE_SEC } as const);
}

export async function createSession(adminId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MAX_AGE_SEC * 1000);
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  await db.insert(sessions).values({ id: tokenHash(token), adminId, expiresAt });
  const store = await cookies();
  store.set(COOKIE, token, { ...(await cookieOptions()), expires: expiresAt });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, tokenHash(token)));
  store.set(COOKIE, "", { ...(await cookieOptions()), maxAge: 0 });
  store.delete(COOKIE);
}

/** Revoke every other session of this admin (used after password change). */
export async function revokeOtherSessions(adminId: number) {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  const current = token ? tokenHash(token) : "";
  await db.delete(sessions).where(and(eq(sessions.adminId, adminId), ne(sessions.id, current)));
}

export const getCurrentAdmin = cache(async () => {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token || token.length < 20 || token.length > 200) return null;
  const rows = await db
    .select({ id: admins.id, name: admins.name, email: admins.email })
    .from(sessions)
    .innerJoin(admins, eq(admins.id, sessions.adminId))
    .where(and(eq(sessions.id, tokenHash(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
});

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
