import { randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db } from "@/db";
import { admins, sessions } from "@/db/schema";

export const SESSION_COOKIE = "atalar_session";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const derived = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export type SessionAdmin = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export async function createSession(adminId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  // House-keeping: drop this admin's expired sessions so the table stays small.
  await db.delete(sessions).where(and(eq(sessions.adminId, adminId), lt(sessions.expiresAt, new Date())));
  await db.insert(sessions).values({ token, adminId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Only flag as secure when the deployment is actually HTTPS. Behind an
    // HTTP reverse proxy a `secure` cookie is silently dropped by the browser,
    // which was causing the "logged out after refresh" bug.
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.token, token));
    } catch {
      // table might not exist yet during bootstrap
    }
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentAdmin(): Promise<SessionAdmin | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const rows = await db
      .select({
        id: admins.id,
        name: admins.name,
        email: admins.email,
        role: admins.role,
      })
      .from(sessions)
      .innerJoin(admins, eq(sessions.adminId, admins.id))
      .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
      .limit(1);
    if (!rows[0]) return null;
    // Sliding expiration: keep active admins signed in across refreshes.
    const renewAfter = new Date(Date.now() + (SESSION_DAYS - 5) * 24 * 60 * 60 * 1000);
    try {
      await db
        .update(sessions)
        .set({ expiresAt: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000) })
        .where(and(eq(sessions.token, token), lt(sessions.expiresAt, renewAfter)));
    } catch {
      // Non-fatal: the session is still valid for the current request.
    }
    return rows[0];
  } catch {
    return null;
  }
}

export function generateRoomBookingCode(): string {
  return `ATL-${randomInt(1000, 9999)}`;
}

export function generateTrackingCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return `TRK-${code}`;
}
