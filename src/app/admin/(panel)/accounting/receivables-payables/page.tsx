import Link from "next/link";
import { trialBalance } from "@/lib/accounting";
import { AsOfToolbar } from "@/components/admin/accounting-ui";
import { formatJalali, formatPrice, todayISO } from "@/lib/utils";

export default async function ReceivablesPayablesPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : todayISO();
  const { rows } = await trialBalance("1900-01-01", date, 3);
  const receivables = rows.filter((row) => row.type === "asset" && row.code.startsWith("13")).map((row) => ({ ...row, balance: row.balDebit - row.balCredit }));
  const payables = rows.filter((row) => row.type === "liability" && row.code.startsWith("21")).map((row) => ({ ...row, balance: row.balCredit - row.balDebit }));
  return <div>
    <AsOfToolbar date={date} exportHref={`/api/accounting/export?report=arap&to=${date}`} />
    <div className="mb-4 text-center"><h2 className="text-xl font-black">گزارش دریافتنی‌ها و پرداختنی‌ها</h2><p className="mt-1 text-sm text-base-content/55">مانده حساب‌های دریافتنی و بدهی‌های ثبت‌شده تا {formatJalali(date)}</p></div>
    <div className="grid gap-5 xl:grid-cols-2">
      <Report title="حساب‌های دریافتنی" rows={receivables} date={date} nature="debit" />
      <Report title="حساب‌های پرداختنی" rows={payables} date={date} nature="credit" />
    </div>
  </div>;
}

function Report({ title, rows, date, nature }: { title: string; rows: { id: number; code: string; name: string; balDebit: number; balCredit: number; balance: number }[]; date: string; nature: "debit" | "credit" }) {
  const total = rows.reduce((sum, row) => sum + row.balance, 0);
  return <section className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4 md:p-6"><div className="flex items-center justify-between gap-2"><h3 className="font-extrabold">{title}</h3><span className="badge badge-outline">{rows.length} حساب</span></div>{rows.length ? <div className="mt-2 overflow-x-auto"><table className="table table-sm"><thead><tr><th>کد و حساب</th><th className="text-left">مانده</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><Link className="link-hover" href={`/admin/accounting/ledger?account=${row.id}&from=1900-01-01&to=${date}`}>{row.code} · {row.name}</Link></td><td className="text-left font-semibold">{formatPrice(Math.abs(row.balance))} {row.balance < 0 ? (nature === "debit" ? "بستانکار" : "بدهکار") : nature === "debit" ? "بدهکار" : "بستانکار"}</td></tr>)}</tbody><tfoot><tr className="font-black"><td>جمع</td><td className="text-left">{formatPrice(total)}</td></tr></tfoot></table></div> : <p className="py-5 text-sm text-base-content/50">مانده‌ای ثبت نشده است.</p>}</div></section>;
}
