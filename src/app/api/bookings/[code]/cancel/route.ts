export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getBookingByTracking } from "@/lib/data";
import { isSameOrigin } from "@/lib/security";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`booking-cancel:${clientIp(request)}`, 10, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);
  try {
    const { code } = await params;
    const booking = await getBookingByTracking(code);
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
      .where(and(eq(bookings.id, booking.id), inArray(bookings.status, ["pending_payment", "awaiting_review"])))
      .returning();
    if (!updated[0]) return NextResponse.json({ error: "وضعیت رزرو تغییر کرده است؛ صفحه را تازه‌سازی کنید." }, { status: 409 });
    return NextResponse.json({ booking: { trackingCode: updated[0].trackingCode, status: updated[0].status } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[api/bookings/cancel] error", error);
    return NextResponse.json({ error: "لغو درخواست انجام نشد." }, { status: 500 });
  }
}
