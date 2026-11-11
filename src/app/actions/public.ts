"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { messages, reservations, rooms, services, testimonials, promotions, stayPackages } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { getContent } from "@/lib/content";
import { bookedSlots, roomConflicts } from "@/lib/availability";
import { quoteRoom } from "@/lib/pricing";
import { notifyAdmins, notifyGuest } from "@/lib/sms";
import { syncReservationVouchers } from "@/lib/accounting";
import { cleanText, clientIp } from "@/lib/security";
import { rateLimit, retryMessage } from "@/lib/rate-limit";
import { diffDays, genTrackingCode, todayISO, toEnDigits } from "@/lib/utils";
import { evaluatePromo, normalizeCode, promoUses } from "@/lib/promotions";
import { linkReservationCustomer } from "@/lib/crm";
import { giftCards, giftCardTx } from "@/db/schema";
import { isUsable, normalizeGiftCode, redeemGiftCard } from "@/lib/giftcards";
import { sql } from "drizzle-orm";
import { startReservationPayment } from "@/lib/payment-service";
import type { PaymentGatewayId } from "@/db/schema";
import type { GatewayRedirect } from "@/lib/payment-providers";
import { grantPublicAccess, hasPublicAccess } from "@/lib/public-access";

export type FormState = { ok?: boolean; error?: string; message?: string; redirect?: GatewayRedirect } | null;

function s(fd: FormData, key: string, max = 200) {
  return toEnDigits(cleanText(fd.get(key), max));
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[a-z]{2,}$/i;

export async function createReservation(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  const rl = await rateLimit(`reserve:${ip}`, 10, 3600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };

  const kind = s(fd, "kind") === "service" ? "service" : "room";
  const itemId = Number(s(fd, "itemId"));
  const guestName = cleanText(fd.get("guestName"), 80);
  const phone = s(fd, "phone").replace(/[\s-]/g, "");
  const email = s(fd, "email", 120);
  const nationalId = s(fd, "nationalId", 10);
  const guests = Math.min(30, Math.max(1, Number(s(fd, "guests")) || 1));
  const checkIn = s(fd, "checkIn");
  const checkOut = s(fd, "checkOut");
  const timeSlot = s(fd, "timeSlot", 30);
  const notes = cleanText(fd.get("notes"), 1000);
  const optionIds = s(fd, "options", 500).split(",").filter(Boolean).slice(0, 20);
  const rawStayPackageId = s(fd, "stayPackageId");
  const requestedStayPackageId = rawStayPackageId ? Number(rawStayPackageId) : 0;

  if (!Number.isInteger(itemId) || itemId <= 0) return { error: "لطفاً اتاق یا خدمت مورد نظر را انتخاب کنید." };
  if (guestName.length < 3) return { error: "نام و نام خانوادگی را کامل وارد کنید." };
  if (!/^09\d{9}$/.test(phone)) return { error: "شماره موبایل معتبر نیست (مثال: ۰۹۱۲۱۲۳۴۵۶۷)." };
  if (nationalId && !/^\d{10}$/.test(nationalId)) return { error: "کد ملی باید ۱۰ رقم باشد." };
  if (email && !EMAIL.test(email)) return { error: "ایمیل وارد شده معتبر نیست." };
  if (!Number.isSafeInteger(requestedStayPackageId) || requestedStayPackageId < 0 || requestedStayPackageId > 2_147_483_647)
    return { error: "بستهٔ اقامتی انتخاب‌شده معتبر نیست." };
  if (!ISO.test(checkIn)) return { error: "تاریخ را انتخاب کنید." };
  if (checkIn < todayISO()) return { error: "تاریخ انتخاب‌شده گذشته است." };

  const { booking } = await getContent();
  if (booking.requireRulesAccept && fd.get("acceptRules") !== "on")
    return { error: "لطفاً قوانین رزرو را مطالعه کرده و تأیید کنید." };

  const settings = await getSettings();
  const pct = Math.min(100, Math.max(0, Number(settings.depositPercent) || 30));

  let itemName = "";
  let total = 0;
  let extraGuestFee = 0;
  let nights = 1;
  let roomId: number | null = null;
  let serviceId: number | null = null;
  let options: typeof reservations.$inferInsert.options = [];
  let optionsTotal = 0;
  let stayPackageId: number | null = null;
  let stayPackageName = "";
  let stayPackagePrice = 0;
  let nightly: typeof reservations.$inferInsert.nightly = [];

  if (kind === "room") {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, itemId));
    if (!room || !room.isActive) return { error: "اتاق انتخاب‌شده در دسترس نیست." };
    if (!ISO.test(checkOut)) return { error: "تاریخ خروج را انتخاب کنید." };
    nights = diffDays(checkIn, checkOut);
    if (nights < 1) return { error: "تاریخ خروج باید بعد از تاریخ ورود باشد." };
    if (nights > 30) return { error: "حداکثر مدت اقامت ۳۰ شب است." };
    if (guests > room.capacity + room.extraBeds)
      return { error: `حداکثر ظرفیت این اتاق ${room.capacity + room.extraBeds} نفر است.` };
    const conflicts = await roomConflicts(room.id, checkIn, checkOut);
    if (conflicts.length) return { error: "متأسفانه اتاق در این بازه رزرو شده است. تاریخ دیگری انتخاب کنید." };
    const q = await quoteRoom(room, checkIn, checkOut, guests, optionIds);
    itemName = room.name;
    if (requestedStayPackageId > 0) {
      const [selectedPackage] = await db.select().from(stayPackages).where(and(eq(stayPackages.id, requestedStayPackageId), eq(stayPackages.isActive, true)));
      if (!selectedPackage) return { error: "بستهٔ اقامتی انتخاب‌شده دیگر در دسترس نیست. صفحه را تازه‌سازی کنید." };
      stayPackageId = selectedPackage.id;
      stayPackageName = selectedPackage.title;
      stayPackagePrice = selectedPackage.pricingMode === "fixed" ? selectedPackage.price : 0;
    }
    total = q.total + stayPackagePrice;
    extraGuestFee = q.extraGuestFee;
    options = q.options;
    optionsTotal = q.optionsTotal;
    nightly = q.nights.map((n) => ({ date: n.date, price: n.price, kind: n.kind }));
    roomId = room.id;
  } else {
    if (requestedStayPackageId > 0) return { error: "بستهٔ اقامتی فقط به رزرو اتاق اضافه می‌شود." };
    const [svc] = await db.select().from(services).where(eq(services.id, itemId));
    if (!svc || !svc.isActive || !svc.isBookable) return { error: "این خدمت قابل رزرو نیست." };
    if (svc.timeSlots.length && !svc.timeSlots.includes(timeSlot)) return { error: "لطفاً سانس را انتخاب کنید." };
    if (guests > svc.maxGuests) return { error: `حداکثر تعداد نفرات ${svc.maxGuests} نفر است.` };
    const taken = await bookedSlots(svc.id, checkIn);
    if (taken.includes(timeSlot)) return { error: "این سانس قبلاً رزرو شده است. سانس دیگری انتخاب کنید." };
    itemName = svc.name;
    const base = svc.slotPrices[timeSlot] ?? svc.price;
    extraGuestFee = Math.max(0, guests - svc.includedGuests) * svc.extraGuestPrice;
    total = base + extraGuestFee;
    serviceId = svc.id;
  }

  let promoCode = "";
  let discount = 0;
  const rawPromo = normalizeCode(fd.get("promoCode"));
  if (rawPromo) {
    const pr = await evaluatePromo(rawPromo, { kind, roomId, checkIn, nights, subtotal: total });
    if (!pr.ok) return { error: `کد تخفیف: ${pr.error}` };
    promoCode = pr.promo.code;
    discount = pr.discount;
    total -= discount;
  }

  const deposit = Math.round((total * pct) / 100 / 1000) * 1000;
  const trackingCode = genTrackingCode();

  const [created] = await db
    .insert(reservations)
    .values({
      trackingCode,
      kind,
      roomId,
      serviceId,
      stayPackageId,
      stayPackageName,
      stayPackagePrice,
      itemName,
      guestName,
      phone,
      email,
      nationalId,
      guests,
      checkIn,
      checkOut: kind === "room" ? checkOut : null,
      timeSlot: kind === "service" ? timeSlot : "",
      nights,
      totalPrice: total,
      extraGuestFee,
      promoCode,
      discount,
      options,
      optionsTotal,
      nightly,
      depositAmount: deposit,
      notes,
      status: "pending_payment",
    })
    .returning();

  after(async () => {
    await linkReservationCustomer(created).catch(() => null);
    await notifyAdmins(created, "request");
    await notifyGuest(created, "guest_request");
  });

  revalidatePath("/admin");
  await grantPublicAccess("reservation", trackingCode, phone);
  redirect(`/track/${trackingCode}?new=1`);
}

export async function payDeposit(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  const rl = await rateLimit(`pay:${ip}`, 15, 600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };

  const code = s(fd, "code", 20).toUpperCase();
  const phone = s(fd, "phone", 15);
  const method = s(fd, "method") === "gateway" ? "gateway" : "card";
  const ref = s(fd, "ref", 30);
  const giftCode = normalizeGiftCode(fd.get("giftCode"));
  const providerInput = s(fd, "provider");
  const provider = (["zarinpal", "zibal", "saman", "mellat"] as const).find((id) => id === providerInput) as PaymentGatewayId | undefined;

  const [res] = await db.select().from(reservations).where(and(eq(reservations.trackingCode, code), eq(reservations.phone, phone)));
  if (!res || !(await hasPublicAccess("reservation", res.trackingCode, phone))) return { error: "درخواست رزرو یافت نشد." };
  if (res.status !== "pending_payment") return { error: "پیش‌پرداخت این رزرو قبلاً ثبت شده است." };

  if (res.kind === "room" && res.roomId && res.checkOut) {
    const c = await roomConflicts(res.roomId, res.checkIn, res.checkOut, res.id);
    if (c.length) return { error: "متأسفانه در این فاصله اتاق توسط مهمان دیگری رزرو شد. لطفاً با پذیرش تماس بگیرید." };
  }
  if (res.promoCode) {
    const [p] = await db.select().from(promotions).where(eq(promotions.code, res.promoCode));
    if (p && p.maxUses > 0 && (await promoUses(p.code)) >= p.maxUses) return { error: "ظرفیت کد تخفیف این رزرو تکمیل شده است. لطفاً با پذیرش تماس بگیرید." };
  }
  if (res.kind === "service" && res.serviceId) {
    const taken = await bookedSlots(res.serviceId, res.checkIn, res.id);
    if (taken.includes(res.timeSlot)) return { error: "این سانس به‌تازگی رزرو شد. لطفاً با پذیرش تماس بگیرید." };
  }

  let giftUse = 0;
  if (giftCode) {
    const [gift] = await db.select().from(giftCards).where(eq(giftCards.code, giftCode));
    if (!gift || !isUsable(gift)) return { error: "کارت هدیه معتبر نیست، منقضی شده یا مانده‌ای ندارد." };
    giftUse = Math.min(gift.balance, res.depositAmount);
    if (giftUse > 0 && giftUse < res.depositAmount) return { error: "برای استفاده از کارت هدیه، ماندهٔ آن باید کل پیش‌پرداخت را پوشش دهد. پرداخت را بدون کد هدیه ادامه دهید یا با پذیرش تماس بگیرید." };
  }

  if (giftUse === res.depositAmount && giftUse > 0) {
    const used = await redeemGiftCard(giftCode, giftUse, res.id);
    if (used !== giftUse) return { error: "مانده کارت هدیه تغییر کرده است. لطفاً دوباره تلاش کنید." };
    const [updated] = await db.update(reservations)
      .set({ status: "paid", paymentMethod: "giftcard", paymentRef: giftCode, paidAt: new Date(), giftCardCode: giftCode, giftCardAmount: used })
      .where(and(eq(reservations.id, res.id), eq(reservations.status, "pending_payment"))).returning();
    if (!updated) {
      await refundGift(giftCode, used, res.id);
      return { error: "وضعیت رزرو تغییر کرده است؛ صفحه را دوباره بارگذاری کنید." };
    }
    await syncReservationVouchers(updated);
    after(() => notifyAdmins(updated, "paid"));
    revalidatePath(`/track/${code}`);
    revalidatePath("/admin");
    return { ok: true, message: "پیش‌پرداخت با کارت هدیه ثبت شد. پس از تأیید پذیرش، کد رزرو صادر می‌شود." };
  }

  if (method === "card") {
    if (!/^\d{4,20}$/.test(ref)) return { error: "شماره پیگیری / مرجع تراکنش را صحیح وارد کنید." };
    const [updated] = await db.update(reservations).set({ paymentMethod: "card", paymentRef: ref })
      .where(and(eq(reservations.id, res.id), eq(reservations.status, "pending_payment"))).returning();
    if (!updated) return { error: "وضعیت رزرو تغییر کرده است؛ صفحه را دوباره بارگذاری کنید." };
    revalidatePath(`/track/${code}`);
    revalidatePath("/admin");
    return { ok: true, message: "رسید واریز ثبت شد و پس از بررسی مالی، پرداخت در پنل تأیید می‌شود." };
  }

  if (!provider) return { error: "یک درگاه پرداخت فعال را انتخاب کنید." };
  try {
    const redirect = await startReservationPayment(code, phone, provider);
    return { redirect };
  } catch (error) {
    return { error: error instanceof Error ? error.message.slice(0, 250) : "شروع پرداخت ناموفق بود؛ دوباره تلاش کنید." };
  }
}

async function refundGift(code: string, amount: number, reservationId: number) {
  await db.execute(sql`update gift_cards set balance = balance + ${amount}, status = 'active' where code = ${code}`);
  const [g] = await db.select({ id: giftCards.id }).from(giftCards).where(eq(giftCards.code, code));
  if (g) await db.insert(giftCardTx).values({ giftCardId: g.id, amount, reservationId, note: "برگشت مبلغ (ناموفق)" });
}

export async function sendMessage(_prev: FormState, fd: FormData): Promise<FormState> {
  if (cleanText(fd.get("website"))) return { ok: true, message: "پیام شما ارسال شد." }; // honeypot
  const ip = await clientIp();
  const rl = await rateLimit(`contact:${ip}`, 5, 3600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };

  const name = cleanText(fd.get("name"), 80);
  const phone = s(fd, "phone", 20);
  const email = s(fd, "email", 120);
  const subject = cleanText(fd.get("subject"), 120);
  const body = cleanText(fd.get("body"), 3000);
  if (name.length < 2) return { error: "نام خود را وارد کنید." };
  if (!phone && !email) return { error: "یکی از راه‌های ارتباطی (تلفن یا ایمیل) را وارد کنید." };
  if (email && !EMAIL.test(email)) return { error: "ایمیل وارد شده معتبر نیست." };
  if (phone && !/^[\d+\-\s]{7,20}$/.test(phone)) return { error: "شماره تماس معتبر نیست." };
  if (body.length < 5) return { error: "متن پیام خیلی کوتاه است." };
  await db.insert(messages).values({ name, phone, email, subject, body });
  revalidatePath("/admin/messages");
  return { ok: true, message: "پیام شما با موفقیت ارسال شد. به‌زودی با شما تماس می‌گیریم." };
}

export async function lookupReservation(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  const rl = await rateLimit(`lookup:${ip}`, 20, 600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };

  const code = s(fd, "code", 20).toUpperCase();
  const phone = s(fd, "phone", 15);
  if (!code || !phone) return { error: "کد پیگیری و شماره موبایل را وارد کنید." };
  const [res] = await db
    .select({ trackingCode: reservations.trackingCode })
    .from(reservations)
    .where(and(eq(reservations.phone, phone), eq(reservations.trackingCode, code)));
  if (res) { await grantPublicAccess("reservation", res.trackingCode, phone); redirect(`/track/${res.trackingCode}`); }
  const [byRes] = await db
    .select({ trackingCode: reservations.trackingCode })
    .from(reservations)
    .where(and(eq(reservations.phone, phone), eq(reservations.reservationCode, code)));
  if (!byRes) return { error: "رزروی با این مشخصات یافت نشد." };
  await grantPublicAccess("reservation", byRes.trackingCode, phone);
  redirect(`/track/${byRes.trackingCode}`);
}

export async function submitReview(_prev: FormState, fd: FormData): Promise<FormState> {
  const ip = await clientIp();
  const rl = await rateLimit(`review:${ip}`, 6, 3600);
  if (!rl.ok) return { error: retryMessage(rl.retryAfter) };
  const code = s(fd, "code", 20).toUpperCase();
  const phone = s(fd, "phone", 15);
  const rating = Math.min(5, Math.max(1, Number(s(fd, "rating")) || 5));
  const body = cleanText(fd.get("body"), 1200);
  const city = cleanText(fd.get("city"), 40);
  if (!code || !phone) return { error: "کد رزرو و شماره موبایل را وارد کنید." };
  if (body.length < 15) return { error: "لطفاً تجربه خود را کمی کامل‌تر بنویسید (حداقل ۱۵ کاراکتر)." };
  const [res] = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.phone, phone), eq(reservations.reservationCode, code), eq(reservations.status, "confirmed")));
  if (!res) return { error: "رزرو قطعی با این کد رزرو و شماره موبایل یافت نشد." };
  const ended = res.kind === "room" ? (res.checkOut ?? res.checkIn) <= todayISO() || !!res.checkedOutAt : res.checkIn <= todayISO();
  if (!ended) return { error: "ثبت نظر پس از پایان اقامت شما فعال می‌شود." };
  const [dup] = await db.select({ id: testimonials.id }).from(testimonials).where(eq(testimonials.reservationId, res.id));
  if (dup) return { error: "برای این رزرو قبلاً نظر ثبت شده است. سپاسگزاریم!" };
  await db.insert(testimonials).values({ name: res.guestName.slice(0, 80), city, rating, body, isApproved: false, reservationId: res.id });
  revalidatePath("/admin", "layout");
  return { ok: true, message: "نظر شما ثبت شد و پس از تأیید مدیریت در سایت نمایش داده می‌شود. از همراهی شما سپاسگزاریم!" };
}
