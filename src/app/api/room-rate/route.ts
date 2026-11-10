export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getRoomById, getSettings } from "@/lib/data";
import { getRoomRates } from "@/lib/pricing";
import { nightsBetween } from "@/lib/format";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(`rate:${clientIp(request)}`, 180, 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);
  try {
    const { searchParams } = new URL(request.url);
    const roomId = Number(searchParams.get("roomId"));
    const checkIn = (searchParams.get("checkIn") ?? "").slice(0, 10);
    const checkOut = (searchParams.get("checkOut") ?? "").slice(0, 10);
    if (!Number.isFinite(roomId) || !/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) {
      return NextResponse.json({ error: "پارامترها معتبر نیستند." }, { status: 400 });
    }
    const nights = nightsBetween(checkIn, checkOut);
    if (!Number.isFinite(nights) || nights < 1 || nights > 365) {
      return NextResponse.json({ error: "بازه اقامت باید بین ۱ تا ۳۶۵ شب باشد." }, { status: 400 });
    }
    const [room, settings] = await Promise.all([getRoomById(roomId), getSettings()]);
    if (!room) return NextResponse.json({ error: "اتاق یافت نشد." }, { status: 404 });
    const rates = await getRoomRates(room, checkIn, checkOut);
    return NextResponse.json({
      roomId: room.id,
      nights: rates.nights,
      baseTotal: rates.total,
      breakdown: rates.breakdown,
      standardCapacity: room.capacity,
      maxCapacity: room.maxCapacity,
      extraGuestFee: room.extraGuestFee || settings.extraGuestFee,
      addons: room.addons ?? [],
      prepaymentPercent: room.prepaymentPercent,
    });
  } catch (error) {
    console.error("[api/room-rate]", error);
    return NextResponse.json({ error: "محاسبه نرخ انجام نشد." }, { status: 500 });
  }
}
