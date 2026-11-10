import Link from "next/link";
import { and, asc, eq, gt, inArray, lt } from "drizzle-orm";
import * as jalaali from "jalaali-js";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { db } from "@/db";
import { partners, reservations, rooms } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { SOURCES } from "@/lib/crm";
import { addDaysISO, cn, faNum, isoToJalali, jalaliToISO, jMonths, parseISODate, todayISO, weekDays } from "@/lib/utils";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ jy?: string; jm?: string; room?: string; source?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  const t = isoToJalali(today);
  const jy = Number(sp.jy) || t.jy;
  const jm = Math.min(12, Math.max(1, Number(sp.jm) || t.jm));
  const len = jalaali.jalaaliMonthLength(jy, jm);
  const from = jalaliToISO(jy, jm, 1);
  const to = addDaysISO(jalaliToISO(jy, jm, len), 1);
  const days = Array.from({ length: len }, (_, i) => addDaysISO(from, i));
  const roomId = Number(sp.room) || 0;
  const [roomList, partnerList, resList] = await Promise.all([
    db.select().from(rooms).orderBy(asc(rooms.sortOrder)),
    db.select({ id: partners.id, name: partners.name }).from(partners),
    db
      .select()
      .from(reservations)
      .where(and(eq(reservations.kind, "room"), inArray(reservations.status, ["pending_payment", "paid", "confirmed"]), lt(reservations.checkIn, to), gt(reservations.checkOut, from)))
      .orderBy(asc(reservations.checkIn)),
  ]);
  const list = sp.source ? resList.filter((r) => r.source === sp.source) : resList;
  const color = (s: string) => SOURCES.find((x) => x.key === s)?.color ?? "#64748b";
  const cell = (rid: number, d: string) => list.find((r) => r.roomId === rid && r.checkIn <= d && (r.checkOut ?? "") > d);
  const prev = jm === 1 ? { jy: jy - 1, jm: 12 } : { jy, jm: jm - 1 };
  const next = jm === 12 ? { jy: jy + 1, jm: 1 } : { jy, jm: jm + 1 };
  const q = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    Object.entries({ jy, jm, room: roomId || undefined, source: sp.source, ...p }).forEach(([k, v]) => v !== undefined && v !== "" && v !== 0 && u.set(k, String(v)));
    return `/admin/calendar?${u}`;
  };
  const pname = (id: number | null) => partnerList.find((p) => p.id === id)?.name;
  const room = roomList.find((r) => r.id === roomId);
  const occupiedNights = list.reduce((s, r) => s + days.filter((d) => r.status !== "pending_payment" && r.checkIn <= d && (r.checkOut ?? "") > d).length, 0);
  const occ = roomList.length ? Math.round((occupiedNights / (roomList.length * len)) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader title="تقویم رزروها" desc={`ضریب اشغال ${jMonths[jm - 1]}: ${faNum(occ)}٪`} action={<Link href="/admin/reservations/new" className="btn btn-primary"><Plus className="h-4 w-4" /> رزرو جدید</Link>} />
      <div className="card card-border bg-base-100 shadow-sm">
        <div className="card-body flex-row flex-wrap items-center gap-3 p-4">
          <div className="join">
            <Link href={q(prev)} className="btn join-item btn-sm"><ChevronRight className="h-4 w-4" /></Link>
            <span className="btn join-item btn-sm pointer-events-none min-w-32 font-bold">{jMonths[jm - 1]} {faNum(jy)}</span>
            <Link href={q(next)} className="btn join-item btn-sm"><ChevronLeft className="h-4 w-4" /></Link>
          </div>
          <Link href={q({ jy: t.jy, jm: t.jm })} className="btn btn-sm btn-ghost">امروز</Link>
          <form className="flex flex-wrap items-center gap-2" action="/admin/calendar">
            <input type="hidden" name="jy" value={jy} /><input type="hidden" name="jm" value={jm} />
            <select name="room" defaultValue={roomId || ""} className="select select-sm"><option value="">همه اتاق‌ها (نمای جدولی)</option>{roomList.map((r) => <option key={r.id} value={r.id}>تقویم اتاق {r.roomNumber} — {r.type}</option>)}</select>
            <select name="source" defaultValue={sp.source ?? ""} className="select select-sm"><option value="">همه منابع</option>{SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select>
            <button className="btn btn-sm">نمایش</button>
          </form>
          <div className="flex flex-wrap gap-2 text-[11px]">{SOURCES.map((s) => <span key={s.key} className="flex items-center gap-1"><span className="h-3 w-3 rounded" style={{ background: s.color }} />{s.label}</span>)}<span className="flex items-center gap-1"><span className="h-3 w-3 rounded border border-dashed border-base-content/40" />در انتظار پرداخت</span></div>
        </div>
      </div>

      {room ? (
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body p-4">
            <h3 className="mb-2 font-extrabold">اتاق {faNum(room.roomNumber)} — {room.name}</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-base-content/50">{weekDays.map((w) => <div key={w}>{w}</div>)}</div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: (parseISODate(from).getUTCDay() + 1) % 7 }).map((_, i) => <div key={`e${i}`} />)}
              {days.map((d, i) => {
                const r = cell(room.id, d);
                return (
                  <div key={d} className={cn("min-h-20 rounded-field border p-1.5 text-right", d === today ? "border-secondary" : "border-base-300", r?.status === "pending_payment" && "border-dashed")} style={r && r.status !== "pending_payment" ? { background: `${color(r.source)}22`, borderColor: color(r.source) } : undefined}>
                    <div className="text-xs font-bold">{faNum(i + 1)}</div>
                    {r && <Link href={`/admin/reservations/${r.id}`} className="mt-1 block truncate text-[11px] font-medium hover:underline" style={{ color: color(r.source) }}>{r.guestName}</Link>}
                    {r && r.checkIn === d && <div className="text-[10px] text-base-content/50">ورود · {SOURCES.find((s) => s.key === r.source)?.label}{pname(r.partnerId) ? ` (${pname(r.partnerId)})` : ""}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card card-border overflow-hidden bg-base-100 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky right-0 z-10 w-32 border-b border-base-300 bg-base-100 p-2 text-right">اتاق</th>
                  {days.map((d, i) => {
                    const wd = parseISODate(d).getUTCDay();
                    return <th key={d} className={cn("border-b border-base-300 p-1 font-medium", d === today && "bg-secondary/20", (wd === 5 || wd === 4) && "text-error")}>{faNum(i + 1)}<div className="text-[9px] font-normal text-base-content/40">{weekDays[(wd + 1) % 7]}</div></th>;
                  })}
                </tr>
              </thead>
              <tbody>
                {roomList.map((rm) => (
                  <tr key={rm.id}>
                    <td className="sticky right-0 z-10 border-b border-base-200 bg-base-100 p-2"><Link href={q({ room: rm.id })} className="font-bold hover:underline">{faNum(rm.roomNumber)}</Link> <span className="text-[10px] text-base-content/50">{rm.type}</span></td>
                    {days.map((d, i) => {
                      const r = cell(rm.id, d);
                      const start = r && (r.checkIn === d || i === 0);
                      return (
                        <td key={d} className={cn("h-9 border-b border-base-200 p-0", d === today && "bg-secondary/10")}>
                          {r ? (
                            <Link href={`/admin/reservations/${r.id}`} title={`${r.guestName} · ${SOURCES.find((s) => s.key === r.source)?.label}${pname(r.partnerId) ? ` · ${pname(r.partnerId)}` : ""}`} className={cn("mx-px block h-7 overflow-hidden whitespace-nowrap px-1 text-[10px] leading-7 text-white", start && "rounded-r-md", (r.checkOut === addDaysISO(d, 1)) && "rounded-l-md", r.status === "pending_payment" && "opacity-50")} style={{ background: color(r.source) }}>
                              {start ? r.guestName : ""}
                            </Link>
                          ) : (
                            <Link href={`/admin/reservations/new?room=${rm.id}&checkIn=${d}`} className="mx-px block h-7 rounded hover:bg-base-200" aria-label="رزرو جدید" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="p-3 text-[11px] text-base-content/50">برای ثبت رزرو، روی خانه خالی کلیک کنید. با کلیک روی شماره اتاق، تقویم ماهانه آن اتاق نمایش داده می‌شود.</p>
        </div>
      )}
    </div>
  );
}
