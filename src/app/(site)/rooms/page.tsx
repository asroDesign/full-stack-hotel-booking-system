import Link from "next/link";
import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import { CalendarCheck, CalendarX2 } from "lucide-react";
import { db } from "@/db";
import { reservations, rooms } from "@/db/schema";
import { BLOCKING } from "@/lib/availability";
import { quoteRoom } from "@/lib/pricing";
import { getSettings } from "@/lib/data";
import { PageHero, RoomCard, EmptyState } from "@/components/site/ui";
import { StaySearch } from "@/components/site/stay-search";
import { cn, diffDays, faNum, formatJalali, todayISO } from "@/lib/utils";

export const metadata = { title: "اتاق‌ها و سوئیت‌ها" };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ type?: string; guests?: string; checkIn?: string; checkOut?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const all = await db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(asc(rooms.sortOrder));
  const types = Array.from(new Set(all.map((r) => r.type)));
  const guests = Math.min(30, Math.max(0, Number(sp.guests) || 0));
  const ci = sp.checkIn && ISO.test(sp.checkIn) && sp.checkIn >= todayISO() ? sp.checkIn : "";
  const co = ci && sp.checkOut && ISO.test(sp.checkOut) && sp.checkOut > ci && diffDays(ci, sp.checkOut) <= 30 ? sp.checkOut : "";
  const dated = !!(ci && co);

  let busy = new Set<number>();
  if (dated) {
    const rows = await db
      .select({ roomId: reservations.roomId })
      .from(reservations)
      .where(and(eq(reservations.kind, "room"), inArray(reservations.status, [...BLOCKING]), lt(reservations.checkIn, co), gt(reservations.checkOut, ci)));
    busy = new Set(rows.map((r) => r.roomId).filter((x): x is number => x !== null));
  }
  const list = all.filter((r) => (!sp.type || r.type === sp.type) && (!guests || r.capacity + r.extraBeds >= guests) && !busy.has(r.id));
  const stays = dated
    ? new Map(await Promise.all(list.slice(0, 40).map(async (r) => [r.id, await quoteRoom(r, ci, co, Math.max(1, guests || r.capacity), [])] as const)))
    : new Map();
  const roomQuery = new URLSearchParams(Object.entries({ checkIn: ci, checkOut: co, guests: guests ? String(guests) : "" }).filter(([, v]) => v)).toString();

  const href = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { type: sp.type, guests: sp.guests, checkIn: ci || undefined, checkOut: co || undefined, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && q.set(k, v));
    const str = q.toString();
    return str ? `/rooms?${str}#results` : "/rooms";
  };
  const maxGuests = Math.max(2, ...all.map((r) => r.capacity + r.extraBeds));

  return (
    <>
      <PageHero eyebrow={`${faNum(all.length)} اتاق و سوئیت`} title="اتاق‌ها و سوئیت‌ها" subtitle={`تاریخ سفر را انتخاب کنید تا اتاق‌های خالی ${s.hotelName} را با قیمت کل اقامت ببینید.`} image={all[0]?.images[0] || "/images/hero.jpg"} />
      <section id="results" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-12">
        <div className="mb-6"><StaySearch variant="bar" defaults={{ checkIn: ci, checkOut: co, guests: guests || 2 }} maxGuests={maxGuests} /></div>
        {dated && (
          <div role="status" className={cn("alert alert-soft mb-6", list.length ? "alert-success" : "alert-warning")}>
            {list.length ? <CalendarCheck className="h-5 w-5" /> : <CalendarX2 className="h-5 w-5" />}
            <span>
              {list.length ? `${faNum(list.length)} اتاق برای` : "متأسفانه اتاق خالی مطابق جستجو برای"} {formatJalali(ci)} تا {formatJalali(co)} ({faNum(diffDays(ci, co))} شب){guests ? ` و ${faNum(guests)} نفر` : ""} {list.length ? "موجود است. قیمت‌ها برای کل اقامت است." : "پیدا نشد."}
            </span>
            <Link href="/rooms" className="btn btn-ghost btn-sm">حذف تاریخ</Link>
          </div>
        )}
        <div className="card card-border mb-8 flex flex-col gap-4 bg-base-100 p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="no-scrollbar flex gap-2 overflow-x-auto">
            <Link href={href({ type: undefined })} className={cn("whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium", !sp.type ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>همه</Link>
            {types.map((t) => (
              <Link key={t} href={href({ type: t })} className={cn("whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium", sp.type === t ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>{t}</Link>
            ))}
          </div>
          <span className="text-sm text-base-content/50">{faNum(list.length)} اتاق</span>
        </div>
        {list.length === 0 ? (
          <EmptyState title="اتاقی با این شرایط پیدا نشد" desc="تاریخ یا تعداد نفرات را تغییر دهید." action={<Link href="/rooms" className="btn btn-primary">نمایش همه اتاق‌ها</Link>} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => {
              const q = stays.get(r.id);
              return <RoomCard key={r.id} room={r} query={roomQuery} stay={q ? { nights: q.nightsCount, total: q.total } : undefined} />;
            })}
          </div>
        )}
      </section>
    </>
  );
}
