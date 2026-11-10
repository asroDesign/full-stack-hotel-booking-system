import Link from "next/link";
import { desc, eq, isNotNull, sql } from "drizzle-orm";
import { BookOpen } from "lucide-react";
import { db } from "@/db";
import { partnerLogs, partners, reservations } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { PartnersManager } from "@/components/admin/club";
import { cn, formatDateTime } from "@/lib/utils";

export default async function PartnersPage() {
  const [list, stats, logs] = await Promise.all([
    db.select().from(partners).orderBy(desc(partners.isActive), partners.id),
    db.select({ id: reservations.partnerId, count: sql<number>`count(*)::int`, revenue: sql<number>`coalesce(sum(${reservations.totalPrice}) filter (where ${reservations.status} = 'confirmed'),0)::bigint` }).from(reservations).where(isNotNull(reservations.partnerId)).groupBy(reservations.partnerId),
    db.select().from(partnerLogs).orderBy(desc(partnerLogs.id)).limit(40),
  ]);
  void eq;
  const name = (id: number | null) => list.find((p) => p.id === id)?.name ?? "ناشناس";
  return (
    <div className="space-y-6">
      <PageHeader title="آژانس‌ها و سایت‌های همکار" desc="تعریف همکار، کمیسیون، توکن و کلید امضای اختصاصی وب‌سرویس برای ارسال خودکار رزروها" action={<Link href="/admin/partners/docs" className="btn btn-sm"><BookOpen className="h-4 w-4" /> مستندات وب‌سرویس</Link>} />
      <PartnersManager partners={list.map((p) => ({ ...p, secret: "", tokenHash: "", hasToken: !!p.tokenHash }))} stats={Object.fromEntries(stats.filter((s) => s.id).map((s) => [s.id as number, { count: s.count, revenue: Number(s.revenue) }]))} />
      <section className="card card-border bg-base-100 shadow-sm">
        <div className="card-body gap-2 p-5">
          <h3 className="font-extrabold">گزارش آخرین درخواست‌های API</h3>
          {logs.length === 0 ? <p className="py-4 text-center text-sm text-base-content/50">هنوز درخواستی دریافت نشده است.</p> : (
            <div className="overflow-x-auto">
              <table className="table table-xs min-w-[720px]">
                <thead><tr><th>زمان</th><th>همکار</th><th>درخواست</th><th>نتیجه</th><th>IP</th><th>توضیح</th></tr></thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td>{formatDateTime(l.createdAt)}</td>
                      <td>{name(l.partnerId)}</td>
                      <td dir="ltr" className="font-mono text-left">{l.method} {l.path}</td>
                      <td><span className={cn("badge badge-xs", l.status < 300 ? "badge-success" : l.status < 500 ? "badge-warning" : "badge-error")}>{l.status}</span></td>
                      <td dir="ltr" className="font-mono">{l.ip}</td>
                      <td className="max-w-60 truncate">{l.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
