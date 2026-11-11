import Link from "next/link";
import { getAccounts, ledger } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { GatewaySettlementForm, ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { faNum, formatJalali, formatPrice } from "@/lib/utils";

export default async function GatewaySettlementsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const params = await searchParams;
  const { from, to } = reportRange(params);
  const account = (await getAccounts()).find((item) => item.code === "110202");
  const data = account ? await ledger(account.id, from, to) : null;
  const totalDebit = data?.rows.reduce((sum, row) => sum + row.debit, 0) ?? 0;
  const totalCredit = data?.rows.reduce((sum, row) => sum + row.credit, 0) ?? 0;
  return <div className="space-y-4">
    <ReportToolbar from={from} to={to} exportHref={account ? `/api/accounting/export?report=ledger&account=${account.id}&from=${from}&to=${to}` : undefined} />
    <section className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4 md:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-black">مغایرت‌گیری و تسویه درگاه</h2><p className="mt-1 text-sm text-base-content/55">دفتر حساب درگاه اینترنتی از {formatJalali(from)} تا {formatJalali(to)}</p></div><Link href="/admin/accounting/entry#voucher" className="btn btn-sm btn-outline">ثبت سند دستی</Link></div>
      {!data || !account ? <EmptyBox title="حساب درگاه تعریف نشده است" /> : <><div className="my-3 grid gap-3 sm:grid-cols-3"><Metric label="مانده ابتدای بازه" value={data.opening} /><Metric label="واریزی ثبت‌شده" value={totalDebit} /><Metric label="تسویه ثبت‌شده" value={totalCredit} /><Metric label="مانده پایان بازه" value={data.closing} /></div>
        {data.rows.length ? <div className="overflow-x-auto"><table className="table table-sm"><thead><tr><th>تاریخ</th><th>سند</th><th>شرح</th><th className="text-left">ورودی درگاه</th><th className="text-left">خروج / تسویه</th><th className="text-left">مانده</th></tr></thead><tbody>{data.rows.map((row) => <tr key={row.id}><td>{formatJalali(row.date)}</td><td><Link className="link-hover" href={`/admin/accounting/voucher/${row.entryId}`}>#{faNum(row.entryId)}</Link></td><td>{row.description || row.entryDesc}</td><td className="text-left">{row.debit ? formatPrice(row.debit) : "—"}</td><td className="text-left">{row.credit ? formatPrice(row.credit) : "—"}</td><td className="text-left font-bold">{formatPrice(Math.abs(row.balance))} {row.balance >= 0 ? "بدهکار" : "بستانکار"}</td></tr>)}</tbody></table></div> : <EmptyBox title="در این بازه گردش درگاهی ثبت نشده است" />}
      </>}
    </div></section><GatewaySettlementForm />
  </div>;
}
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-base-200/50 p-3"><div className="text-xs text-base-content/55">{label}</div><div className="mt-1 font-black">{formatPrice(Math.abs(value))} <span className="text-[10px] font-normal">{value < 0 ? "بستانکار" : "تومان"}</span></div></div>; }
