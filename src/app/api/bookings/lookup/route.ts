export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getBookingByTracking } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = (searchParams.get("code") ?? "").trim();
  if (!code) {
    return NextResponse.json({ error: "کد رزرو را وارد کنید." }, { status: 400 });
  }
  const booking = await getBookingByTracking(code);
  if (!booking) {
    return NextResponse.json({ error: "رزروی با این کد یافت نشد." }, { status: 404 });
  }
  return NextResponse.json({
    booking: {
      trackingCode: booking.trackingCode,
      reservationCode: booking.reservationCode,
      status: booking.status,
      guestName: booking.guestName,
    },
  });
}
