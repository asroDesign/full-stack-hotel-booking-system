import { cookies } from "next/headers";
import { isHttpsRequest } from "@/lib/security";
import { sign, verifySigned } from "@/lib/app-secret";

const COOKIE = "hotel_guest_access";
type AccessEntry = { kind: "reservation" | "gift"; id: string; phone: string };

async function readEntries() {
  const token = (await cookies()).get(COOKIE)?.value ?? "";
  if (token.length > 4096) return [] as AccessEntry[];
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !(await verifySigned(encoded, signature))) return [] as AccessEntry[];
  try {
    const value = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (!Array.isArray(value) || value.length > 16) return [];
    return value.filter((item): item is AccessEntry =>
      item && (item.kind === "reservation" || item.kind === "gift") &&
      typeof item.id === "string" && item.id.length <= 40 &&
      typeof item.phone === "string" && /^\+?[\d -]{7,20}$/.test(item.phone),
    );
  } catch {
    return [];
  }
}

export async function grantPublicAccess(kind: AccessEntry["kind"], id: string | number, phone: string) {
  const key = String(id);
  if (!key || key.length > 40 || !/^\+?[\d -]{7,20}$/.test(phone)) throw new Error("اطلاعات دسترسی مهمان معتبر نیست.");
  const entries = (await readEntries()).filter((entry) => !(entry.kind === kind && entry.id === key));
  entries.push({ kind, id: key, phone });
  const encoded = Buffer.from(JSON.stringify(entries.slice(-16)), "utf8").toString("base64url");
  const signature = await sign(encoded);
  const secure = await isHttpsRequest();
  (await cookies()).set(COOKIE, `${encoded}.${signature}`, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}

export async function publicAccessPhone(kind: AccessEntry["kind"], id: string | number) {
  const key = String(id);
  return (await readEntries()).find((entry) => entry.kind === kind && entry.id === key)?.phone ?? null;
}

export async function hasPublicAccess(kind: AccessEntry["kind"], id: string | number, phone: string) {
  return (await publicAccessPhone(kind, id)) === phone;
}
