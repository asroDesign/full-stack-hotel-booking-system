import { NextResponse } from "next/server";
import { and, eq, gt, inArray, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings } from "@/db/schema";
import { getPoolSlots, getRoomById, getRooms, getSettings } from "@/lib/data";
import { nightsBetween, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizeDate(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const trimmed = value.trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : fallback;
}

/**
 * GET /api/availability
 * Query params: roomId?, checkIn?, checkOut?, date?, slotId?, excludeBookingId?
 * Returns availability for a single room, all rooms, or pool time slots.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkIn = normalizeDate(searchParams.get("checkIn") ?? searchParams.get("from"), todayISO());
    const checkOut = normalizeDate(
      searchParams.get("checkOut") ?? searchParams.get("to"),
      new Date(new Date(checkIn).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    );
    const roomIdParam = searchParams.get("roomId");
    const dateParam = normalizeDate(searchParams.get("date") ?? searchParams.get("checkIn"), todayISO());
    const slotIdParam = searchParams.get("slotId");
    const excludeBookingId = Number(searchParams.get("excludeBookingId")) || undefined;
    const nights = nightsBetween(checkIn, checkOut);

    if (roomIdParam) {
      const roomId = Number(roomIdParam);
      if (!Number.isFinite(roomId)) {
        return NextResponse.json({ error: "شناسه اتاق نامعتبر است." }, { status: 400 });
      }
      if (nights < 1) {
        return NextResponse.json({ error: "تاریخ خروج باید بعد از تاریخ ورود باشد." }, { status: 400 });
      }
      const room = await getRoomById(roomId);
      if (!room) return NextResponse.json({ error: "اتاق یافت نشد." }, { status: 404 });

      const conditions = [
        eq(bookings.roomId, room.id),
        inArray(bookings.status, ["awaiting_review", "confirmed"]),
        lt(bookings.checkIn, checkOut),
        gt(bookings.checkOut, checkIn),
      ];
      if (excludeBookingId) conditions.push(ne(bookings.id, excludeBookingId));
      const conflicts = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(and(...conditions))
        .limit(5);

      return NextResponse.json({
        available: conflicts.length === 0,
        roomId: room.id,
        roomName: room.name,
        checkIn,
        checkOut,
        nights,
        conflictingBookings: conflicts.length,
      });
    }

    if (slotIdParam) {
      const [slots, settings] = await Promise.all([getPoolSlots(), getSettings()]);
      const slot = slots.find((item) => item.id === Number(slotIdParam));
      if (!slot) return NextResponse.json({ error: "سانس استخر یافت نشد." }, { status: 404 });
      const sameDay = await db
        .select({ total: sql<number>`count(*)` })
        .from(bookings)
        .where(
          and(
            eq(bookings.poolSlotId, slot.id),
            eq(bookings.checkIn, dateParam),
            inArray(bookings.status, ["awaiting_review", "confirmed"]),
          ),
        );
      const taken = Number(sameDay[0]?.total ?? 0);
      return NextResponse.json({
        available: taken === 0,
        slotId: slot.id,
        label: slot.label,
        price: slot.price,
        capacity: slot.capacity,
        extraGuestFee: slot.extraGuestFee,
        maxCapacity: settings.poolMaxCapacity,
        date: dateParam,
        reservedSessions: taken,
      });
    }

    const [rooms, slots, settings] = await Promise.all([getRooms(), getPoolSlots(), getSettings()]);
    const activeBookings = nights
      ? await db
          .select({ roomId: bookings.roomId, checkIn: bookings.checkIn, checkOut: bookings.checkOut })
          .from(bookings)
          .where(
            and(
              inArray(bookings.status, ["awaiting_review", "confirmed"]),
              lt(bookings.checkIn, checkOut),
              gt(bookings.checkOut, checkIn),
            ),
          )
      : [];
    const busyRoomIds = new Set(activeBookings.map((item) => item.roomId).filter(Boolean));

    return NextResponse.json({
      checkIn,
      checkOut,
      nights,
      totalRooms: rooms.length,
      availableRooms: rooms.filter((room) => !busyRoomIds.has(room.id)).length,
      rooms: rooms.map((room) => ({
        id: room.id,
        name: room.name,
        roomNumber: room.roomNumber,
        capacity: room.capacity,
        pricePerNight: room.pricePerNight,
        available: !busyRoomIds.has(room.id),
        maxGuests: room.capacity + 2,
        extraGuestFee: settings.extraGuestFee,
      })),
      poolSlots: slots.map((slot) => ({
        id: slot.id,
        label: slot.label,
        price: slot.price,
        capacity: slot.capacity,
        extraGuestFee: slot.extraGuestFee,
        maxCapacity: settings.poolMaxCapacity,
      })),
    });
  } catch (error) {
    console.error("[api/availability] error", error);
    return NextResponse.json({ error: "بررسی ظرفیت انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}
