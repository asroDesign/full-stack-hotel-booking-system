"use server";

import { and, desc, eq, gte } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { diningVenues, giftCards, guestRequestMessages, guestRequests, reservations, tableBookings } from "@/db/schema";
import { getSettingsFresh } from "@/lib/data";
import { cleanText, clientIp, isHttpsRequest } from "@/lib/security";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { isMobile, normalizeMobile, upsertCustomer } from "@/lib/crm";
import { genGiftCode, giftSummary, isUsable, normalizeGiftCode } from "@/lib/giftcards";
import { startGiftCardPayment } from "@/lib/payment-service";
import type { PaymentGatewayId } from "@/db/schema";
import { sign, verifySigned } from "@/lib/app-secret";
import { grantPublicAccess, hasPublicAccess } from "@/lib/public-access";
import { addDaysISO, todayISO, toEnDigits } from "@/lib/utils";
import { notifyShiftForGuestRequest } from "@/lib/hotel-operations";

export type GState = { ok?: boolean; error?: string; message?: string; redirect?: import("@/lib/payment-providers").GatewayRedirect } | null;
const s = (fd: FormData, k: string, max = 200) => toEnDigits(cleanText(fd.get(k), max));
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/* ======================= gift cards (public) ======================= */

export async function orderGiftCard(_p: GState, fd: FormData): Promise<GState> {
  const rl = await rateLimit(`gift:${await clientIp()}`, 8, 3600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };
  const st = await getSettingsFresh();
  const amount = Math.round(Number(s(fd, "amount").replace(/[,٬]/g, "")) || 0);
  const min = Number(st.giftCardMin) || 1_000_000;
  if (amount < min) return { error: `حداقل مبلغ کارت هدیه ${min.toLocaleString("fa-IR")} تومان است.` };
  if (amount > 500_000_000) return { error: "مبلغ کارت بیش از حد مجاز است." };
  const purchaserName = cleanText(fd.get("purchaserName"), 80);
  const purchaserPhone = normalizeMobile(s(fd, "purchaserPhone", 20));
  const recipientPhone = normalizeMobile(s(fd, "recipientPhone", 20));
  if (purchaserName.length < 3) return { error: "نام خریدار را وارد کنید." };
  if (!isMobile(purchaserPhone)) return { error: "شماره موبایل خریدار معتبر نیست." };
  if (recipientPhone && !isMobile(recipientPhone)) return { error: "شماره موبایل گیرنده معتبر نیست." };
  const [g] = await db
    .insert(giftCards)
    .values({
      code: genGiftCode(),
      initialAmount: amount,
      purchaserName,
      purchaserPhone,
      recipientName: cleanText(fd.get("recipientName"), 80),
      recipientPhone,
      message: cleanText(fd.get("message"), 300),
      issuedBy: "online",
    })
    .returning();
  after(() => upsertCustomer({ name: purchaserName, phone: purchaserPhone, source: "website" }).then(() => undefined));
  await grantPublicAccess("gift", g.id, purchaserPhone);
  redirect(`/gift-cards/order/${g.id}`);
}

export async function payGiftCard(_p: GState, fd: FormData): Promise<GState> {
  const rl = await rateLimit(`giftpay:${await clientIp()}`, 15, 600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };
  const id = Number(s(fd, "id"));
  const phone = normalizeMobile(s(fd, "phone", 20));
  const method = s(fd, "method") === "gateway" ? "gateway" : "card";
  const ref = s(fd, "ref", 30);
  const providerInput = s(fd, "provider");
  const provider = (["zarinpal", "zibal", "saman", "mellat"] as const).find((gateway) => gateway === providerInput) as PaymentGatewayId | undefined;
  const [gift] = await db.select().from(giftCards).where(and(eq(giftCards.id, id), eq(giftCards.purchaserPhone, phone)));
  if (!gift || !(await hasPublicAccess("gift", gift.id, phone))) return { error: "سفارش یافت نشد." };
  if (gift.status !== "pending_payment") return { error: "این سفارش قبلاً پرداخت شده است." };
  if (method === "card") {
    if (!/^\d{4,20}$/.test(ref)) return { error: "شماره پیگیری واریز را صحیح وارد کنید." };
    const [updated] = await db.update(giftCards).set({ paymentMethod: "card", paymentRef: ref }).where(and(eq(giftCards.id, id), eq(giftCards.status, "pending_payment"))).returning({ id: giftCards.id });
    if (!updated) return { error: "وضعیت سفارش تغییر کرده است؛ صفحه را دوباره بارگذاری کنید." };
    revalidatePath(`/gift-cards/order/${id}`);
    return { ok: true, message: "اطلاعات واریز ثبت شد؛ پس از تأیید مالی، کارت هدیه فعال می‌شود." };
  }
  if (!provider) return { error: "یک درگاه پرداخت فعال را انتخاب کنید." };
  try {
    const redirect = await startGiftCardPayment(id, phone, provider);
    return { redirect };
  } catch (error) {
    return { error: error instanceof Error ? error.message.slice(0, 250) : "شروع پرداخت ناموفق بود؛ دوباره تلاش کنید." };
  }
}

export async function checkGiftBalance(_p: GState, fd: FormData): Promise<GState> {
  const rl = await rateLimit(`giftbal:${await clientIp()}`, 20, 600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };
  const code = normalizeGiftCode(fd.get("code"));
  const [g] = await db.select().from(giftCards).where(eq(giftCards.code, code));
  if (!g || g.status === "pending_payment") return { error: "کارت هدیه‌ای با این کد یافت نشد." };
  if (!isUsable(g)) return { error: g.status === "void" ? "این کارت باطل شده است." : "این کارت مانده‌ای ندارد یا منقضی شده است." };
  return { ok: true, message: giftSummary(g) };
}

/* ======================= restaurant / café table booking ======================= */

export async function bookTable(_p: GState, fd: FormData): Promise<GState> {
  const rl = await rateLimit(`table:${await clientIp()}`, 6, 3600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };
  const venueId = Number(s(fd, "venueId"));
  const [v] = await db.select().from(diningVenues).where(eq(diningVenues.id, venueId));
  if (!v || !v.isActive || !v.bookingEnabled) return { error: "رزرو آنلاین برای این مجموعه فعال نیست." };
  const name = cleanText(fd.get("name"), 80);
  const phone = normalizeMobile(s(fd, "phone", 20));
  const date = s(fd, "date", 10);
  const time = s(fd, "time", 5);
  const guests = Math.min(40, Math.max(1, Number(s(fd, "guests")) || 2));
  if (name.length < 2) return { error: "نام را وارد کنید." };
  if (!isMobile(phone)) return { error: "شماره موبایل معتبر نیست." };
  if (!ISO.test(date) || date < todayISO() || date > addDaysISO(todayISO(), 90)) return { error: "تاریخ معتبر (تا ۹۰ روز آینده) انتخاب کنید." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: "ساعت را انتخاب کنید." };
  await db.insert(tableBookings).values({ venueId, name, phone, date, time, guests, notes: cleanText(fd.get("notes"), 500) });
  after(() => upsertCustomer({ name, phone, source: "website" }).then(() => undefined));
  revalidatePath("/admin", "layout");
  return { ok: true, message: "درخواست رزرو میز ثبت شد. پس از تایید، پیامک تایید برای شما ارسال می‌شود." };
}

/* ======================= in-house guest portal ======================= */

const STAY_COOKIE = "stay_session";

export async function stayLogin(_p: GState, fd: FormData): Promise<GState> {
  const rl = await rateLimit(`stay:${await clientIp()}`, 15, 900);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };
  const code = s(fd, "code", 20).toUpperCase();
  const phone = normalizeMobile(s(fd, "phone", 20));
  const [r] = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.reservationCode, code), eq(reservations.phone, phone), eq(reservations.status, "confirmed"), eq(reservations.kind, "room")));
  if (!r) return { error: "رزرو قطعی با این کد رزرو و شماره موبایل یافت نشد." };
  const today = todayISO();
  if (r.checkIn > addDaysISO(today, 1)) return { error: "پرتال مهمانان از یک روز قبل از ورود فعال می‌شود." };
  if ((r.checkOut ?? r.checkIn) < addDaysISO(today, -1) || r.checkedOutAt) return { error: "اقامت شما به پایان رسیده است. از همراهی شما سپاسگزاریم." };
  const payload = `${r.id}.${phone}`;
  const store = await cookies();
  store.set(STAY_COOKIE, `${payload}.${await sign(payload)}`, {
    httpOnly: true,
    sameSite: (await isHttpsRequest()) ? "none" : "lax",
    secure: await isHttpsRequest(),
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  redirect("/stay");
}

export async function stayLogout() {
  (await cookies()).delete(STAY_COOKIE);
  redirect("/stay");
}

/** Reservation of the logged-in in-house guest (or null). */
export async function currentStay() {
  const raw = (await cookies()).get(STAY_COOKIE)?.value ?? "";
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, phone, sig] = parts;
  if (!(await verifySigned(`${id}.${phone}`, sig))) return null;
  const [r] = await db.select().from(reservations).where(and(eq(reservations.id, Number(id)), eq(reservations.phone, phone), eq(reservations.status, "confirmed")));
  if (!r || r.checkedOutAt || (r.checkOut ?? r.checkIn) < addDaysISO(todayISO(), -1)) return null;
  return r;
}

const CATS = ["housekeeping", "room_service", "maintenance", "reception", "transfer", "extend", "other"];

export async function stayNewRequest(_p: GState, fd: FormData): Promise<GState> {
  const r = await currentStay();
  if (!r) return { error: "نشست شما منقضی شده است؛ دوباره وارد شوید." };
  const rl = await rateLimit(`stayreq:${r.id}`, 20, 3600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };
  const body = cleanText(fd.get("body"), 1500);
  const category = CATS.includes(String(fd.get("category"))) ? String(fd.get("category")) : "other";
  if (body.length < 3) return { error: "متن درخواست را بنویسید." };
  const [q] = await db.insert(guestRequests).values({ reservationId: r.id, category }).returning();
  const [message] = await db.insert(guestRequestMessages).values({ requestId: q.id, sender: "guest", body }).returning({ id: guestRequestMessages.id });
  after(() => notifyShiftForGuestRequest({ reservation: r, requestId: q.id, messageId: message.id, category, body }));
  revalidatePath("/stay");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "درخواست شما برای پذیرش ارسال شد." };
}

export async function stayReply(requestId: number, body: string): Promise<GState> {
  const r = await currentStay();
  if (!r) return { error: "نشست شما منقضی شده است؛ دوباره وارد شوید." };
  const rl = await rateLimit(`stayreply:${r.id}`, 40, 3600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };
  const text = cleanText(body, 1500);
  if (text.length < 1) return { error: "متن پیام خالی است." };
  const [q] = await db.select().from(guestRequests).where(and(eq(guestRequests.id, requestId), eq(guestRequests.reservationId, r.id)));
  if (!q) return { error: "درخواست یافت نشد." };
  const [message] = await db.insert(guestRequestMessages).values({ requestId, sender: "guest", body: text }).returning({ id: guestRequestMessages.id });
  await db.update(guestRequests).set({ unreadStaff: true, unreadGuest: false, updatedAt: new Date(), status: q.status === "done" ? "open" : q.status }).where(eq(guestRequests.id, requestId));
  after(() => notifyShiftForGuestRequest({ reservation: r, requestId, messageId: message.id, category: q.category, body: text }));
  revalidatePath("/stay");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "ارسال شد." };
}

export async function stayThreads() {
  const r = await currentStay();
  if (!r) return [];
  const reqs = await db.select().from(guestRequests).where(eq(guestRequests.reservationId, r.id)).orderBy(desc(guestRequests.updatedAt));
  if (reqs.some((q) => q.unreadGuest)) await db.update(guestRequests).set({ unreadGuest: false }).where(and(eq(guestRequests.reservationId, r.id), eq(guestRequests.unreadGuest, true)));
  const msgs = reqs.length ? await db.select().from(guestRequestMessages).where(gte(guestRequestMessages.requestId, Math.min(...reqs.map((q) => q.id)))) : [];
  return reqs.map((q) => ({ ...q, messages: msgs.filter((m) => m.requestId === q.id).sort((a, b) => +a.createdAt - +b.createdAt) }));
}
