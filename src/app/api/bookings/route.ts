export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getPoolSlots, getSettings } from "@/lib/data";
import { createBooking } from "@/lib/booking-logic";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";
import { notifyAdminNewBooking } from "@/lib/sms";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  }
  const limited = rateLimit(`booking:${clientIp(request)}`, 6, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  try {
    const body = await request.json();
    const [settings, slots] = await Promise.all([getSettings(), getPoolSlots()]);
    if (body.serviceType === "pool" && !settings.modulePool) {
      return NextResponse.json({ error: "این هتل استخر ندارد؛ لطفاً رزرو اتاق را انتخاب کنید." }, { status: 400 });
    }
    const result = await createBooking(
      {
        serviceType: body.serviceType === "pool" ? "pool" : "room",
        roomId: body.roomId ? Number(body.roomId) : null,
        poolSlotId: body.poolSlotId ? Number(body.poolSlotId) : null,
        checkIn: String(body.checkIn ?? ""),
        checkOut: String(body.checkOut ?? body.checkIn ?? ""),
        timeSlot: body.timeSlot ?? null,
        adults: Number(body.adults ?? 2),
        children: Number(body.children ?? 0),
        guestName: String(body.guestName ?? ""),
        phone: String(body.phone ?? ""),
        email: body.email ? String(body.email) : null,
        notes: body.notes ? String(body.notes) : null,
        addons: Array.isArray(body.addons) ? body.addons.map(String) : [],
        promoCode: body.promoCode ? String(body.promoCode).slice(0, 40) : null,
      },
      {
        poolSlots: slots,
        poolPrice: settings.poolPrice,
        extraGuestFee: settings.extraGuestFee,
        poolBaseCapacity: settings.poolBaseCapacity,
        poolMaxCapacity: settings.poolMaxCapacity,
      },
    );

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    // Notify the front desk (pattern based SMS). Never blocks the booking.
    await notifyAdminNewBooking(result.booking);

    return NextResponse.json(
      {
        booking: {
          trackingCode: result.booking.trackingCode,
          prepaymentAmount: result.booking.prepaymentAmount,
          totalAmount: result.booking.totalAmount,
          status: result.booking.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/bookings] error", error);
    return NextResponse.json({ error: "خطای سرور. لطفاً دوباره تلاش کنید." }, { status: 500 });
  }
}
