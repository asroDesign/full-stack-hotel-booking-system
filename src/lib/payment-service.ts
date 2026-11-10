import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "@/db";
import { bookings, paymentTransactions } from "@/db/schema";
import type { PaymentGatewayId } from "@/lib/payment-gateways";
import { getSettings } from "@/lib/data";
import { verifyGatewayPayment } from "@/lib/payment-providers";

export type PaymentResult = { status: "success" | "processing" | "failed" | "needs_refund"; bookingCode?: string };
export type PaymentCallbackData = {
  refNum?: string;
  terminalId?: string;
  amount?: number;
  saleOrderId?: number;
  saleReferenceId?: number;
};

export function createPaymentCallbackToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

export async function isValidPaymentCallbackToken(id: number, provider: PaymentGatewayId, token: string) {
  if (!token || token.length > 128) return false;
  const [payment] = await db.select({ hash: paymentTransactions.callbackTokenHash })
    .from(paymentTransactions)
    .where(and(eq(paymentTransactions.id, id), eq(paymentTransactions.provider, provider)))
    .limit(1);
  if (!payment?.hash) return false;
  const actual = createHash("sha256").update(token).digest();
  const expected = Buffer.from(payment.hash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function savePaymentCallbackData(id: number, data: PaymentCallbackData) {
  await db.update(paymentTransactions).set({ callbackData: data, updatedAt: new Date() }).where(and(
    eq(paymentTransactions.id, id),
    inArray(paymentTransactions.status, ["initiated", "verifying", "expired"]),
  ));
}

export async function findPaymentByAuthority(authority: string, provider: PaymentGatewayId) {
  const [payment] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.authority, authority), eq(paymentTransactions.provider, provider))).limit(1);
  return payment ?? null;
}

export async function findPaymentById(id: number, provider: PaymentGatewayId) {
  const [payment] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.id, id), eq(paymentTransactions.provider, provider))).limit(1);
  return payment ?? null;
}

export async function failPaymentAttempt(id: number) {
  await db.update(paymentTransactions).set({ status: "failed", updatedAt: new Date() }).where(and(eq(paymentTransactions.id, id), inArray(paymentTransactions.status, ["creating", "initiated"])));
}

export async function verifyAndSettlePayment(id: number, provider: PaymentGatewayId, callback?: {
  refNum?: string;
  terminalId?: string;
  amount?: number;
  saleOrderId?: number;
  saleReferenceId?: number;
}): Promise<PaymentResult> {
  const [payment] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1);
  if (!payment || payment.provider !== provider || !payment.authority) return { status: "failed" };
  if (payment.status === "success") {
    const [booking] = await db.select({ trackingCode: bookings.trackingCode }).from(bookings).where(eq(bookings.id, payment.bookingId)).limit(1);
    return { status: "success", bookingCode: booking?.trackingCode };
  }
  if (payment.status === "needs_refund") return { status: "needs_refund" };
  if (!["initiated", "verifying", "expired"].includes(payment.status)) return { status: "failed" };

  const staleBefore = new Date(Date.now() - 30_000);
  const [claimed] = await db.update(paymentTransactions)
    .set({ status: "verifying", updatedAt: new Date() })
    .where(and(
      eq(paymentTransactions.id, id),
      or(
        eq(paymentTransactions.status, "initiated"),
        eq(paymentTransactions.status, "expired"),
        and(eq(paymentTransactions.status, "verifying"), lt(paymentTransactions.updatedAt, staleBefore)),
      ),
    ))
    .returning();
  if (!claimed) {
    const [fresh] = await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, id)).limit(1);
    if (fresh?.status === "success") {
      const [booking] = await db.select({ trackingCode: bookings.trackingCode }).from(bookings).where(eq(bookings.id, fresh.bookingId)).limit(1);
      return { status: "success", bookingCode: booking?.trackingCode };
    }
    return { status: "processing" };
  }

  let refCode: string;
  try {
    refCode = await verifyGatewayPayment(provider, await getSettings(), {
      paymentId: claimed.id,
      amountToman: claimed.amount,
      authority: claimed.authority!,
      callback: callback ?? claimed.callbackData,
    });
  } catch (error) {
    await db.update(paymentTransactions).set({ status: "initiated", updatedAt: new Date() }).where(and(eq(paymentTransactions.id, claimed.id), eq(paymentTransactions.status, "verifying")));
    throw error;
  }

  const safeRefCode = refCode.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 120) || claimed.authority!;
  return db.transaction(async (tx) => {
    const [booking] = await tx.select().from(bookings).where(eq(bookings.id, claimed.bookingId)).for("update");
    const [freshPayment] = await tx.select().from(paymentTransactions).where(eq(paymentTransactions.id, claimed.id)).for("update");
    if (!freshPayment || freshPayment.status === "success") return { status: "success", bookingCode: booking?.trackingCode };
    if (!booking || !["pending_payment", "rejected"].includes(booking.status)) {
      await tx.update(paymentTransactions).set({ status: "needs_refund", refCode: safeRefCode, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, claimed.id));
      if (booking) {
        const note = `پرداخت اینترنتی ${safeRefCode} انجام شده اما وضعیت رزرو برای ثبت پرداخت مناسب نبود؛ استرداد بررسی شود.`;
        await tx.update(bookings).set({ adminNote: `${booking.adminNote ? `${booking.adminNote}\n` : ""}${note}`.slice(0, 4000), updatedAt: new Date() }).where(eq(bookings.id, booking.id));
      }
      return { status: "needs_refund", bookingCode: booking?.trackingCode };
    }
    await tx.update(paymentTransactions).set({ status: "success", refCode: safeRefCode, verifiedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, claimed.id));
    await tx.update(bookings).set({ status: "awaiting_review", paidAmount: claimed.amount, paymentRef: safeRefCode, paidAt: new Date(), updatedAt: new Date() }).where(eq(bookings.id, booking.id));
    return { status: "success", bookingCode: booking.trackingCode };
  });
}
