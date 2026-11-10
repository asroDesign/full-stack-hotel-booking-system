export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, paymentTransactions } from "@/db/schema";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { verifyAndSettlePayment } from "@/lib/payment-service";
import type { PaymentGatewayId } from "@/lib/payment-gateways";

const GATEWAYS: PaymentGatewayId[] = ["zarinpal", "zibal", "saman", "mellat"];

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`booking-payment-recheck:${clientIp(request)}`, 6, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);
  try {
    const { code } = await params;
    const [booking] = await db.select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(eq(bookings.trackingCode, code))
      .limit(1);
    if (!booking) return NextResponse.json({ error: "رزروی با این کد یافت نشد." }, { status: 404 });
    if (!["pending_payment", "rejected"].includes(booking.status)) {
      return NextResponse.json({ error: "این رزرو برای پرداخت دوباره در وضعیت مناسبی نیست." }, { status: 409 });
    }
    const [payment] = await db.select().from(paymentTransactions).where(and(
      eq(paymentTransactions.bookingId, booking.id),
      inArray(paymentTransactions.status, ["initiated", "verifying", "expired"]),
    )).orderBy(desc(paymentTransactions.createdAt)).limit(1);
    if (!payment || !GATEWAYS.includes(payment.provider as PaymentGatewayId)) {
      return NextResponse.json({ error: "تراکنش در حال بررسی برای این رزرو یافت نشد." }, { status: 404 });
    }
    const result = await verifyAndSettlePayment(payment.id, payment.provider as PaymentGatewayId);
    return NextResponse.json({ status: result.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/bookings/pay/recheck] error", error);
    return NextResponse.json({ error: "بررسی تراکنش انجام نشد؛ کمی بعد دوباره تلاش کنید." }, { status: 502 });
  }
}
