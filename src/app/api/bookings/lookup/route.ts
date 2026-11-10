export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getBookingByTracking } from "@/lib/data";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(`booking-lookup:${clientIp(request)}`, 20, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").trim();
  if (!code || code.length > 40) {
    return NextResponse.json({ error: "کد پیگیری معتبر نیست." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  const booking = await getBookingByTracking(code);
  if (!booking) {
    return NextResponse.json({ error: "رزروی با این کد یافت نشد." }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({
    booking: {
      trackingCode: booking.trackingCode,
      reservationCode: booking.reservationCode,
      status: booking.status,
      guestName: booking.guestName,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
