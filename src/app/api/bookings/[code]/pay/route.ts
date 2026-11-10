export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getBookingByTracking } from "@/lib/data";

export async function POST(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const booking = await getBookingByTracking(decodeURIComponent(code));
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
      .where(eq(bookings.id, booking.id))
      .returning();

    return NextResponse.json({ booking: updated[0], paymentRef });
  } catch (error) {
    console.error("[api/bookings/pay] error", error);
    return NextResponse.json({ error: "پرداخت انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}


