import { and, eq, inArray, lt, gt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { reservations } from "@/db/schema";

export const BLOCKING = ["paid", "confirmed"] as const;

export async function roomConflicts(
  roomId: number,
  checkIn: string,
  checkOut: string,
  excludeId?: number,
) {
  const conds = [
    eq(reservations.kind, "room"),
    eq(reservations.roomId, roomId),
    inArray(reservations.status, [...BLOCKING]),
    lt(reservations.checkIn, checkOut),
    gt(reservations.checkOut, checkIn),
  ];
  if (excludeId) conds.push(ne(reservations.id, excludeId));
  return db.select({ id: reservations.id }).from(reservations).where(and(...conds));
}

export async function bookedRoomRanges(roomId: number) {
  return db
    .select({ checkIn: reservations.checkIn, checkOut: reservations.checkOut })
    .from(reservations)
    .where(
      and(
        eq(reservations.kind, "room"),
        eq(reservations.roomId, roomId),
        inArray(reservations.status, [...BLOCKING]),
        sql`${reservations.checkOut} >= CURRENT_DATE`,
      ),
    );
}

export async function bookedSlots(serviceId: number, date: string, excludeId?: number) {
  const conds = [
    eq(reservations.kind, "service"),
    eq(reservations.serviceId, serviceId),
    eq(reservations.checkIn, date),
    inArray(reservations.status, [...BLOCKING]),
  ];
  if (excludeId) conds.push(ne(reservations.id, excludeId));
  const rows = await db
    .select({ slot: reservations.timeSlot })
    .from(reservations)
    .where(and(...conds));
  return rows.map((r) => r.slot);
}
