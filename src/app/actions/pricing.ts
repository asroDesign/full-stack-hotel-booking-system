"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { calendarDays, roomRates, rooms } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { officialHolidayRows } from "@/lib/pricing";
import { addDaysISO, isoToJalali, jalaliToISO, parseISODate } from "@/lib/utils";

const ISO = /^\d{4}-\d{2}-\d{2}$/;
type Res = { ok: boolean; message: string };

function validDates(dates: string[]) {
  const out = Array.from(new Set(dates.filter((d) => ISO.test(d)))).sort();
  return out.slice(0, 400);
}

async function roomList(roomIds: number[] | "all") {
  const all = await db.select().from(rooms);
  return roomIds === "all" ? all : all.filter((r) => roomIds.includes(r.id));
}

/** Set / change / clear the nightly price of one or many days, for one or many rooms. */
export async function applyRates(input: {
  roomIds: number[] | "all";
  dates: string[];
  mode: "set" | "percent" | "add" | "clear";
  value: number;
}): Promise<Res> {
  await requireAdmin();
  const dates = validDates(input.dates);
  if (!dates.length) return { ok: false, message: "هیچ روزی انتخاب نشده است." };
  const list = await roomList(input.roomIds);
  if (!list.length) return { ok: false, message: "اتاقی انتخاب نشده است." };
  const ids = list.map((r) => r.id);

  if (input.mode === "clear") {
    await db.delete(roomRates).where(and(inArray(roomRates.roomId, ids), inArray(roomRates.date, dates)));
    revalidatePath("/admin/pricing");
    return { ok: true, message: `قیمت اختصاصی ${dates.length} روز حذف شد و قیمت پیش‌فرض اعمال می‌شود.` };
  }

  const value = Number(input.value) || 0;
  if (input.mode === "set" && value <= 0) return { ok: false, message: "قیمت معتبر وارد کنید." };

  const [days, existing] = await Promise.all([
    db.select().from(calendarDays).where(inArray(calendarDays.date, dates)),
    db.select().from(roomRates).where(and(inArray(roomRates.roomId, ids), inArray(roomRates.date, dates))),
  ]);
  const dayKind = new Map(days.map((d) => [d.date, d.kind]));
  const ex = new Map(existing.map((e) => [`${e.roomId}|${e.date}`, e.price]));

  const rows: { roomId: number; date: string; price: number }[] = [];
  for (const r of list) {
    for (const d of dates) {
      const k = dayKind.get(d);
      const current =
        ex.get(`${r.id}|${d}`) ??
        (k === "holiday" && r.holidayPrice > 0 ? r.holidayPrice : k === "peak" && r.peakPrice > 0 ? r.peakPrice : r.pricePerNight);
      let price = current;
      if (input.mode === "set") price = value;
      if (input.mode === "percent") price = current * (1 + value / 100);
      if (input.mode === "add") price = current + value;
      price = Math.max(0, Math.round(price / 10000) * 10000);
      rows.push({ roomId: r.id, date: d, price });
    }
  }
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    await db
      .insert(roomRates)
      .values(batch)
      .onConflictDoUpdate({ target: [roomRates.roomId, roomRates.date], set: { price: sql`excluded.price` } });
  }
  revalidatePath("/admin/pricing");
  return { ok: true, message: `قیمت ${dates.length} روز برای ${list.length} اتاق به‌روزرسانی شد.` };
}


/** Mark days as holiday / peak / normal. */
export async function setDayKind(input: { dates: string[]; kind: "holiday" | "peak" | "normal"; title: string }): Promise<Res> {
  await requireAdmin();
  const dates = validDates(input.dates);
  if (!dates.length) return { ok: false, message: "هیچ روزی انتخاب نشده است." };
  if (input.kind === "normal") {
    await db.delete(calendarDays).where(inArray(calendarDays.date, dates));
  } else {
    const title = cleanText(input.title, 80);
    await db
      .insert(calendarDays)
      .values(dates.map((date) => ({ date, kind: input.kind as "holiday" | "peak", title })))
      .onConflictDoUpdate({ target: calendarDays.date, set: { kind: sql`excluded.kind`, title: sql`excluded.title` } });
  }
  revalidatePath("/admin/pricing");
  const label = input.kind === "holiday" ? "تعطیل" : input.kind === "peak" ? "پیک" : "عادی";
  return { ok: true, message: `${dates.length} روز به‌عنوان «${label}» علامت خورد.` };
}

/** Mark weekdays (e.g. Thursday & Friday) in a Jalali year as peak/holiday. */
export async function markWeekdays(input: { jy: number; weekdays: number[]; kind: "holiday" | "peak"; title: string }): Promise<Res> {
  await requireAdmin();
  const start = jalaliToISO(input.jy, 1, 1);
  const end = addDaysISO(jalaliToISO(input.jy + 1, 1, 1), -1);
  const dates: string[] = [];
  for (let d = start; d <= end; d = addDaysISO(d, 1)) {
    // JS: 0=Sun ... 4=Thu 5=Fri 6=Sat
    if (input.weekdays.includes(parseISODate(d).getUTCDay())) dates.push(d);
  }
  if (!dates.length) return { ok: false, message: "روزی انتخاب نشد." };
  const existing = await db.select({ date: calendarDays.date }).from(calendarDays).where(inArray(calendarDays.date, dates));
  const skip = new Set(existing.map((e) => e.date));
  const fresh = dates.filter((d) => !skip.has(d));
  if (fresh.length) {
    await db.insert(calendarDays).values(fresh.map((date) => ({ date, kind: input.kind, title: cleanText(input.title, 80) })));
  }
  revalidatePath("/admin/pricing");
  return { ok: true, message: `${fresh.length} روز در سال ${input.jy} علامت خورد (روزهای علامت‌دار قبلی تغییر نکردند).` };
}

/** Official fixed (solar) Iranian holidays for a Jalali year. Lunar holidays should be added manually. */
export async function markOfficialHolidays(jy: number): Promise<Res> {
  await requireAdmin();
  const rows = officialHolidayRows(jy);
  await db
    .insert(calendarDays)
    .values(rows.map((r) => ({ ...r, kind: r.kind })))
    .onConflictDoUpdate({ target: calendarDays.date, set: { kind: sql`excluded.kind`, title: sql`excluded.title` } });
  revalidatePath("/admin/pricing");
  return { ok: true, message: `تعطیلات رسمی شمسی سال ${jy} ثبت شد. تعطیلات قمری را به‌صورت دستی اضافه کنید.` };
}

/** One-click: change the holiday / peak / base price of many rooms. */
export async function bulkRoomPrices(input: {
  roomIds: number[] | "all";
  field: "holidayPrice" | "peakPrice" | "pricePerNight";
  mode: "set" | "percentOfBase" | "percentChange" | "add";
  value: number;
}): Promise<Res> {
  await requireAdmin();
  const list = await roomList(input.roomIds);
  if (!list.length) return { ok: false, message: "اتاقی انتخاب نشده است." };
  const v = Number(input.value) || 0;
  for (const r of list) {
    const current = r[input.field] || r.pricePerNight;
    let price = current;
    if (input.mode === "set") price = v;
    if (input.mode === "percentOfBase") price = r.pricePerNight * (1 + v / 100);
    if (input.mode === "percentChange") price = current * (1 + v / 100);
    if (input.mode === "add") price = current + v;
    price = Math.max(0, Math.round(price / 10000) * 10000);
    await db.update(rooms).set({ [input.field]: price }).where(eq(rooms.id, r.id));
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/", "layout");
  const label = input.field === "holidayPrice" ? "روزهای تعطیل" : input.field === "peakPrice" ? "روزهای پیک" : "پایه";
  return { ok: true, message: `قیمت ${label} برای ${list.length} اتاق به‌روزرسانی شد.` };
}

/** Inline edit of base/holiday/peak price for each room. */
export async function saveRoomPriceTable(rows: { id: number; pricePerNight: number; holidayPrice: number; peakPrice: number; extraGuestPrice: number }[]): Promise<Res> {
  await requireAdmin();
  for (const r of rows.slice(0, 200)) {
    const clamp = (n: number) => Math.max(0, Math.round(Number(n) || 0));
    await db
      .update(rooms)
      .set({ pricePerNight: clamp(r.pricePerNight), holidayPrice: clamp(r.holidayPrice), peakPrice: clamp(r.peakPrice), extraGuestPrice: clamp(r.extraGuestPrice) })
      .where(eq(rooms.id, Number(r.id)));
  }
  revalidatePath("/admin/pricing");
  revalidatePath("/", "layout");
  return { ok: true, message: "قیمت‌های اتاق‌ها ذخیره شد." };
}

export async function jalaliYearOf(iso: string) {
  return isoToJalali(iso).jy;
}
