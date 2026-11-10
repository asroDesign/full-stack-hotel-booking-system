import { asc } from "drizzle-orm";
import * as jalaali from "jalaali-js";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { PageHeader, EmptyBox } from "@/components/admin/ui";
import { PricingCalendar, RoomPriceTable } from "@/components/admin/pricing-calendar";
import { roomPriceMap } from "@/lib/pricing";
import { isoToJalali, jalaliToISO, todayISO } from "@/lib/utils";

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ room?: string; jy?: string; jm?: string }> }) {
  const sp = await searchParams;
  const all = await db.select().from(rooms).orderBy(asc(rooms.sortOrder), asc(rooms.id));
  if (!all.length) return <EmptyBox title="ابتدا اتاق تعریف کنید" />;
  const today = todayISO();
  const t = isoToJalali(today);
  const jy = Math.min(1500, Math.max(1390, Number(sp.jy) || t.jy));
  const jm = Math.min(12, Math.max(1, Number(sp.jm) || t.jm));
  const room = all.find((r) => r.id === Number(sp.room)) ?? all[0];
  const from = jalaliToISO(jy, jm, 1);
  const len = jalaali.jalaaliMonthLength(jy, jm);
  const to = jalaliToISO(jy, jm, len);
  const map = await roomPriceMap(room, from, to);
  const days = map.map((d, i) => ({ ...d, jd: i + 1 }));
  const rows = all.map((r) => ({
    id: r.id,
    name: r.name,
    roomNumber: r.roomNumber,
    pricePerNight: r.pricePerNight,
    holidayPrice: r.holidayPrice,
    peakPrice: r.peakPrice,
    extraGuestPrice: r.extraGuestPrice,
  }));
  return (
    <div className="space-y-6">
      <PageHeader title="قیمت‌گذاری و تقویم" desc="قیمت روزانه اتاق‌ها بر اساس تقویم شمسی، تعیین روزهای تعطیل و پیک و تغییر گروهی قیمت‌ها" />
      <PricingCalendar key={`${room.id}-${jy}-${jm}-${JSON.stringify(days.map((d) => d.price + d.kind))}`} rooms={rows} roomId={room.id} jy={jy} jm={jm} days={days} today={today} />
      <RoomPriceTable key={JSON.stringify(rows)} rooms={rows} />
    </div>
  );
}
