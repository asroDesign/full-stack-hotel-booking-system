export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getBookingByTracking } from "@/lib/data";
import { isSameOrigin } from "@/lib/security";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isDemoMode } from "@/lib/runtime-mode";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`booking-pay:${clientIp(request)}`, 10, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);
  if (!isDemoMode()) {
    return NextResponse.json({ error: "درگاه پرداخت واقعی پیکربندی نشده است؛ پرداخت باید توسط پذیرش تأیید شود." }, { status: 503 });
  }
  try {
    const { code } = await params;
    const booking = await getBookingByTracking(code);
    if (!booking) {
      return NextResponse.json({ error: "رزروی با این کد یافت نشد." }, { status: 404 });
    }
    if (booking.status === "confirmed") {
      return NextResponse.json({ error: "این رزرو قبلاً تأیید شده است." }, { status: 400 });
    }
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "این درخواست لغو شده است." }, { status: 400 });
    }
    if (booking.status === "awaiting_review") {
      return NextResponse.json({ error: "پیش‌پرداخت این درخواست قبلاً پرداخت شده است." }, { status: 400 });
    }

    const paymentRef = `ZP-${Date.now().toString().slice(-8)}`;
    const updated = await db
      .update(bookings)
      .set({
        status: "awaiting_review",
        paidAmount: booking.prepaymentAmount,
        paymentRef,
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(bookings.id, booking.id), inArray(bookings.status, ["pending_payment", "rejected"])))
      .returning();
    if (!updated[0]) return NextResponse.json({ error: "وضعیت رزرو تغییر کرده است؛ صفحه را تازه‌سازی کنید." }, { status: 409 });

    return NextResponse.json({
      booking: { trackingCode: updated[0].trackingCode, status: updated[0].status, paidAmount: updated[0].paidAmount },
      paymentRef,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/bookings/pay] error", error);
    return NextResponse.json({ error: "پرداخت انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}


