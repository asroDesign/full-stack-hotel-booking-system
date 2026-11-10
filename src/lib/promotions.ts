import { and, asc, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { promotions, reservations, type Promotion } from "@/db/schema";
import { faNum, formatJalali, formatPrice, todayISO } from "./utils";

export type PromoContext = {
  kind: "room" | "service";
  roomId?: number | null;
  checkIn: string;
  nights: number;
  subtotal: number;
};

export type PromoResult = { ok: true; promo: Promotion; discount: number } | { ok: false; error: string };

export function normalizeCode(c: unknown) {
  return String(c ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 30);
}

/** Number of reservations that already used a code (paid or confirmed only). */
export async function promoUses(code: string) {
  const [r] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(reservations)
    .where(and(eq(reservations.promoCode, code), inArray(reservations.status, ["paid", "confirmed"])));
  return r?.c ?? 0;
}

export async function promoUsesMap(codes: string[]) {
  if (!codes.length) return new Map<string, number>();
  const rows = await db
    .select({ code: reservations.promoCode, c: sql<number>`count(*)::int` })
    .from(reservations)
    .where(and(inArray(reservations.promoCode, codes), inArray(reservations.status, ["paid", "confirmed"])))
    .groupBy(reservations.promoCode);
  return new Map(rows.map((r) => [r.code, r.c]));
}

export function discountLabel(p: Pick<Promotion, "kind" | "value">) {
  return p.kind === "percent" ? `${faNum(p.value)}٪ تخفیف` : `${formatPrice(p.value)} تومان تخفیف`;
}

export function promoConditions(p: Promotion) {
  const out: string[] = [];
  if (p.appliesTo === "rooms") out.push("ویژه رزرو اتاق");
  if (p.appliesTo === "services") out.push("ویژه رزرو خدمات و سانس‌ها");
  if (p.minNights > 1) out.push(`حداقل ${faNum(p.minNights)} شب اقامت`);
  if (p.maxDiscount > 0 && p.kind === "percent") out.push(`سقف تخفیف ${formatPrice(p.maxDiscount)} تومان`);
  if (p.validFrom) out.push(`ورود از ${formatJalali(p.validFrom)}`);
  if (p.validTo) out.push(`ورود تا ${formatJalali(p.validTo)}`);
  return out;
}

export async function evaluatePromo(rawCode: unknown, ctx: PromoContext): Promise<PromoResult> {
  const code = normalizeCode(rawCode);
  if (!code) return { ok: false, error: "کد تخفیف را وارد کنید." };
  const [p] = await db.select().from(promotions).where(eq(promotions.code, code));
  if (!p || !p.isActive) return { ok: false, error: "کد تخفیف معتبر نیست." };
  if (p.appliesTo === "rooms" && ctx.kind !== "room") return { ok: false, error: "این کد فقط برای رزرو اتاق قابل استفاده است." };
  if (p.appliesTo === "services" && ctx.kind !== "service") return { ok: false, error: "این کد فقط برای رزرو خدمات و سانس‌ها قابل استفاده است." };
  if (ctx.kind === "room" && p.roomIds.length && (!ctx.roomId || !p.roomIds.includes(ctx.roomId)))
    return { ok: false, error: "این کد برای اتاق انتخاب‌شده معتبر نیست." };
  if (p.validFrom && ctx.checkIn < p.validFrom) return { ok: false, error: `این کد برای ورود از ${formatJalali(p.validFrom)} به بعد معتبر است.` };
  if (p.validTo && ctx.checkIn > p.validTo) return { ok: false, error: "مهلت استفاده از این کد به پایان رسیده است." };
  if (ctx.kind === "room" && ctx.nights < p.minNights) return { ok: false, error: `این کد برای اقامت حداقل ${faNum(p.minNights)} شب معتبر است.` };
  if (p.maxUses > 0 && (await promoUses(code)) >= p.maxUses) return { ok: false, error: "ظرفیت استفاده از این کد تکمیل شده است." };
  if (ctx.subtotal <= 0) return { ok: false, error: "مبلغی برای اعمال تخفیف وجود ندارد." };

  let discount = p.kind === "percent" ? (ctx.subtotal * Math.min(100, Math.max(0, p.value))) / 100 : p.value;
  if (p.maxDiscount > 0) discount = Math.min(discount, p.maxDiscount);
  discount = Math.min(ctx.subtotal, Math.floor(discount / 1000) * 1000);
  if (discount <= 0) return { ok: false, error: "این کد برای این رزرو تخفیفی ایجاد نمی‌کند." };
  return { ok: true, promo: p, discount };
}

/** Public offers shown on the website. */
export async function getPublicOffers(limit = 12) {
  const today = todayISO();
  return db
    .select()
    .from(promotions)
    .where(and(eq(promotions.isActive, true), eq(promotions.isPublic, true), or(isNull(promotions.validTo), gte(promotions.validTo, today))))
    .orderBy(asc(promotions.sortOrder), asc(promotions.id))
    .limit(limit);
}
