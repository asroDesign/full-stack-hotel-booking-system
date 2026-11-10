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
      return NextResponse.json(
        { error: "برای لغو رزرو قطعی‌شده با پذیرش هتل تماس بگیرید." },
        { status: 400 },
      );
    }
    if (booking.status === "cancelled") {
      return NextResponse.json({ error: "این درخواست قبلاً لغو شده است." }, { status: 400 });
    }
    const updated = await db
      .update(bookings)
      .set({ status: "cancelled", reservationCode: null, updatedAt: new Date() })
      .where(eq(bookings.id, booking.id))
      .returning();
    return NextResponse.json({ booking: updated[0] });
  } catch (error) {
    console.error("[api/bookings/cancel] error", error);
    return NextResponse.json({ error: "لغو درخواست انجام نشد." }, { status: 500 });
  }
}
