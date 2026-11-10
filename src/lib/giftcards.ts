import { randomInt } from "crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { giftCards, giftCardTx, journalEntries, type GiftCard } from "@/db/schema";
import { getSettingsFresh } from "./data";
import { createVoucher, dateToISO } from "./accounting";
import { sendText } from "./sms";
import { addDaysISO, faNum, formatJalali, formatPrice, todayISO } from "./utils";

const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export function genGiftCode() {
  const part = () => Array.from({ length: 4 }, () => ALPHA[randomInt(ALPHA.length)]).join("");
  return `GC-${part()}-${part()}`;
}
export const normalizeGiftCode = (c: unknown) => String(c ?? "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20);

export const giftStatusMeta: Record<string, { label: string; badge: string }> = {
  pending_payment: { label: "در انتظار پرداخت", badge: "badge-warning" },
  active: { label: "فعال", badge: "badge-success" },
  used: { label: "استفاده‌شده", badge: "badge-ghost" },
  void: { label: "باطل‌شده", badge: "badge-error" },
};

export function isUsable(g: GiftCard, today = todayISO()) {
  return g.status === "active" && g.balance > 0 && (!g.expiresAt || g.expiresAt >= today);
}

/** Activate a paid gift card: set expiry, book the sale in accounting and notify the recipient. */
export async function activateGiftCard(id: number, opts: { method?: string; ref?: string; silent?: boolean } = {}) {
  const [g] = await db.select().from(giftCards).where(eq(giftCards.id, id));
  if (!g || g.status === "active" || g.status === "used") return g;
  const s = await getSettingsFresh();
  const months = Math.max(1, Number(s.giftCardValidMonths) || 12);
  const expires = addDaysISO(todayISO(), months * 30);
  const [u] = await db
    .update(giftCards)
    .set({ status: "active", balance: g.initialAmount, paidAt: new Date(), expiresAt: g.expiresAt ?? expires, paymentMethod: opts.method ?? g.paymentMethod, paymentRef: opts.ref ?? g.paymentRef })
    .where(eq(giftCards.id, id))
    .returning();
  await db.insert(giftCardTx).values({ giftCardId: id, amount: g.initialAmount, note: "صدور و فعال‌سازی کارت" });
  if (g.issuedBy !== "complimentary") {
    await createVoucher({
      date: dateToISO(new Date()),
      description: `فروش کارت هدیه ${g.code} - ${g.purchaserName}`,
      source: "giftcard",
      sourceType: "sale",
      createdBy: "سیستم",
      lines: [
        { code: u.paymentMethod === "gateway" ? "110202" : u.paymentMethod === "cash" ? "110101" : "110201", debit: g.initialAmount, credit: 0, description: u.paymentRef ? `مرجع ${u.paymentRef}` : "" },
        { code: "220102", debit: 0, credit: g.initialAmount },
      ],
    });
  }
  if (!opts.silent) {
    const to = u.recipientPhone || u.purchaserPhone;
    if (to)
      await sendText(
        to,
        `${u.recipientName || u.purchaserName} عزیز، کارت هدیه ${s.hotelName} به مبلغ ${formatPrice(u.initialAmount)} تومان برای شما صادر شد${u.purchaserName && u.recipientName ? ` (از طرف ${u.purchaserName})` : ""}. کد: ${u.code} - اعتبار تا ${formatJalali(u.expiresAt)}`,
        { event: "giftcard" },
      );
  }
  return u;
}

/** Deduct up to `amount` from a gift card. Returns the amount actually used. */
export async function redeemGiftCard(code: string, amount: number, reservationId: number) {
  return db.transaction(async (tx) => {
    const res = await tx.execute<{ id: number; balance: number; status: string; expires_at: string | null }>(
      sql`select id, balance, status, expires_at from gift_cards where code = ${code} for update`,
    );
    const g = res.rows[0];
    if (!g || g.status !== "active" || g.balance <= 0 || (g.expires_at && g.expires_at < todayISO())) return 0;
    const use = Math.min(g.balance, Math.max(0, Math.round(amount)));
    if (use <= 0) return 0;
    const left = g.balance - use;
    await tx.update(giftCards).set({ balance: left, status: left === 0 ? "used" : "active" }).where(eq(giftCards.id, g.id));
    await tx.insert(giftCardTx).values({ giftCardId: g.id, amount: -use, reservationId, note: "پرداخت پیش‌پرداخت رزرو" });
    return use;
  });
}

/** Void a card. Unused paid cards get their sale voucher reversed. */
export async function voidGiftCard(id: number) {
  const [g] = await db.select().from(giftCards).where(eq(giftCards.id, id));
  if (!g) return { ok: false, message: "کارت یافت نشد." };
  if (g.status === "active" && g.balance !== g.initialAmount) return { ok: false, message: "از این کارت استفاده شده و قابل ابطال نیست." };
  await db.update(giftCards).set({ status: "void", balance: 0 }).where(eq(giftCards.id, id));
  await db
    .delete(journalEntries)
    .where(and(eq(journalEntries.source, "giftcard"), inArray(journalEntries.description, [`فروش کارت هدیه ${g.code} - ${g.purchaserName}`])));
  await db.insert(giftCardTx).values({ giftCardId: id, amount: -g.balance, note: "ابطال کارت" });
  return { ok: true, message: `کارت ${g.code} باطل شد.` };
}

export function giftSummary(g: GiftCard) {
  return `${g.code} · مانده ${formatPrice(g.balance)} از ${formatPrice(g.initialAmount)} تومان${g.expiresAt ? ` · تا ${formatJalali(g.expiresAt)}` : ""}`;
}
export { faNum };
