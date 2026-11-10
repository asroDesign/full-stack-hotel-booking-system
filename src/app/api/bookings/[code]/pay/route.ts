export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { and, eq, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import { bookings, paymentTransactions } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { isSameOrigin } from "@/lib/security";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/runtime-mode";
import { getPaymentGatewayOptions, type PaymentGatewayId } from "@/lib/payment-gateways";
import { createPaymentCallbackToken } from "@/lib/payment-service";
import { createGatewayPayment, getPaymentAppOrigin } from "@/lib/payment-providers";

class PaymentRouteError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function parsePaymentRequest(request: Request) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > 2048) throw new PaymentRouteError("درخواست پرداخت بیش از حد بزرگ است.", 413);
  const reader = request.body?.getReader();
  if (!reader) return {} as { provider?: unknown };
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 2048) {
      await reader.cancel();
      throw new PaymentRouteError("درخواست پرداخت بیش از حد بزرگ است.", 413);
    }
    chunks.push(value);
  }
  if (size === 0) return {} as { provider?: unknown };
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid body");
    return body as { provider?: unknown };
  } catch {
    throw new PaymentRouteError("درخواست پرداخت معتبر نیست.", 400);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`booking-pay:${clientIp(request)}`, 10, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);
  try {
    const { code } = await params;
    const body = await parsePaymentRequest(request);
    const rawProvider = typeof body.provider === "string" ? body.provider : "";
    const provider = (["zarinpal", "zibal", "saman", "mellat"] as const).find((item) => item === rawProvider) as PaymentGatewayId | undefined;
    if (rawProvider && !provider) return NextResponse.json({ error: "درگاه انتخاب‌شده معتبر نیست." }, { status: 400 });
    const settings = await getSettings();
    const enabledGateways = getPaymentGatewayOptions(settings);

    if (!provider) {
      if (!isDemoMode() || enabledGateways.length > 0) return NextResponse.json({ error: "یک درگاه پرداخت فعال را انتخاب کنید." }, { status: 400 });
      const [booking] = await db.select().from(bookings).where(eq(bookings.trackingCode, code)).limit(1);
      if (!booking) return NextResponse.json({ error: "رزروی با این کد یافت نشد." }, { status: 404 });
      if (!["pending_payment", "rejected"].includes(booking.status)) return NextResponse.json({ error: "این رزرو در وضعیت پرداخت نیست." }, { status: 400 });
      const paymentRef = `DEMO-${Date.now().toString().slice(-10)}`;
      const [updated] = await db.update(bookings).set({ status: "awaiting_review", paidAmount: booking.prepaymentAmount, paymentRef, paidAt: new Date(), updatedAt: new Date() })
        .where(and(eq(bookings.id, booking.id), inArray(bookings.status, ["pending_payment", "rejected"]))).returning({ trackingCode: bookings.trackingCode, status: bookings.status, paidAmount: bookings.paidAmount });
      if (!updated) return NextResponse.json({ error: "وضعیت رزرو تغییر کرده است؛ صفحه را تازه‌سازی کنید." }, { status: 409 });
      return NextResponse.json({ demo: true, booking: updated, paymentRef }, { headers: { "Cache-Control": "no-store" } });
    }

    if (!enabledGateways.some((gateway) => gateway.id === provider)) return NextResponse.json({ error: "این درگاه فعال یا پیکربندی نشده است." }, { status: 503 });
    const origin = getPaymentAppOrigin();
    const callbackToken = createPaymentCallbackToken();
    const now = new Date();
    const expiredBefore = new Date(now.getTime() - 20 * 60 * 1000);
    const attempt = await db.transaction(async (tx) => {
      const [booking] = await tx.select().from(bookings).where(eq(bookings.trackingCode, code)).for("update");
      if (!booking) throw new PaymentRouteError("رزروی با این کد یافت نشد.", 404);
      if (!["pending_payment", "rejected"].includes(booking.status)) throw new PaymentRouteError("این رزرو در وضعیت پرداخت نیست.", 400);
      if (!Number.isSafeInteger(booking.prepaymentAmount) || booking.prepaymentAmount < 1000) throw new PaymentRouteError("مبلغ پیش‌پرداخت رزرو معتبر نیست.", 400);
      await tx.update(paymentTransactions).set({ status: "expired", updatedAt: now }).where(and(
        eq(paymentTransactions.bookingId, booking.id),
        inArray(paymentTransactions.status, ["creating", "initiated", "verifying"]),
        lt(paymentTransactions.updatedAt, expiredBefore),
      ));
      const [active] = await tx.select({ id: paymentTransactions.id }).from(paymentTransactions).where(and(
        eq(paymentTransactions.bookingId, booking.id),
        inArray(paymentTransactions.status, ["creating", "initiated", "verifying"]),
      )).limit(1);
      if (active) throw new PaymentRouteError("یک تلاش پرداخت دیگر برای این رزرو هنوز فعال است؛ کمی صبر کنید و دوباره بررسی کنید.", 409);
      const [payment] = await tx.insert(paymentTransactions).values({ bookingId: booking.id, provider, amount: booking.prepaymentAmount, callbackTokenHash: callbackToken.hash, status: "creating" }).returning();
      return { payment, booking };
    });

    try {
      const redirect = await createGatewayPayment(provider, settings, {
        paymentId: attempt.payment.id,
        amountToman: attempt.payment.amount,
        callbackToken: callbackToken.token,
        origin,
        trackingCode: attempt.booking.trackingCode,
        phone: attempt.booking.phone,
        email: attempt.booking.email,
      });
      const [saved] = await db.update(paymentTransactions).set({ authority: redirect.authority, status: "initiated", updatedAt: new Date() })
        .where(and(eq(paymentTransactions.id, attempt.payment.id), eq(paymentTransactions.status, "creating"))).returning({ id: paymentTransactions.id });
      if (!saved) throw new Error("ثبت شناسهٔ تراکنش درگاه انجام نشد.");
      return NextResponse.json({ url: redirect.url, redirectMethod: redirect.redirectMethod, redirectFields: redirect.redirectFields }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      await db.update(paymentTransactions).set({ status: "failed", updatedAt: new Date() }).where(and(eq(paymentTransactions.id, attempt.payment.id), eq(paymentTransactions.status, "creating")));
      throw error;
    }
  } catch (error) {
    if (error instanceof PaymentRouteError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("[api/bookings/pay] error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message.slice(0, 250) : "پرداخت انجام نشد. دوباره تلاش کنید." }, { status: 502 });
  }
}


