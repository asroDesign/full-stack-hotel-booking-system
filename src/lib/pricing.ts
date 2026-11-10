import { and, eq, gte, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import { calendarDays, roomRates, type Room, type RoomOption, type SelectedOption } from "@/db/schema";
import { sql } from "drizzle-orm";
import { addDaysISO, diffDays, isoToJalali, jalaliToISO, parseISODate, todayISO } from "./utils";

export type DayKind = "normal" | "holiday" | "peak";

export const optionUnitLabel: Record<RoomOption["unit"], string> = {
  per_night: "هر شب",
  per_person_night: "هر نفر / هر شب",
  per_stay: "کل اقامت",
  per_person: "هر نفر (یک‌بار)",
};

export async function getCalendarDays(from: string, to: string) {
  const rows = await db
    .select()
    .from(calendarDays)
    .where(and(gte(calendarDays.date, from), lte(calendarDays.date, to)));
  return new Map(rows.map((r) => [r.date, r]));
}

export async function getRoomOverrides(roomId: number, from: string, to: string) {
  const rows = await db
    .select({ date: roomRates.date, price: roomRates.price })
    .from(roomRates)
    .where(and(eq(roomRates.roomId, roomId), gte(roomRates.date, from), lte(roomRates.date, to)));
  return new Map(rows.map((r) => [r.date, r.price]));
}

type PriceRoom = Pick<Room, "pricePerNight" | "holidayPrice" | "peakPrice">;

export function resolveNight(
  room: PriceRoom,
  date: string,
  days: Map<string, { kind: "holiday" | "peak"; title: string }>,
  overrides: Map<string, number>,
) {
  const d = days.get(date);
  const kind: DayKind = d?.kind ?? "normal";
  const override = overrides.get(date);
  let price = room.pricePerNight;
  let source: "base" | "holiday" | "peak" | "custom" = "base";
  if (kind === "holiday" && room.holidayPrice > 0) {
    price = room.holidayPrice;
    source = "holiday";
  } else if (kind === "peak" && room.peakPrice > 0) {
    price = room.peakPrice;
    source = "peak";
  }
  if (override !== undefined) {
    price = override;
    source = "custom";
  }
  return { date, price, kind, title: d?.title ?? "", source };
}

/** Effective nightly prices for a date range (inclusive) – used by calendars. */
export async function roomPriceMap(room: Room, from: string, to: string) {
  const [days, overrides] = await Promise.all([getCalendarDays(from, to), getRoomOverrides(room.id, from, to)]);
  const out: ReturnType<typeof resolveNight>[] = [];
  for (let d = from; d <= to; d = addDaysISO(d, 1)) out.push(resolveNight(room, d, days, overrides));
  return out;
}

export function optionAmount(o: RoomOption, guests: number, nights: number) {
  if (o.included) return 0;
  switch (o.unit) {
    case "per_night":
      return o.price * nights;
    case "per_person_night":
      return o.price * guests * nights;
    case "per_stay":
      return o.price;
    case "per_person":
      return o.price * guests;
  }
}

export type RoomQuote = {
  nights: { date: string; price: number; kind: DayKind; title: string; source: string }[];
  nightsCount: number;
  roomTotal: number;
  extraGuests: number;
  extraGuestFee: number;
  options: SelectedOption[];
  optionsTotal: number;
  total: number;
};

export async function quoteRoom(
  room: Room,
  checkIn: string,
  checkOut: string,
  guests: number,
  optionIds: string[],
): Promise<RoomQuote> {
  const n = diffDays(checkIn, checkOut);
  const lastNight = addDaysISO(checkOut, -1);
  const [days, overrides] = await Promise.all([getCalendarDays(checkIn, lastNight), getRoomOverrides(room.id, checkIn, lastNight)]);
  const nights = [];
  for (let d = checkIn; d < checkOut; d = addDaysISO(d, 1)) nights.push(resolveNight(room, d, days, overrides));
  const roomTotal = nights.reduce((s, x) => s + x.price, 0);
  const extraGuests = Math.max(0, guests - room.capacity);
  const extraGuestFee = extraGuests * room.extraGuestPrice * n;
  const chosen = room.options.filter((o) => o.included || optionIds.includes(o.id));
  const options: SelectedOption[] = chosen.map((o) => ({
    id: o.id,
    title: o.title,
    unit: o.unit,
    price: o.included ? 0 : o.price,
    amount: optionAmount(o, guests, n),
  }));
  const optionsTotal = options.reduce((s, o) => s + o.amount, 0);
  return {
    nights,
    nightsCount: n,
    roomTotal,
    extraGuests,
    extraGuestFee,
    options,
    optionsTotal,
    total: roomTotal + extraGuestFee + optionsTotal,
  };
}

/** Delete overrides older than 60 days to keep the table small. */
export async function pruneOldRates(today: string) {
  await db.delete(roomRates).where(lt(roomRates.date, addDaysISO(today, -60)));
}

export function officialHolidayRows(jy: number) {
  const fixed: [number, number, string][] = [
    [1, 1, "عید نوروز"], [1, 2, "عید نوروز"], [1, 3, "عید نوروز"], [1, 4, "عید نوروز"],
    [1, 12, "روز جمهوری اسلامی"], [1, 13, "روز طبیعت"],
    [3, 14, "رحلت امام خمینی"], [3, 15, "قیام ۱۵ خرداد"],
    [11, 22, "پیروزی انقلاب اسلامی"], [12, 29, "ملی شدن صنعت نفت"],
  ];
  const rows = fixed.map(([m, d, title]) => ({ date: jalaliToISO(jy, m, d), kind: "holiday" as const, title }));
  for (let d = 5; d <= 15; d++) if (d !== 12 && d !== 13) rows.push({ date: jalaliToISO(jy, 1, d), kind: "holiday" as const, title: "تعطیلات نوروز" });
  return rows;
}

let calendarEnsured: Promise<void> | null = null;
/** First run: official solar holidays (this & next Jalali year) + Thursday/Friday as peak. */
export function ensureCalendar(): Promise<void> {
  if (!calendarEnsured) {
    calendarEnsured = (async () => {
      const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(calendarDays);
      if (c > 0) return;
      const { jy } = isoToJalali(todayISO());
      const rows = new Map<string, { date: string; kind: "holiday" | "peak"; title: string }>();
      const start = jalaliToISO(jy, 1, 1);
      const end = addDaysISO(jalaliToISO(jy + 1, 1, 1), -1);
      for (let d = start; d <= end; d = addDaysISO(d, 1)) {
        const wd = parseISODate(d).getUTCDay();
        if (wd === 4 || wd === 5) rows.set(d, { date: d, kind: "peak", title: "آخر هفته" });
      }
      for (const r of [...officialHolidayRows(jy), ...officialHolidayRows(jy + 1)]) rows.set(r.date, r);
      const list = Array.from(rows.values());
      for (let i = 0; i < list.length; i += 300) await db.insert(calendarDays).values(list.slice(i, i + 300)).onConflictDoNothing();
    })().catch((e) => {
      calendarEnsured = null;
      throw e;
    });
  }
  return calendarEnsured;
}
