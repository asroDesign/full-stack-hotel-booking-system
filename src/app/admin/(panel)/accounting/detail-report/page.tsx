import Link from "next/link";
import { trialBalance } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { formatJalali, formatPrice } from "@/lib/utils";

export default async function DetailAccountsReport({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = reportRange(params);
  const { rows } = await trialBalance(from, to, 3);
  return <div><ReportToolbar from={from} to={to} exportHref={`/api/accounting/export?report=trial&from=${from}&to=${to}&level=3`} /><div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4 md:p-6"><div className="mb-3"><h2 className="text-lg font-black">گزارش تفصیلی حساب‌ها</h2><p className="mt-1 text-sm text-base-content/55">گردش حساب‌های تفصیلی از {formatJalali(from)} تا {formatJalali(to)}</p></div>{rows.length ? <div className="overflow-x-auto"><table className="table table-sm min-w-[850px]"><thead><tr><th>کد</th><th>حساب تفصیلی</th><th className="text-left">اول دوره بدهکار</th><th className="text-left">اول دوره بستانکار</th><th className="text-left">گردش بدهکار</th><th className="text-left">گردش بستانکار</th><th className="text-left">مانده پایان</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="font-mono" dir="ltr">{row.code}</td><td><Link className="link-hover" href={`/admin/accounting/ledger?account=${row.id}&from=${from}&to=${to}`}>{row.name}</Link></td><td className="text-left">{row.openDebit ? formatPrice(row.openDebit) : "—"}</td><td className="text-left">{row.openCredit ? formatPrice(row.openCredit) : "—"}</td><td className="text-left">{row.debit ? formatPrice(row.debit) : "—"}</td><td className="text-left">{row.credit ? formatPrice(row.credit) : "—"}</td><td className="text-left font-bold">{formatPrice(row.balDebit || row.balCredit)} {row.balDebit ? "بدهکار" : row.balCredit ? "بستانکار" : ""}</td></tr>)}</tbody></table></div> : <EmptyBox title="حساب تفصیلی با گردش در این بازه پیدا نشد" />}</div></div></div>;
}
