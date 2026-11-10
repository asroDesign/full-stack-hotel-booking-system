import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { roomDailyPrices, rooms, specialDays, type Room, type RoomDailyPrice } from "@/db/schema";

export type NightlyRate = { date: string; price: number; label: string };

const roundPrice = (value: number) => Math.max(0, Math.round(value / 10000) * 10000);

export function dateRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return dates;
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

export async function getRoomRates(
  room: Pick<Room, "id" | "pricePerNight">,
  checkIn: string,
  checkOut: string,
): Promise<{ nights: number; total: number; breakdown: NightlyRate[] }> {
  const nights = dateRange(checkIn, checkOut);
  if (nights.length === 0) return { nights: 0, total: 0, breakdown: [] };

  const overrides = await db
    .select()
    .from(roomDailyPrices)
    .where(
      and(
        eq(roomDailyPrices.roomId, room.id),
        gte(roomDailyPrices.date, nights[0]),
        lte(roomDailyPrices.date, nights[nights.length - 1]),
      ),
    );
  const map = new Map(overrides.map((row) => [row.date, row]));
  const breakdown = nights.map((date) => {
    const override = map.get(date);
    return {
      date,
      price: override ? override.price : room.pricePerNight,
      label: override ? override.label : "base",
    };
  });
  return { nights: nights.length, total: breakdown.reduce((sum, item) => sum + item.price, 0), breakdown };
}

export async function getDailyPricesForRooms(roomIds: number[], from: string, to: string): Promise<RoomDailyPrice[]> {
  if (roomIds.length === 0) return [];
  return db
    .select()
    .from(roomDailyPrices)
    .where(
      and(inArray(roomDailyPrices.roomId, roomIds), gte(roomDailyPrices.date, from), lte(roomDailyPrices.date, to)),
    )
    .orderBy(asc(roomDailyPrices.date));
}

export async function bulkSetPrices(input: {
  roomIds: number[];
  dates: string[];
  price?: number | null;
  percent?: number | null;
  label: string;
  note?: string;
}): Promise<{ updated: number }> {
  if (input.roomIds.length === 0 || input.dates.length === 0) return { updated: 0 };
  const roomRows = await db.select().from(rooms).where(inArray(rooms.id, input.roomIds));
  const roomMap = new Map(roomRows.map((room) => [room.id, room]));
  const existing = await getDailyPricesForRooms(input.roomIds, input.dates[0], input.dates[input.dates.length - 1]);
  const existingMap = new Map(existing.map((row) => [`${row.roomId}:${row.date}`, row]));

  const values: (typeof roomDailyPrices.$inferInsert)[] = [];
  input.roomIds.forEach((roomId) => {
    const room = roomMap.get(roomId);
    if (!room) return;
    input.dates.forEach((date) => {
      const current = existingMap.get(`${roomId}:${date}`);
      const base = current?.price ?? room.pricePerNight;
      const nextPrice =
        typeof input.price === "number" && input.price > 0
          ? roundPrice(input.price)
          : typeof input.percent === "number" && input.percent !== 0
            ? roundPrice(base * (1 + input.percent / 100))
            : base;
      values.push({
        roomId,
        date,
        price: nextPrice,
        label: input.label || "custom",
        note: input.note ?? "",
      });
    });
  });

  if (values.length === 0) return { updated: 0 };
  for (const chunk of chunkArray(values, 400)) {
    await db
      .insert(roomDailyPrices)
      .values(chunk)
      .onConflictDoUpdate({
        target: [roomDailyPrices.roomId, roomDailyPrices.date],
        set: {
          price: sql`excluded.price`,
          label: sql`excluded.label`,
          note: sql`excluded.note`,
        },
      });
  }
  return { updated: values.length };
}


function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) chunks.push(items.slice(index, index + size));
  return chunks;
}

export async function listSpecialDays(from?: string, to?: string) {
  const filters = [];
  if (from) filters.push(gte(specialDays.date, from));
  if (to) filters.push(lte(specialDays.date, to));
  return db
    .select()
    .from(specialDays)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(specialDays.date));
}

export async function upsertSpecialDay(input: { date: string; title: string; kind: string; percent: number }) {
  const existing = await db.select().from(specialDays).where(eq(specialDays.date, input.date)).limit(1);
  if (existing[0]) {
    const updated = await db.update(specialDays).set(input).where(eq(specialDays.id, existing[0].id)).returning();
    return updated[0];
  }
  const inserted = await db.insert(specialDays).values(input).returning();
  return inserted[0];
}

export async function deleteSpecialDay(id: number) {
  await db.delete(specialDays).where(eq(specialDays.id, id));
}

/** Applies peak/holiday pricing to all priced rooms in a date range. */
export async function applySpecialDaysToRooms(input: {
  from: string;
  to: string;
  roomIds?: number[];
  percent?: number;
}): Promise<{ days: number; updated: number }> {
  const days = await listSpecialDays(input.from, input.to);
  if (days.length === 0) return { days: 0, updated: 0 };

  const roomRows = input.roomIds?.length
    ? await db.select().from(rooms).where(inArray(rooms.id, input.roomIds))
    : await db.select().from(rooms).where(eq(rooms.active, true));

  let updated = 0;
  for (const day of days) {
    const percent = input.percent ?? day.percent;
    const result = await bulkSetPrices({
      roomIds: roomRows.map((room) => room.id),
      dates: [day.date],
      percent: percent || 0,
      label: day.kind,
      note: day.title,
    });
    updated += result.updated;
  }
  return { days: days.length, updated };
}
