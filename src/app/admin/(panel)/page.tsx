import Link from "next/link";
import { asc, desc, eq, inArray, sql, and, gte } from "drizzle-orm";
import { CalendarCheck, Hourglass, Wallet, BedDouble, MessageSquare, ArrowLeft, Waves } from "lucide-react";
import { db } from "@/db";
import { customers, messages, reservations, rooms, services } from "@/db/schema";
import { SOURCES } from "@/lib/crm";
import { jalaliToISO } from "@/lib/utils";
import * as jalaali from "jalaali-js";
import { PageHeader, StatusBadge } from "@/components/admin/ui";
import { addDaysISO, cn, faNum, formatJalali, formatPrice, isoToJalali, relativeTime, todayISO } from "@/lib/utils";

export default async function Dashboard() {
  const today = todayISO();
  const end = addDaysISO(today, 14);
  const [allRooms, recent, [stats], [unread], upcoming, poolSvc] = await Promise.all([
    db.select().from(rooms).orderBy(asc(rooms.sortOrder)),
    db.select().from(reservations).orderBy(desc(reservations.createdAt)).limit(7),
    db
      .select({
        total: sql<number>`count(*)::int`,
        paid: sql<number>`count(*) filter (where status = 'paid')::int`,
        pending: sql<number>`count(*) filter (where status = 'pending_payment')::int`,
        confirmed: sql<number>`count(*) filter (where status = 'confirmed')::int`,
        deposits: sql<number>`coalesce(sum(deposit_amount) filter (where status in ('paid','confirmed')),0)::bigint`,
        revenue: sql<number>`coalesce(sum(total_price) filter (where status = 'confirmed'),0)::bigint`,
      })
      .from(reservations),
    db.select({ c: sql<number>`count(*)::int` }).from(messages).where(eq(messages.isRead, false)),
    db
      .select()
      .from(reservations)
      .where(and(inArray(reservations.status, ["paid", "confirmed"]), gte(reservations.checkIn, addDaysISO(today, -30)))),
    db.select().from(services).where(eq(services.isBookable, true)).orderBy(asc(services.sortOrder)).limit(1),
  ]);

  const days = Array.from({ length: 14 }, (_, i) => addDaysISO(today, i));
  const roomRes = upcoming.filter((r) => r.kind === "room");
  const cell = (roomId: number, d: string) =>
    roomRes.find((r) => r.roomId === roomId && r.checkOut && d >= r.checkIn && d < r.checkOut);
  const occupiedTonight = allRooms.filter((r) => cell(r.id, today)).length;
  const pool = poolSvc[0];
  const poolToday = pool ? upcoming.filter((r) => r.kind === "service" && r.serviceId === pool.id && r.checkIn === today) : [];

  // ----- month analytics (ADR, RevPAR, occupancy, revenue by source) -----
  const tj = isoToJalali(today);
  const mFrom = jalaliToISO(tj.jy, tj.jm, 1);
  const mLen = jalaali.jalaaliMonthLength(tj.jy, tj.jm);
  const mTo = addDaysISO(mFrom, mLen);
  const monthRes = await db
    .select({ source: reservations.source, total: reservations.totalPrice, nights: reservations.nightly, checkIn: reservations.checkIn, kind: reservations.kind, createdAt: reservations.createdAt })
    .from(reservations)
    .where(and(eq(reservations.status, "confirmed"), sql`${reservations.checkIn} < ${mTo}`, sql`coalesce(${reservations.checkOut}, ${reservations.checkIn}) > ${mFrom}`));
  let soldNights = 0;
  let roomRevenue = 0;
  const bySource = new Map<string, number>();
  for (const r of monthRes) {
    const inMonth = r.kind === "room" ? r.nights.filter((n) => n.date >= mFrom && n.date < mTo) : [];
    const rev = r.kind === "room" ? inMonth.reduce((s, n) => s + n.price, 0) || (r.checkIn >= mFrom ? r.total : 0) : r.checkIn >= mFrom ? r.total : 0;
    soldNights += inMonth.length;
    roomRevenue += r.kind === "room" ? rev : 0;
    bySource.set(r.source, (bySource.get(r.source) ?? 0) + rev);
  }
  const capacityNights = allRooms.length * mLen;
  const monthOcc = capacityNights ? Math.round((soldNights / capacityNights) * 100) : 0;
  const adr = soldNights ? Math.round(roomRevenue / soldNights) : 0;
  const revpar = capacityNights ? Math.round(roomRevenue / capacityNights) : 0;
  const totalBySource = Array.from(bySource.values()).reduce((a, b) => a + b, 0) || 1;
  const [{ newCustomers }] = await db.select({ newCustomers: sql<number>`count(*)::int` }).from(customers).where(gte(customers.createdAt, new Date(mFrom + "T00:00:00Z")));

  const cards = [
    { label: "در انتظار تایید", value: faNum(stats.paid), sub: `${faNum(stats.pending)} منتظر پرداخت`, Icon: Hourglass, tone: "from-amber-400 to-orange-500", href: "/admin/reservations?status=paid" },
    { label: "رزروهای قطعی", value: faNum(stats.confirmed), sub: `از ${faNum(stats.total)} درخواست`, Icon: CalendarCheck, tone: "from-emerald-400 to-teal-600", href: "/admin/reservations?status=confirmed" },
    { label: "پیش‌پرداخت دریافتی", value: formatPrice(Number(stats.deposits)), sub: "تومان", Icon: Wallet, tone: "from-sky-400 to-indigo-500", href: "/admin/reservations" },
    { label: "اشغال امشب", value: `${faNum(occupiedTonight)}/${faNum(allRooms.length)}`, sub: `${faNum(allRooms.length ? Math.round((occupiedTonight / allRooms.length) * 100) : 0)}٪ اشغال`, Icon: BedDouble, tone: "from-brand-500 to-brand-800", href: "/admin/rooms" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="داشبورد" desc={`امروز ${formatJalali(today, true)}`} action={unread.c > 0 ? <Link href="/admin/messages" className="btn"><MessageSquare className="h-4 w-4" /> {faNum(unread.c)} پیام خوانده‌نشده</Link> : undefined} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, sub, Icon, tone, href }) => (
          <Link key={label} href={href} className="card card-border bg-base-100 shadow-sm group relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg block">
            <div className={cn("absolute -left-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-15 transition group-hover:scale-125", tone)} />
            <span className={cn("grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br text-white shadow-lg", tone)}><Icon className="h-5 w-5" /></span>
            <div className="mt-4 text-sm text-slate-500">{label}</div>
            <div className="mt-1 text-2xl font-black text-slate-900">{value}</div>
            <div className="text-xs text-slate-400">{sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-3 p-5">
            <h2 className="font-extrabold">شاخص‌های عملکرد {formatJalali(mFrom).split(" ").slice(1).join(" ")}</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["ضریب اشغال", `${faNum(monthOcc)}٪`, `${faNum(soldNights)} از ${faNum(capacityNights)} شب‌اتاق`],
                ["ADR (میانگین نرخ)", formatPrice(adr), "تومان برای هر شب فروخته‌شده"],
                ["RevPAR", formatPrice(revpar), "درآمد به ازای هر اتاق موجود"],
                ["مشتریان جدید", faNum(newCustomers), "عضو جدید باشگاه در این ماه"],
              ].map(([l, v, d]) => (
                <div key={l} className="rounded-box bg-base-200/60 p-3"><div className="text-xs text-base-content/60">{l}</div><div className="text-xl font-black">{v}</div><div className="text-[10px] text-base-content/45">{d}</div></div>
              ))}
            </div>
          </div>
        </div>
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-3 p-5">
            <div className="flex items-center justify-between"><h2 className="font-extrabold">فروش این ماه به تفکیک منبع رزرو</h2><Link href="/admin/calendar" className="text-sm text-primary">تقویم رزروها</Link></div>
            {bySource.size === 0 ? <p className="py-6 text-center text-sm text-base-content/50">هنوز فروش قطعی در این ماه ثبت نشده است.</p> : (
              <ul className="space-y-2.5">
                {SOURCES.filter((s) => bySource.has(s.key)).sort((a, b) => (bySource.get(b.key) ?? 0) - (bySource.get(a.key) ?? 0)).map((s) => {
                  const v = bySource.get(s.key) ?? 0;
                  return (
                    <li key={s.key}>
                      <div className="mb-1 flex justify-between text-sm"><span className="flex items-center gap-2"><span className="h-3 w-3 rounded" style={{ background: s.color }} />{s.label}</span><span className="font-bold">{formatPrice(v)} <span className="text-xs font-normal text-base-content/50">({faNum(Math.round((v / totalBySource) * 100))}٪)</span></span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-base-200"><div className="h-full rounded-full" style={{ width: `${(v / totalBySource) * 100}%`, background: s.color }} /></div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="card card-border bg-base-100 shadow-sm overflow-hidden block">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h2 className="font-extrabold text-slate-900">تقویم اشغال اتاق‌ها (۱۴ روز آینده)</h2>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-brand-600" /> قطعی</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-sky-400" /> پرداخت‌شده</span>
          </div>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full min-w-[760px] border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="w-32 text-right font-medium text-slate-400">اتاق</th>
                {days.map((d) => {
                  const j = isoToJalali(d);
                  return <th key={d} className={cn("rounded-lg py-1 font-medium", d === today ? "bg-gold-400/20 text-gold-600" : "text-slate-500")}>{faNum(j.jd)}/{faNum(j.jm)}</th>;
                })}
              </tr>
            </thead>
            <tbody>
              {allRooms.map((r) => (
                <tr key={r.id}>
                  <td className="truncate whitespace-nowrap font-medium text-slate-700">{faNum(r.roomNumber)} · {r.type}</td>
                  {days.map((d) => {
                    const c = cell(r.id, d);
                    return (
                      <td key={d} className="p-0">
                        {c ? (
                          <Link href={`/admin/reservations/${c.id}`} title={`${c.guestName} - ${c.itemName}`} className={cn("block h-7 rounded-md transition hover:opacity-80", c.status === "confirmed" ? "bg-brand-600" : "bg-sky-400")} />
                        ) : (
                          <div className="h-7 rounded-md bg-slate-100" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {allRooms.length === 0 && <p className="py-8 text-center text-sm text-slate-500">هنوز اتاقی تعریف نشده است.</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="card card-border bg-base-100 shadow-sm overflow-hidden block">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <h2 className="font-extrabold text-slate-900">آخرین درخواست‌ها</h2>
            <Link href="/admin/reservations" className="flex items-center gap-1 text-sm font-medium text-brand-700">همه <ArrowLeft className="h-4 w-4" /></Link>
          </div>
          {recent.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">هنوز رزروی ثبت نشده است.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/reservations/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-slate-50">
                    <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", r.kind === "room" ? "bg-brand-50 text-brand-700" : "bg-sky-50 text-sky-700")}>
                      {r.kind === "room" ? <BedDouble className="h-5 w-5" /> : <Waves className="h-5 w-5" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold text-slate-800">{r.guestName}</div>
                      <div className="truncate text-xs text-slate-500">{r.itemName} · {formatJalali(r.checkIn)}</div>
                    </div>
                    <div className="hidden text-left sm:block">
                      <StatusBadge status={r.status} />
                      <div className="mt-1 text-[11px] text-slate-400">{relativeTime(r.createdAt)}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card card-border bg-base-100 shadow-sm overflow-hidden block">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-extrabold text-slate-900">سانس‌های امروز {pool?.name}</h2>
          </div>
          {!pool ? (
            <p className="p-8 text-center text-sm text-slate-500">خدمت قابل رزروی وجود ندارد.</p>
          ) : (
            <ul className="space-y-2 p-4">
              {pool.timeSlots.map((t) => {
                const r = poolToday.find((x) => x.timeSlot === t);
                return (
                  <li key={t} className={cn("flex items-center justify-between rounded-xl px-4 py-3 text-sm", r ? "bg-brand-50" : "bg-slate-50")}>
                    <span dir="ltr" className="font-mono font-semibold text-slate-700">{faNum(t)}</span>
                    {r ? (
                      <Link href={`/admin/reservations/${r.id}`} className="font-medium text-brand-700">{r.guestName} · {faNum(r.guests)} نفر</Link>
                    ) : (
                      <span className="text-xs text-slate-400">خالی</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-slate-100 p-4 text-xs text-slate-500">درآمد رزروهای قطعی: <b className="text-slate-800">{formatPrice(Number(stats.revenue))} تومان</b></div>
        </div>
      </div>
    </div>
  );
}
