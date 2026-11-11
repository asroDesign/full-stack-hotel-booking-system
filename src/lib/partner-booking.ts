import { and, asc, eq, or, sql } from "drizzle-orm";
import { after } from "next/server";
import { db } from "@/db";
import { reservationGuests, reservations, rooms, type Partner, type Reservation } from "@/db/schema";
import { roomConflicts } from "./availability";
import { quoteRoom } from "./pricing";
import { syncReservationVouchers } from "./accounting";
import { linkReservationCustomer, normalizeMobile } from "./crm";
import { notifyAdmins, notifyGuest } from "./sms";
import { cleanText } from "./security";
import { diffDays, genReservationCode, genTrackingCode, todayISO } from "./utils";
import { notifyReceptionShiftForReservation } from "./hotel-operations";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function serializeReservation(r: Reservation) {
  return {
    trackingCode: r.trackingCode,
    reservationCode: r.reservationCode,
    externalRef: r.externalRef,
    status: r.status,
    roomId: r.roomId,
    room: r.itemName,
    checkIn: r.checkIn,
    checkOut: r.checkOut,
    nights: r.nights,
    guests: r.guests,
    guestName: r.guestName,
    total: r.totalPrice,
    commission: r.commission,
    net: r.totalPrice - r.commission,
    checkedIn: !!r.checkedInAt,
    checkedOut: !!r.checkedOutAt,
    createdAt: r.createdAt,
  };
}

export async function listRooms() {
  const list = await db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(asc(rooms.sortOrder));
  return list.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    capacity: r.capacity,
    maxGuests: r.capacity + r.extraBeds,
    size: r.size,
    view: r.view,
    basePrice: r.pricePerNight,
    extraGuestPrice: r.extraGuestPrice,
    features: r.features,
    image: r.images[0] ?? null,
    options: r.options.map((o) => ({ id: o.id, title: o.title, price: o.price, unit: o.unit, included: o.included })),
  }));
}

export async function partnerAvailability(p: Partner, checkIn: string, checkOut: string, guests: number) {
  if (!ISO.test(checkIn) || !ISO.test(checkOut) || checkOut <= checkIn) return { error: "checkIn / checkOut must be YYYY-MM-DD and checkOut > checkIn" };
  if (checkIn < todayISO()) return { error: "checkIn is in the past" };
  if (diffDays(checkIn, checkOut) > 30) return { error: "maximum stay is 30 nights" };
  const list = await db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(asc(rooms.sortOrder));
  const out = [];
  for (const r of list) {
    if (guests > r.capacity + r.extraBeds) continue;
    const busy = (await roomConflicts(r.id, checkIn, checkOut)).length > 0;
    const q = await quoteRoom(r, checkIn, checkOut, guests, []);
    const commission = Math.round((q.total * p.commissionPercent) / 100);
    out.push({ roomId: r.id, name: r.name, type: r.type, available: !busy, nights: q.nightsCount, total: q.total, commission, net: q.total - commission, nightly: q.nights.map((n) => ({ date: n.date, price: n.price })) });
  }
  return { rooms: out };
}

type CreateInput = {
  roomId?: number;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  externalRef?: string;
  options?: string[];
  notes?: string;
  guest?: { name?: string; phone?: string; email?: string; nationalId?: string };
  companions?: { fullName?: string; idNumber?: string; nationality?: string; phone?: string; relation?: string }[];
};

export async function createPartnerReservation(p: Partner, input: CreateInput): Promise<{ status: number; body: unknown }> {
  const roomId = Number(input.roomId);
  const checkIn = String(input.checkIn ?? "");
  const checkOut = String(input.checkOut ?? "");
  const guests = Math.min(30, Math.max(1, Number(input.guests) || 1));
  const externalRef = cleanText(input.externalRef, 80);
  const name = cleanText(input.guest?.name, 80);
  const phone = normalizeMobile(String(input.guest?.phone ?? ""));
  const err = (code: string, message: string, status = 422) => ({ status, body: { ok: false, error: { code, message } } });
  if (!externalRef) return err("validation", "externalRef is required (your unique booking id)");
  if (!Number.isInteger(roomId) || roomId <= 0) return err("validation", "roomId is required");
  if (!ISO.test(checkIn) || !ISO.test(checkOut) || checkOut <= checkIn) return err("validation", "checkIn / checkOut must be YYYY-MM-DD and checkOut > checkIn");
  if (checkIn < todayISO()) return err("validation", "checkIn is in the past");
  if (diffDays(checkIn, checkOut) > 30) return err("validation", "maximum stay is 30 nights");
  if (name.length < 3) return err("validation", "guest.name is required");
  if (!/^09\d{9}$/.test(phone)) return err("validation", "guest.phone must be an Iranian mobile number (09xxxxxxxxx)");

  const [dup] = await db.select().from(reservations).where(and(eq(reservations.partnerId, p.id), eq(reservations.externalRef, externalRef)));
  if (dup) return { status: 200, body: { ok: true, duplicate: true, reservation: serializeReservation(dup) } };

  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || !room.isActive) return err("not_found", "room not found", 404);
  if (guests > room.capacity + room.extraBeds) return err("capacity", `maximum ${room.capacity + room.extraBeds} guests for this room`);
  const q = await quoteRoom(room, checkIn, checkOut, guests, (input.options ?? []).map(String).slice(0, 20));
  const commission = Math.round((q.total * p.commissionPercent) / 100);
  const confirmed = p.autoConfirm;

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${700_000 + room.id})`);
    const busy = await tx
      .select({ id: reservations.id })
      .from(reservations)
      .where(
        and(
          eq(reservations.kind, "room"),
          eq(reservations.roomId, room.id),
          sql`${reservations.status} in ('paid','confirmed')`,
          sql`${reservations.checkIn} < ${checkOut}`,
          sql`${reservations.checkOut} > ${checkIn}`,
        ),
      );
    if (busy.length) return null;
    const [row] = await tx
      .insert(reservations)
      .values({
        trackingCode: genTrackingCode(),
        reservationCode: confirmed ? genReservationCode() : null,
        kind: "room",
        roomId: room.id,
        itemName: room.name,
        guestName: name,
        phone,
        email: cleanText(input.guest?.email, 120),
        nationalId: cleanText(input.guest?.nationalId, 20),
        guests,
        checkIn,
        checkOut,
        nights: q.nightsCount,
        totalPrice: q.total,
        extraGuestFee: q.extraGuestFee,
        options: q.options,
        optionsTotal: q.optionsTotal,
        nightly: q.nights.map((n) => ({ date: n.date, price: n.price, kind: n.kind })),
        depositAmount: 0,
        paymentMethod: "partner",
        status: confirmed ? "confirmed" : "paid",
        confirmedAt: confirmed ? new Date() : null,
        source: p.type === "agency" ? "agency" : "partner_site",
        partnerId: p.id,
        externalRef,
        commission,
        notes: cleanText(input.notes, 1000),
        adminNote: confirmed ? `ثبت خودکار توسط ${p.name}` : `ثبت توسط ${p.name} — در انتظار تایید`,
      })
      .returning();
    const comps = (input.companions ?? []).slice(0, 20).filter((c) => cleanText(c.fullName, 80));
    if (comps.length)
      await tx.insert(reservationGuests).values(
        comps.map((c) => ({
          reservationId: row.id,
          fullName: cleanText(c.fullName, 80),
          idNumber: cleanText(c.idNumber, 30),
          nationality: cleanText(c.nationality, 40) || "ایرانی",
          phone: cleanText(c.phone, 20),
          relation: cleanText(c.relation, 40),
        })),
      );
    return row;
  });
  if (!created) return err("not_available", "room is not available for the requested dates", 409);
  await syncReservationVouchers(created);
  await linkReservationCustomer(created).catch(() => null);
  await notifyAdmins(created, "paid").catch(() => null);
  after(() => notifyReceptionShiftForReservation(created));
  if (confirmed) await notifyGuest(created, "guest_confirmed").catch(() => null);
  return { status: 201, body: { ok: true, reservation: serializeReservation(created) } };
}

export async function findPartnerReservation(p: Partner, ref: string) {
  const [r] = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.partnerId, p.id), or(eq(reservations.externalRef, ref), eq(reservations.trackingCode, ref), eq(reservations.reservationCode, ref))));
  return r ?? null;
}
