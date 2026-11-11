import Link from "next/link";
import { trialBalance } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { formatJalali, formatPrice } from "@/lib/utils";

export default async function CostAccountingPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = reportRange(params);
  const { rows } = await trialBalance(from, to, 3);
  const costs = rows.filter((row) => row.type === "expense");
  const total = costs.reduce((sum, row) => sum + row.debit - row.credit, 0);
  return <div><ReportToolbar from={from} to={to} exportHref={`/api/accounting/export?report=trial&from=${from}&to=${to}&level=3`} /><section className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4 md:p-6"><div className="mb-3"><h2 className="text-lg font-black">گزارش هزینه‌یابی</h2><p className="mt-1 text-sm text-base-content/55">هزینه‌های ثبت‌شده به تفکیک حساب تفصیلی از {formatJalali(from)} تا {formatJalali(to)}</p></div>{costs.length ? <div className="overflow-x-auto"><table className="table table-sm"><thead><tr><th>کد</th><th>حساب هزینه</th><th className="text-left">مانده ابتدای دوره</th><th className="text-left">هزینه بدهکار</th><th className="text-left">برگشت/بستانکار</th><th className="text-left">هزینه خالص</th><th /></tr></thead><tbody>{costs.map((row) => <tr key={row.id}><td dir="ltr" className="font-mono">{row.code}</td><td>{row.name}</td><td className="text-left">{formatPrice(Math.abs(row.openDebit - row.openCredit))}</td><td className="text-left">{row.debit ? formatPrice(row.debit) : "—"}</td><td className="text-left">{row.credit ? formatPrice(row.credit) : "—"}</td><td className="text-left font-bold">{formatPrice(Math.abs(row.debit - row.credit))}</td><td><Link className="btn btn-ghost btn-xs" href={`/admin/accounting/ledger?account=${row.id}&from=${from}&to=${to}`}>دفتر حساب</Link></td></tr>)}</tbody><tfoot><tr className="font-black"><td colSpan={5}>جمع هزینه خالص دوره</td><td className="text-left">{formatPrice(Math.abs(total))}</td><td /></tr></tfoot></table></div> : <EmptyBox title="هزینه‌ای در این بازه ثبت نشده است" />}</div></section></div>;
}
