import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, promoCodes, rooms, type BookingAddon, type PoolSlot, type RoomAddon } from "@/db/schema";
import { generateTrackingCode } from "@/lib/auth";
import { nightsBetween, normalizePhone, todayISO } from "@/lib/format";
import { getRoomRates } from "@/lib/pricing";
import { validatePromo } from "@/lib/promo";

export type BookingInput = {
  serviceType: "room" | "pool";
  roomId?: number | null;
  poolSlotId?: number | null;
  checkIn: string;
  checkOut: string;
  timeSlot?: string | null;
  adults: number;
  children: number;
  guestName: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  addons?: string[];
  promoCode?: string | null;
};

export type BookingConfig = {
  poolSlots: PoolSlot[];
  poolPrice: number;
  extraGuestFee: number;
  poolBaseCapacity: number;
  poolMaxCapacity: number;
};

async function consumePromo(code: string | null | undefined): Promise<void> {
  if (!code) return;
  try {
    await db
      .update(promoCodes)
      .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
      .where(eq(promoCodes.code, code));
  } catch (error) {
    console.error("[booking] promo usage update failed", error);
  }
}

export async function isRoomAvailable(
  roomId: number,
  checkIn: string,
  checkOut: string,
  excludeId?: number,
): Promise<boolean> {
  const conditions = [
    eq(bookings.roomId, roomId),
    inArray(bookings.status, ["awaiting_review", "confirmed"]),
    lt(bookings.checkIn, checkOut),
    gt(bookings.checkOut, checkIn),
  ];
  if (excludeId) conditions.push(sql`${bookings.id} <> ${excludeId}`);
  const conflict = await db.select({ id: bookings.id }).from(bookings).where(and(...conditions)).limit(1);
  return conflict.length === 0;
}

function pickAddons(available: RoomAddon[], selected?: string[]): BookingAddon[] {
  if (!selected || selected.length === 0) return [];
  return available
    .filter((addon) => selected.includes(addon.name))
    .map((addon) => ({ name: addon.name, price: Math.max(0, Math.round(addon.price)) }));
}

export async function createBooking(
  input: BookingInput,
  config: BookingConfig,
): Promise<{ ok: true; booking: typeof bookings.$inferSelect } | { ok: false; error: string }> {
  const guestName = input.guestName?.trim();
  const phone = normalizePhone(input.phone ?? "");
  const email = input.email?.trim() || null;
  const notes = input.notes?.trim() || null;

  if (!guestName || guestName.length < 3) return { ok: false, error: "نام و نام خانوادگی معتبر وارد کنید." };
  if (!/^09\d{9}$/.test(phone)) return { ok: false, error: "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "قالب ایمیل صحیح نیست." };

  const checkIn = (input.checkIn ?? "").slice(0, 10);
  const checkOut = (input.checkOut ?? checkIn).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn)) return { ok: false, error: "تاریخ ورود معتبر نیست." };
  if (checkIn < todayISO()) return { ok: false, error: "تاریخ ورود نمی‌تواند در گذشته باشد." };

  const adults = Math.max(1, Number(input.adults) || 1);
  const children = Math.max(0, Number(input.children) || 0);
  const guests = adults + children;

  if (input.serviceType === "room") {
    if (!input.roomId) return { ok: false, error: "اتاق مورد نظر را انتخاب کنید." };
    const roomRows = await db.select().from(rooms).where(eq(rooms.id, Number(input.roomId))).limit(1);
    const room = roomRows[0];
    if (!room || !room.active) return { ok: false, error: "اتاق انتخاب‌شده در دسترس نیست." };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return { ok: false, error: "تاریخ خروج معتبر نیست." };

    const rates = await getRoomRates(room, checkIn, checkOut);
    if (rates.nights < 1) return { ok: false, error: "تاریخ خروج باید بعد از تاریخ ورود باشد." };

    const standardCapacity = room.capacity;
    const maxCapacity = Math.max(room.maxCapacity ?? standardCapacity + 2, standardCapacity);
    if (guests > maxCapacity)
      return { ok: false, error: `حداکثر ظرفیت این اتاق ${maxCapacity} نفر است (ظرفیت استاندارد ${standardCapacity} نفر).` };
    if (!(await isRoomAvailable(room.id, checkIn, checkOut)))
      return { ok: false, error: "این اتاق در بازه انتخابی رزرو شده است. اتاق دیگری انتخاب کنید." };

    const perExtraGuest = room.extraGuestFee > 0 ? room.extraGuestFee : config.extraGuestFee;
    const extraGuests = Math.max(0, guests - standardCapacity);
    const extraFeeTotal = extraGuests * perExtraGuest;
    const addons = pickAddons(room.addons ?? [], input.addons);
    const addonsTotal = addons.reduce((sum, addon) => sum + addon.price, 0);
    const subtotal = rates.total + extraFeeTotal + addonsTotal;
    const promoResult = input.promoCode ? await validatePromo(input.promoCode, { subtotal, nights: rates.nights }) : { ok: false, discount: 0 };
    if (input.promoCode && !promoResult.ok && promoResult.error) {
      return { ok: false, error: promoResult.error };
    }
    const discountAmount = promoResult.ok ? promoResult.discount : 0;
    const total = Math.max(0, subtotal - discountAmount);
    const prepayment = Math.round((total * room.prepaymentPercent) / 100);
    const values = {
      guestName,
      phone,
      email,
      serviceType: "room",
      roomId: room.id,
      serviceLabel: room.name,
      checkIn,
      checkOut,
      nights: rates.nights,
      adults,
      children,
      extraGuests,
      extraGuestFee: perExtraGuest,
      addons,
      addonsTotal,
      promoCode: promoResult.ok ? promoResult.promo?.code ?? null : null,
      discountAmount,
      rateBreakdown: rates.breakdown,
      basePrice: rates.total,
      unitPrice: Math.round(rates.total / Math.max(1, rates.nights)),
      totalAmount: total,
      prepaymentAmount: prepayment,
      notes,
    };

    for (let attempt = 0; attempt < 6; attempt += 1) {
      try {
        const inserted = await db
          .insert(bookings)
          .values({ ...values, trackingCode: generateTrackingCode(), status: "pending_payment" })
          .returning();
        await consumePromo(promoResult.ok ? promoResult.promo?.code : null);
        return { ok: true, booking: inserted[0] };
      } catch (error) {
        if (attempt === 5) {
          console.error("[booking] insert failed", error);
          return { ok: false, error: "ثبت درخواست انجام نشد. لطفاً دوباره تلاش کنید." };
        }
      }
    }
    return { ok: false, error: "ثبت درخواست انجام نشد." };
  }

  const slot =
    config.poolSlots.find((item) => item.id === Number(input.poolSlotId)) ??
    config.poolSlots.find((item) => item.label === input.timeSlot) ??
    config.poolSlots[0];

  if (!slot) return { ok: false, error: "سانس استخر در دسترس نیست. با پذیرش تماس بگیرید." };
  if (guests > config.poolMaxCapacity)
    return { ok: false, error: `حداکثر ظرفیت هر سانس ${config.poolMaxCapacity} نفر است.` };

  const extraGuests = Math.max(0, guests - slot.capacity);
  const extraFeeTotal = extraGuests * slot.extraGuestFee;
  const subtotal = slot.price + extraFeeTotal;
  const promoResult = input.promoCode ? await validatePromo(input.promoCode, { subtotal, nights: 1 }) : { ok: false, discount: 0 };
  if (input.promoCode && !promoResult.ok && promoResult.error) {
    return { ok: false, error: promoResult.error };
  }
  const discountAmount = promoResult.ok ? promoResult.discount : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const prepayment = Math.round((total * 30) / 100);

  const values = {
    guestName,
    phone,
    email,
    serviceType: "pool",
    roomId: null,
    poolSlotId: slot.id,
    serviceLabel: `استخر خانوادگی — سانس ${slot.label}`,
    checkIn,
    checkOut: checkIn,
    timeSlot: slot.label,
    nights: 1,
    adults,
    children,
    extraGuests,
    extraGuestFee: slot.extraGuestFee,
    addons: [] as BookingAddon[],
    addonsTotal: 0,
    promoCode: promoResult.ok ? promoResult.promo?.code ?? null : null,
    discountAmount,
    rateBreakdown: [{ date: checkIn, price: slot.price, label: "pool" }],
    basePrice: slot.price,
    unitPrice: slot.price,
    totalAmount: total,
    prepaymentAmount: prepayment,
    notes,
  };

  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const inserted = await db
        .insert(bookings)
        .values({ ...values, trackingCode: generateTrackingCode(), status: "pending_payment" })
        .returning();
      return { ok: true, booking: inserted[0] };
    } catch (error) {
      if (attempt === 5) {
        console.error("[booking] insert failed", error);
        return { ok: false, error: "ثبت درخواست انجام نشد. لطفاً دوباره تلاش کنید." };
      }
    }
  }
  return { ok: false, error: "ثبت درخواست انجام نشد." };
}

export function nightsCount(checkIn: string, checkOut: string): number {
  return nightsBetween(checkIn, checkOut);
}
