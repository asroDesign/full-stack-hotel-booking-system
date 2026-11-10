import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, gt, inArray, lt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { giftCards, giftCardTx, paymentTransactions, reservations, rooms, services, type PaymentCallbackData, type PaymentGatewayId } from "@/db/schema";
import { getSettingsFresh } from "@/lib/data";
import { getPaymentGatewayOptions } from "@/lib/payment-gateways";
import { createGatewayPayment, getPaymentAppOrigin, type GatewayRedirect } from "@/lib/payment-providers";
import { addDaysISO, todayISO } from "@/lib/utils";
import { createVoucher, dateToISO, syncReservationVouchers } from "@/lib/accounting";
import { sendText } from "@/lib/sms";
import { formatJalali, formatPrice } from "@/lib/utils";

export type PaymentResult = { status: "success" | "processing" | "failed" | "needs_refund"; trackingCode?: string; giftCardId?: number };

export function createPaymentCallbackToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

export async function isValidPaymentCallbackToken(id: number, provider: PaymentGatewayId, token: string) {
  if (!token || token.length > 128) return false;
  const [payment] = await db.select({ hash: paymentTransactions.callbackTokenHash })
    .from(paymentTransactions).where(and(eq(paymentTransactions.id, id), eq(paymentTransactions.provider, provider))).limit(1);
  if (!payment?.hash || !/^[a-f0-9]{64}$/.test(payment.hash)) return false;
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(payment.hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function findPaymentByAuthority(authority: string, provider: PaymentGatewayId) {
  const [payment] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.authority, authority), eq(paymentTransactions.provider, provider))).limit(1);
  return payment ?? null;
}

export async function findPaymentById(id: number, provider: PaymentGatewayId) {
  const [payment] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.id, id), eq(paymentTransactions.provider, provider))).limit(1);
  return payment ?? null;
}

export async function savePaymentCallbackData(id: number, data: PaymentCallbackData) {
  await db.update(paymentTransactions).set({ callbackData: data, updatedAt: new Date() })
    .where(and(eq(paymentTransactions.id, id), inArray(paymentTransactions.status, ["initiated", "verifying", "expired"])));
}

export async function failPaymentAttempt(id: number) {
  await db.update(paymentTransactions).set({ status: "failed", updatedAt: new Date() })
    .where(and(eq(paymentTransactions.id, id), inArray(paymentTransactions.status, ["creating", "initiated"])));
}

async function createAttempt(provider: PaymentGatewayId, owner: { reservationId: number } | { giftCardId: number }, amount: number, description: string, phone: string, email: string) {
  const settings = await getSettingsFresh();
  if (!getPaymentGatewayOptions(settings).some((gateway) => gateway.id === provider)) throw new Error("درگاه انتخاب‌شده فعال یا پیکربندی نشده است.");
  if (!Number.isSafeInteger(amount) || amount < 1000) throw new Error("مبلغ پرداخت معتبر نیست.");
  const origin = getPaymentAppOrigin();
  const callbackToken = createPaymentCallbackToken();
  const now = new Date();
  const expiredBefore = new Date(now.getTime() - 20 * 60 * 1000);

  const attempt = await db.transaction(async (tx) => {
    let reservation: typeof reservations.$inferSelect | undefined;
    if ("reservationId" in owner) {
      [reservation] = await tx.select().from(reservations).where(eq(reservations.id, owner.reservationId)).for("update");
      if (!reservation || reservation.status !== "pending_payment") throw new Error("رزرو در انتظار پیش‌پرداخت یافت نشد.");
    } else {
      const [gift] = await tx.select().from(giftCards).where(eq(giftCards.id, owner.giftCardId)).for("update");
      if (!gift || gift.status !== "pending_payment") throw new Error("سفارش کارت هدیه در انتظار پرداخت یافت نشد.");
      if (gift.initialAmount !== amount) throw new Error("مبلغ سفارش تغییر کرده است؛ صفحه را تازه‌سازی کنید.");
    }

    const ownerFilter = "reservationId" in owner
      ? eq(paymentTransactions.reservationId, owner.reservationId)
      : eq(paymentTransactions.giftCardId, owner.giftCardId);
    await tx.update(paymentTransactions).set({ status: "expired", updatedAt: now }).where(and(
      ownerFilter,
      inArray(paymentTransactions.status, ["creating", "initiated", "verifying"]),
      lt(paymentTransactions.updatedAt, expiredBefore),
    ));
    const [active] = await tx.select({ id: paymentTransactions.id }).from(paymentTransactions).where(and(
      ownerFilter,
      inArray(paymentTransactions.status, ["creating", "initiated", "verifying"]),
    )).limit(1);
    if (active) throw new Error("یک تلاش پرداخت دیگر هنوز فعال است؛ چند دقیقه صبر کنید و دوباره بررسی کنید.");

    const [payment] = await tx.insert(paymentTransactions).values({
      ...owner,
      provider,
      amount,
      callbackTokenHash: callbackToken.hash,
      status: "creating",
    }).returning();
    return { payment, reservation };
  });

  try {
    const redirect = await createGatewayPayment(provider, settings, {
      paymentId: attempt.payment.id,
      amountToman: amount,
      callbackToken: callbackToken.token,
      origin,
      trackingCode: attempt.reservation?.trackingCode ?? `GC-${"giftCardId" in owner ? owner.giftCardId : ""}`,
      description,
      phone,
      email: email || null,
    });
    const [saved] = await db.update(paymentTransactions).set({ authority: redirect.authority, status: "initiated", updatedAt: new Date() })
      .where(and(eq(paymentTransactions.id, attempt.payment.id), eq(paymentTransactions.status, "creating"))).returning({ id: paymentTransactions.id });
    if (!saved) throw new Error("ثبت شناسهٔ تراکنش درگاه انجام نشد.");
    return redirect;
  } catch (error) {
    await db.update(paymentTransactions).set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(paymentTransactions.id, attempt.payment.id), eq(paymentTransactions.status, "creating")));
    throw error;
  }
}

export async function startReservationPayment(code: string, phone: string, provider: PaymentGatewayId): Promise<GatewayRedirect> {
  const [reservation] = await db.select().from(reservations).where(and(eq(reservations.trackingCode, code), eq(reservations.phone, phone))).limit(1);
  if (!reservation || reservation.status !== "pending_payment") throw new Error("رزرو در وضعیت پرداخت نیست.");
  return createAttempt(provider, { reservationId: reservation.id }, reservation.depositAmount, `پیش‌پرداخت رزرو ${reservation.trackingCode}`, phone, reservation.email);
}

export async function startGiftCardPayment(id: number, phone: string, provider: PaymentGatewayId): Promise<GatewayRedirect> {
  const [gift] = await db.select().from(giftCards).where(and(eq(giftCards.id, id), eq(giftCards.purchaserPhone, phone))).limit(1);
  if (!gift || gift.status !== "pending_payment") throw new Error("سفارش کارت هدیه در وضعیت پرداخت نیست.");
  return createAttempt(provider, { giftCardId: gift.id }, gift.initialAmount, `خرید کارت هدیه ${gift.id}`, phone, "");
}

export async function verifyAndSettlePayment(id: number, provider: PaymentGatewayId, callback?: PaymentCallbackData): Promise<PaymentResult> {
  const [payment] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1);
  if (!payment || payment.provider !== provider || !payment.authority) return { status: "failed" };
  if (payment.status === "success") {
    if (payment.reservationId) {
      const [reservation] = await db.select({ trackingCode: reservations.trackingCode }).from(reservations).where(eq(reservations.id, payment.reservationId)).limit(1);
      return { status: "success", trackingCode: reservation?.trackingCode };
    }
    return { status: "success", giftCardId: payment.giftCardId ?? undefined };
  }
  if (payment.status === "needs_refund") return { status: "needs_refund", giftCardId: payment.giftCardId ?? undefined };
  if (!["initiated", "verifying", "expired"].includes(payment.status)) return { status: "failed" };

  const staleBefore = new Date(Date.now() - 30_000);
  const [claimed] = await db.update(paymentTransactions).set({ status: "verifying", updatedAt: new Date() }).where(and(
    eq(paymentTransactions.id, id),
    or(eq(paymentTransactions.status, "initiated"), eq(paymentTransactions.status, "expired"), and(eq(paymentTransactions.status, "verifying"), lt(paymentTransactions.updatedAt, staleBefore))),
  )).returning();
  if (!claimed) {
    const [fresh] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1);
    return fresh?.status === "success" ? { status: "success", giftCardId: fresh.giftCardId ?? undefined } : { status: fresh?.status === "needs_refund" ? "needs_refund" : "processing", giftCardId: fresh?.giftCardId ?? undefined };
  }
  const authority = claimed.authority;
  if (!authority) {
    await db.update(paymentTransactions).set({ status: "failed", updatedAt: new Date() })
      .where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.status, "verifying")));
    return { status: "failed" };
  }

  let refCode: string;
  try {
    const settings = await getSettingsFresh();
    const { verifyGatewayPayment } = await import("@/lib/payment-providers");
    refCode = await verifyGatewayPayment(provider, settings, {
      paymentId: claimed.id,
      amountToman: claimed.amount,
      authority,
      callback: callback ?? claimed.callbackData,
    });
  } catch (error) {
    await db.update(paymentTransactions).set({ status: "initiated", updatedAt: new Date() })
      .where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.status, "verifying")));
    throw error;
  }

  const safeRefCode = refCode.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120) || authority;
  const giftSettings = claimed.giftCardId ? await getSettingsFresh() : null;
  const outcome = await db.transaction(async (tx) => {
    const [freshPayment] = await tx.select().from(paymentTransactions).where(eq(paymentTransactions.id, claimed.id)).for("update");
    if (!freshPayment) return { status: "failed" as const };
    if (freshPayment.status === "success") return { status: "success" as const, reservationId: freshPayment.reservationId ?? undefined, giftCardId: freshPayment.giftCardId ?? undefined };
    if (freshPayment.status !== "verifying") return { status: "processing" as const };

    if (freshPayment.reservationId) {
      const [reservation] = await tx.select().from(reservations).where(eq(reservations.id, freshPayment.reservationId)).for("update");
      if (!reservation || reservation.status !== "pending_payment" || reservation.depositAmount !== freshPayment.amount) {
        await tx.update(paymentTransactions).set({ status: "needs_refund", refCode: safeRefCode, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, claimed.id));
        if (reservation) {
          const note = `پرداخت اینترنتی ${safeRefCode} انجام شده اما وضعیت یا مبلغ رزرو با پرداخت سازگار نبود؛ استرداد بررسی شود.`;
          await tx.update(reservations).set({ adminNote: `${reservation.adminNote ? `${reservation.adminNote}\n` : ""}${note}`.slice(0, 4000) }).where(eq(reservations.id, reservation.id));
        }
        return { status: "needs_refund" as const, reservationId: reservation?.id };
      }
      if (reservation.kind === "room" && reservation.roomId && reservation.checkOut) {
        const [room] = await tx.select({ id: rooms.id }).from(rooms).where(eq(rooms.id, reservation.roomId)).for("update");
        const [conflict] = await tx.select({ id: reservations.id }).from(reservations).where(and(
          eq(reservations.kind, "room"), eq(reservations.roomId, reservation.roomId), ne(reservations.id, reservation.id),
          inArray(reservations.status, ["paid", "confirmed"]), lt(reservations.checkIn, reservation.checkOut), gt(reservations.checkOut, reservation.checkIn),
        )).limit(1);
        if (!room || conflict) {
          const note = `پرداخت اینترنتی ${safeRefCode} تأیید شد اما اتاق در این بازه رزرو دیگری دارد؛ استرداد بررسی شود.`;
          await tx.update(paymentTransactions).set({ status: "needs_refund", refCode: safeRefCode, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, claimed.id));
          await tx.update(reservations).set({ adminNote: `${reservation.adminNote ? `${reservation.adminNote}\n` : ""}${note}`.slice(0, 4000) }).where(eq(reservations.id, reservation.id));
          return { status: "needs_refund" as const, reservationId: reservation.id };
        }
      } else if (reservation.kind === "service" && reservation.serviceId) {
        const [service] = await tx.select({ id: services.id }).from(services).where(eq(services.id, reservation.serviceId)).for("update");
        const [conflict] = await tx.select({ id: reservations.id }).from(reservations).where(and(
          eq(reservations.kind, "service"), eq(reservations.serviceId, reservation.serviceId), eq(reservations.checkIn, reservation.checkIn),
          eq(reservations.timeSlot, reservation.timeSlot), ne(reservations.id, reservation.id), inArray(reservations.status, ["paid", "confirmed"]),
        )).limit(1);
        if (!service || conflict) {
          const note = `پرداخت اینترنتی ${safeRefCode} تأیید شد اما این سانس رزرو دیگری دارد؛ استرداد بررسی شود.`;
          await tx.update(paymentTransactions).set({ status: "needs_refund", refCode: safeRefCode, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, claimed.id));
          await tx.update(reservations).set({ adminNote: `${reservation.adminNote ? `${reservation.adminNote}\n` : ""}${note}`.slice(0, 4000) }).where(eq(reservations.id, reservation.id));
          return { status: "needs_refund" as const, reservationId: reservation.id };
        }
      }
      await tx.update(reservations).set({ status: "paid", paymentMethod: provider, paymentRef: safeRefCode, paidAt: new Date() }).where(eq(reservations.id, reservation.id));
      await tx.update(paymentTransactions).set({ status: "success", refCode: safeRefCode, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, claimed.id));
      return { status: "success" as const, reservationId: reservation.id };
    }

    const [gift] = freshPayment.giftCardId ? await tx.select().from(giftCards).where(eq(giftCards.id, freshPayment.giftCardId)).for("update") : [];
    if (!gift || gift.status !== "pending_payment" || gift.initialAmount !== freshPayment.amount) {
      await tx.update(paymentTransactions).set({ status: "needs_refund", refCode: safeRefCode, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, claimed.id));
      return { status: "needs_refund" as const, giftCardId: gift?.id };
    }
    const validMonths = Math.max(1, Number(giftSettings?.giftCardValidMonths) || 12);
    const expiry = gift.expiresAt ?? addDaysISO(todayISO(), validMonths * 30);
    await tx.update(giftCards).set({ status: "active", balance: gift.initialAmount, paidAt: new Date(), expiresAt: expiry, paymentMethod: provider, paymentRef: safeRefCode }).where(eq(giftCards.id, gift.id));
    await tx.insert(giftCardTx).values({ giftCardId: gift.id, amount: gift.initialAmount, note: "صدور و فعال‌سازی کارت پس از تأیید درگاه" });
    await tx.update(paymentTransactions).set({ status: "success", refCode: safeRefCode, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, claimed.id));
    return { status: "success" as const, giftCardId: gift.id, gift };
  });

  if (outcome.status === "success" && outcome.reservationId) {
    await syncReservationVouchers(outcome.reservationId).catch((error) => console.error("[payment] reservation accounting sync failed", error));
    const [reservation] = await db.select({ trackingCode: reservations.trackingCode }).from(reservations).where(eq(reservations.id, outcome.reservationId)).limit(1);
    return { status: "success", trackingCode: reservation?.trackingCode };
  }
  if (outcome.status === "success" && outcome.giftCardId && "gift" in outcome && outcome.gift) {
    const gift = outcome.gift;
    try {
      if (gift.issuedBy !== "complimentary") await createVoucher({
        date: dateToISO(new Date()),
        description: `فروش کارت هدیه ${gift.code} - ${gift.purchaserName}`,
        source: "giftcard",
        sourceType: "sale",
        createdBy: "سیستم",
        lines: [
          { code: "110202", debit: gift.initialAmount, credit: 0, description: `مرجع ${safeRefCode}` },
          { code: "220102", debit: 0, credit: gift.initialAmount },
        ],
      });
      const settings = await getSettingsFresh();
      const target = gift.recipientPhone || gift.purchaserPhone;
      if (target) await sendText(target, `${gift.recipientName || gift.purchaserName} عزیز، کارت هدیه ${settings.hotelName} به مبلغ ${formatPrice(gift.initialAmount)} تومان برای شما صادر شد. کد: ${gift.code} - اعتبار تا ${formatJalali(gift.expiresAt)}`, { event: "giftcard" });
    } catch (error) { console.error("[payment] gift card follow-up failed", error); }
  }
  return outcome.status === "needs_refund" ? { status: "needs_refund", trackingCode: undefined, giftCardId: "giftCardId" in outcome ? outcome.giftCardId : undefined } : outcome;
}
