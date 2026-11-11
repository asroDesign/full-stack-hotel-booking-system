import Link from "next/link";
import { trialBalance } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { formatJalali, formatPrice } from "@/lib/utils";

const payrollAccounts = new Set(["210102", "210103", "210104"]);
export default async function VendorAccountsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = reportRange(params);
  const { rows } = await trialBalance(from, to, 3);
  const vendors = rows.filter((row) => row.type === "liability" && row.code.startsWith("2101") && !payrollAccounts.has(row.code));
  const total = vendors.reduce((sum, row) => sum + row.balCredit - row.balDebit, 0);
  return <div><ReportToolbar from={from} to={to} exportHref={`/api/accounting/export?report=vendors&from=${from}&to=${to}`} /><section className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4 md:p-6"><div className="mb-3 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-black">حساب فروشندگان</h2><p className="mt-1 text-sm text-base-content/55">مانده و گردش حساب‌های تفصیلی فروشندگان از {formatJalali(from)} تا {formatJalali(to)}</p></div><Link href="/admin/accounting/accounts" className="btn btn-sm btn-outline">تعریف حساب فروشنده</Link></div>{vendors.length ? <div className="overflow-x-auto"><table className="table table-sm"><thead><tr><th>کد حساب</th><th>فروشنده</th><th className="text-left">مانده ابتدای دوره</th><th className="text-left">بدهکار دوره</th><th className="text-left">بستانکار دوره</th><th className="text-left">مانده نهایی</th></tr></thead><tbody>{vendors.map((row) => <tr key={row.id}><td className="font-mono" dir="ltr">{row.code}</td><td><Link className="link-hover" href={`/admin/accounting/ledger?account=${row.id}&from=${from}&to=${to}`}>{row.name}</Link></td><td className="text-left">{formatPrice(Math.abs(row.openCredit - row.openDebit))}</td><td className="text-left">{row.debit ? formatPrice(row.debit) : "—"}</td><td className="text-left">{row.credit ? formatPrice(row.credit) : "—"}</td><td className="text-left font-bold">{formatPrice(Math.abs(row.balCredit - row.balDebit))} {row.balCredit >= row.balDebit ? "بستانکار" : "بدهکار"}</td></tr>)}</tbody><tfoot><tr className="font-black"><td colSpan={5}>جمع مانده فروشندگان</td><td className="text-left">{formatPrice(Math.abs(total))} {total >= 0 ? "بستانکار" : "بدهکار"}</td></tr></tfoot></table></div> : <EmptyBox title="برای فروشندگان در این بازه گردش ثبت نشده است" desc="برای ثبت گردش مجزا، حساب تفصیلی هر فروشنده را زیر حساب پرداختنی تجاری تعریف کنید." />}</div></section></div>;
}
