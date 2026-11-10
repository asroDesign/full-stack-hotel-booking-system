import Link from "next/link";
import { and, asc, eq, inArray, isNotNull, isNull, lte, gt, or } from "drizzle-orm";
import { BedDouble, LogIn, LogOut, Users, AlertTriangle, Plus, CalendarRange } from "lucide-react";
import { db } from "@/db";
import { partners, reservations, rooms } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { CheckButtons, HousekeepingSelect, SourceBadge } from "@/components/admin/frontdesk";
import { cn, faNum, formatJalali, todayISO } from "@/lib/utils";

export default async function FrontDesk() {
  const today = todayISO();
  const [roomList, partnerList, active] = await Promise.all([
    db.select().from(rooms).orderBy(asc(rooms.sortOrder)),
    db.select({ id: partners.id, name: partners.name }).from(partners),
    db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.kind, "room"),
          eq(reservations.status, "confirmed"),
          isNull(reservations.checkedOutAt),
          or(and(lte(reservations.checkIn, today), gt(reservations.checkOut, today)), eq(reservations.checkIn, today), isNotNull(reservations.checkedInAt)),
        ),
      )
      .orderBy(asc(reservations.checkIn)),
  ]);
  const pname = (id: number | null) => partnerList.find((p) => p.id === id)?.name ?? null;
  const arrivals = active.filter((r) => r.checkIn === today && !r.checkedInAt);
  const late = active.filter((r) => r.checkIn < today && !r.checkedInAt && (r.checkOut ?? "") > today);
  const inHouse = active.filter((r) => r.checkedInAt);
  const departures = inHouse.filter((r) => (r.checkOut ?? "") <= today);
  const occupied = new Map(active.filter((r) => r.checkedInAt || ((r.checkIn ?? "") <= today && (r.checkOut ?? "") > today)).map((r) => [r.roomId, r]));
  const occ = roomList.length ? Math.round((occupied.size / roomList.length) * 100) : 0;
  const pendingIds = (await db.select({ id: reservations.id }).from(reservations).where(inArray(reservations.status, ["paid"]))).length;

  const Row = ({ r, tone }: { r: (typeof active)[number]; tone?: string }) => (
    <li className={cn("flex flex-wrap items-center gap-3 py-3", tone)}>
      <div className="min-w-0 flex-1">
        <Link href={`/admin/reservations/${r.id}`} className="font-bold hover:underline">{r.guestName}</Link>
        <div className="flex flex-wrap items-center gap-2 text-xs text-base-content/60">
          <span>{r.itemName}</span><span>{faNum(r.guests)} نفر</span><span>{formatJalali(r.checkIn)} ← {formatJalali(r.checkOut)}</span>
          <SourceBadge source={r.source} partner={pname(r.partnerId)} />
        </div>
      </div>
      <div className="flex gap-1"><CheckButtons id={r.id} confirmed checkedIn={!!r.checkedInAt} checkedOut={!!r.checkedOutAt} /></div>
    </li>
  );
  const Box = ({ title, icon, list, empty, tone }: { title: string; icon: React.ReactNode; list: typeof active; empty: string; tone?: string }) => (
    <section className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-1 p-5">
        <h3 className="flex items-center gap-2 font-extrabold">{icon}{title}<span className="badge badge-ghost">{faNum(list.length)}</span></h3>
        {list.length === 0 ? <p className="py-4 text-center text-sm text-base-content/50">{empty}</p> : <ul className="divide-y divide-base-200">{list.map((r) => <Row key={r.id} r={r} tone={tone} />)}</ul>}
      </div>
    </section>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="میز پذیرش" desc={`امروز ${formatJalali(today, true)}`} action={<div className="flex gap-2"><Link href="/admin/calendar" className="btn"><CalendarRange className="h-4 w-4" /> تقویم</Link><Link href="/admin/reservations/new" className="btn btn-primary"><Plus className="h-4 w-4" /> پذیرش حضوری / رزرو جدید</Link></div>} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {[
          ["ورودی امروز", arrivals.length, "text-success"],
          ["خروجی امروز", departures.length, "text-warning"],
          ["مهمانان ساکن", inHouse.length, "text-primary"],
          ["ضریب اشغال", `${faNum(occ)}٪`, "text-info"],
          ["در انتظار تایید", pendingIds, "text-error"],
        ].map(([l, v, c]) => (
          <div key={String(l)} className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><div className="text-xs text-base-content/60">{l}</div><div className={cn("text-3xl font-black", String(c))}>{typeof v === "number" ? faNum(v) : v}</div></div></div>
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Box title="ورودی‌های امروز" icon={<LogIn className="h-5 w-5 text-success" />} list={arrivals} empty="ورودی دیگری برای امروز ثبت نشده است." />
        <Box title="خروجی‌های امروز" icon={<LogOut className="h-5 w-5 text-warning" />} list={departures} empty="خروجی دیگری برای امروز نیست." />
        {late.length > 0 && <Box title="تاخیر در ورود" icon={<AlertTriangle className="h-5 w-5 text-error" />} list={late} empty="" tone="bg-error/5" />}
        <Box title="مهمانان ساکن" icon={<Users className="h-5 w-5 text-primary" />} list={inHouse} empty="در حال حاضر مهمان ساکنی ثبت نشده است." />
      </div>
      <section className="card card-border bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <h3 className="flex items-center gap-2 font-extrabold"><BedDouble className="h-5 w-5 text-primary" /> وضعیت اتاق‌ها و خانه‌داری</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {roomList.map((rm) => {
              const r = occupied.get(rm.id);
              return (
                <div key={rm.id} className={cn("rounded-box border p-3", r ? (r.checkedInAt ? "border-primary/40 bg-primary/5" : "border-info/40 bg-info/5") : "border-base-300")}>
                  <div className="flex items-center justify-between"><span className="text-lg font-black">{faNum(rm.roomNumber)}</span><span className="text-[10px] text-base-content/50">{rm.type}</span></div>
                  <div className="mt-1 h-9 text-xs">{r ? <Link href={`/admin/reservations/${r.id}`} className="line-clamp-2 font-medium hover:underline">{r.checkedInAt ? "ساکن: " : "رزرو: "}{r.guestName}</Link> : <span className="text-base-content/40">خالی</span>}</div>
                  <HousekeepingSelect roomId={rm.id} value={rm.housekeeping} />
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
