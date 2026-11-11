import { and, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, costCenters, journalEntries, journalLines } from "@/db/schema";
import { reportRange } from "@/lib/report-range";
import { ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { formatJalali, formatPrice } from "@/lib/utils";

export default async function CostAccountingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = reportRange(params);
  const rows = await db.select({
    centerId: costCenters.id,
    centerCode: costCenters.code,
    centerName: costCenters.name,
    accountCode: accounts.code,
    accountName: accounts.name,
    debit: sql<number>`coalesce(sum(${journalLines.debit}),0)::bigint`,
    credit: sql<number>`coalesce(sum(${journalLines.credit}),0)::bigint`,
  }).from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
    .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
    .leftJoin(costCenters, eq(costCenters.id, journalLines.costCenterId))
    .where(and(gte(journalEntries.date, from), lte(journalEntries.date, to), eq(accounts.type, "expense")))
    .groupBy(costCenters.id, costCenters.code, costCenters.name, accounts.id, accounts.code, accounts.name)
    .orderBy(costCenters.code, accounts.code);
  const total = rows.reduce((sum, row) => sum + Number(row.debit) - Number(row.credit), 0);
  return <div>
    <ReportToolbar from={from} to={to} />
    <section className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4 md:p-6">
      <div className="mb-3"><h2 className="text-lg font-black">هزینه‌یابی بر اساس مرکز هزینه</h2><p className="mt-1 text-sm text-base-content/55">هزینه‌های ثبت‌شده به تفکیک مرکز و حساب، از {formatJalali(from)} تا {formatJalali(to)}</p></div>
      {rows.length ? <div className="overflow-x-auto"><table className="table table-sm min-w-[780px]"><thead><tr><th>مرکز هزینه</th><th>حساب هزینه</th><th className="text-left">بدهکار</th><th className="text-left">بستانکار</th><th className="text-left">هزینه خالص</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.centerId ?? "none"}-${row.accountCode}`}><td>{row.centerName ? <span><b>{row.centerCode}</b> · {row.centerName}</span> : <span className="text-warning">بدون مرکز هزینه</span>}</td><td>{row.accountCode} · {row.accountName}</td><td className="text-left">{Number(row.debit) ? formatPrice(Number(row.debit)) : "—"}</td><td className="text-left">{Number(row.credit) ? formatPrice(Number(row.credit)) : "—"}</td><td className="text-left font-bold">{formatPrice(Math.abs(Number(row.debit) - Number(row.credit)))}</td></tr>)}</tbody><tfoot><tr className="font-black"><td colSpan={4}>جمع هزینه خالص دوره</td><td className="text-left">{formatPrice(Math.abs(total))}</td></tr></tfoot></table></div> : <EmptyBox title="هزینه‌ای در این بازه ثبت نشده است" />}
      <p className="mt-3 text-xs text-base-content/50">برای هزینه‌های ثبت‌شده بدون مرکز، در جزئیات سند مرکز هزینه انتخاب کنید. اسناد خودکار حقوق و رزرو به‌صورت پیش‌فرض در ردیف «بدون مرکز هزینه» دیده می‌شوند.</p>
    </div></section>
  </div>;
}
