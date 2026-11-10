import { asc, eq, gte } from "drizzle-orm";
import { UtensilsCrossed } from "lucide-react";
import { db } from "@/db";
import { diningVenues, tableBookings } from "@/db/schema";
import { PageHeader, EmptyBox } from "@/components/admin/ui";
import { TableBookingActions } from "@/components/admin/club";
import { addDaysISO, faNum, formatDateTime, formatJalali, todayISO } from "@/lib/utils";

export default async function TableBookingsPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const sp = await searchParams;
  const from = sp.all ? "1900-01-01" : addDaysISO(todayISO(), -1);
  const [list, venues] = await Promise.all([
    db.select().from(tableBookings).where(gte(tableBookings.date, from)).orderBy(asc(tableBookings.date), asc(tableBookings.time)),
    db.select({ id: diningVenues.id, name: diningVenues.name, bookingEnabled: diningVenues.bookingEnabled }).from(diningVenues).where(eq(diningVenues.isActive, true)),
  ]);
  const vname = (id: number) => venues.find((v) => v.id === id)?.name ?? "—";
  const dates = Array.from(new Set(list.map((b) => b.date)));
  return (
    <div className="space-y-5">
      <PageHeader title="رزرو میز رستوران و کافه" desc={`${faNum(list.filter((b) => b.status === "new").length)} درخواست جدید · رزرو آنلاین فعال برای: ${venues.filter((v) => v.bookingEnabled).map((v) => v.name).join("، ") || "هیچ‌کدام (از ویرایش رستوران فعال کنید)"}`} action={<a href={sp.all ? "/admin/table-bookings" : "/admin/table-bookings?all=1"} className="btn btn-sm">{sp.all ? "فقط امروز به بعد" : "نمایش همه"}</a>} />
      {list.length === 0 ? <EmptyBox title="رزرو میزی ثبت نشده" icon={<UtensilsCrossed className="h-6 w-6" />} /> : dates.map((d) => (
        <section key={d}>
          <h3 className="mb-2 font-extrabold">{formatJalali(d, true)}</h3>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {list.filter((b) => b.date === d).map((b) => (
              <div key={b.id} className="card card-border bg-base-100 shadow-sm">
                <div className="card-body gap-2 p-4">
                  <div className="flex items-center justify-between"><b className="text-lg" dir="ltr">{faNum(b.time)}</b><span className="badge badge-ghost">{vname(b.venueId)}</span></div>
                  <div className="text-sm"><b>{b.name}</b> · {faNum(b.guests)} نفر · <span dir="ltr">{faNum(b.phone)}</span></div>
                  {b.notes && <p className="text-xs text-base-content/60">{b.notes}</p>}
                  <div className="text-[11px] text-base-content/45">ثبت: {formatDateTime(b.createdAt)}</div>
                  <TableBookingActions id={b.id} status={b.status} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
