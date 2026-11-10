import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { Search, Plus } from "lucide-react";
import { db } from "@/db";
import { reservations, type ReservationStatus } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { ReservationsTable } from "@/components/admin/reservations-table";
import { cn, faNum, statusMeta } from "@/lib/utils";

export default async function ReservationsPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string; q?: string; source?: string }> }) {
  const sp = await searchParams;
  const conds: SQL[] = [];
  if (sp.status && sp.status in statusMeta) conds.push(eq(reservations.status, sp.status as ReservationStatus));
  if (sp.kind === "room" || sp.kind === "service") conds.push(eq(reservations.kind, sp.kind));
  if (sp.source && ["website", "walk_in", "phone", "agency", "partner_site", "admin"].includes(sp.source)) conds.push(eq(reservations.source, sp.source as "website"));
  if (sp.q) {
    const q = `%${sp.q}%`;
    conds.push(or(ilike(reservations.guestName, q), ilike(reservations.phone, q), ilike(reservations.trackingCode, q), ilike(reservations.reservationCode, q), ilike(reservations.itemName, q))!);
  }
  const [list, counts] = await Promise.all([
    db.select().from(reservations).where(conds.length ? and(...conds) : undefined).orderBy(desc(reservations.createdAt)).limit(200),
    db.select({ status: reservations.status, c: sql<number>`count(*)::int` }).from(reservations).groupBy(reservations.status),
  ]);
  const countOf = (s?: string) => (s ? counts.find((c) => c.status === s)?.c ?? 0 : counts.reduce((a, b) => a + b.c, 0));
  const link = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    Object.entries({ ...sp, ...patch }).forEach(([k, v]) => v && q.set(k, v));
    return `/admin/reservations${q.toString() ? `?${q}` : ""}`;
  };

  return (
    <div>
      <PageHeader title="مدیریت رزروها" desc="بررسی پیش‌پرداخت‌ها، تایید و صدور کد رزرو" action={<Link href="/admin/reservations/new" className="btn btn-primary"><Plus className="h-4 w-4" /> ثبت رزرو / پذیرش حضوری</Link>} />
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto">
        {[undefined, "paid", "pending_payment", "confirmed", "rejected", "cancelled"].map((s) => (
          <Link key={s ?? "all"} href={link({ status: s })} className={cn("flex items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition", sp.status === s || (!sp.status && !s) ? "bg-brand-800 text-white shadow" : "bg-white text-slate-600 hover:bg-slate-50")}>
            {s ? statusMeta[s].label : "همه"}
            <span className={cn("rounded-full px-2 text-xs", sp.status === s || (!sp.status && !s) ? "bg-white/20" : "bg-slate-100")}>{faNum(countOf(s))}</span>
          </Link>
        ))}
      </div>
      <form className="card card-border bg-base-100 shadow-sm mb-4 flex flex-col gap-3 p-3 sm:flex-row">
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input name="q" defaultValue={sp.q} placeholder="جستجو: نام، موبایل، کد پیگیری یا کد رزرو" className="input w-full pr-10" />
        </div>
        <select name="kind" defaultValue={sp.kind ?? ""} className="select w-full sm:w-44">
          <option value="">همه انواع</option>
          <option value="room">اتاق</option>
          <option value="service">خدمات و سانس‌ها</option>
        </select>
        <select name="source" defaultValue={sp.source ?? ""} className="select w-full sm:w-40">
          <option value="">همه منابع</option><option value="website">سایت</option><option value="walk_in">حضوری</option><option value="phone">تلفنی</option><option value="agency">آژانس</option><option value="partner_site">سایت همکار</option><option value="admin">پنل</option>
        </select>
        <button className="btn btn-primary">اعمال</button>
      </form>
      <ReservationsTable key={JSON.stringify(sp) + list.length} initial={list} />
    </div>
  );
}
