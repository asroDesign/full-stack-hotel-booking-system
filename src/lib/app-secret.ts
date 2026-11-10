import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

let cached: string | null = null;

/** Per-installation secret (generated once, stored in settings) used to sign guest-portal cookies. */
export async function getAppSecret(): Promise<string> {
  if (cached) return cached;
  if (process.env.APP_SECRET && process.env.APP_SECRET.length >= 16) return (cached = process.env.APP_SECRET);
  const [row] = await db.select().from(settings).where(eq(settings.key, "appSecret"));
  if (row?.value) return (cached = row.value);
  const value = randomBytes(32).toString("hex");
  await db.insert(settings).values({ key: "appSecret", value }).onConflictDoNothing();
  const [again] = await db.select().from(settings).where(eq(settings.key, "appSecret"));
  return (cached = again?.value ?? value);
}

export async function sign(payload: string) {
  return createHmac("sha256", await getAppSecret()).update(payload).digest("base64url");
}

export async function verifySigned(payload: string, sig: string) {
  const expected = Buffer.from(await sign(payload));
  const got = Buffer.from(sig);
  return expected.length === got.length && timingSafeEqual(expected, got);
}
