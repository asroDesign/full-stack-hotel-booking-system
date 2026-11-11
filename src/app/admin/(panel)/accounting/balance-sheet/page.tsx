import Link from "next/link";
import { profitLoss, trialBalance } from "@/lib/accounting";
import { AsOfToolbar } from "@/components/admin/accounting-ui";
import { cn, formatJalali, formatPrice, todayISO } from "@/lib/utils";

function amount(value: number) { return `${formatPrice(Math.abs(value))}${value < 0 ? " (مانده غیرعادی)" : ""}`; }

export default async function BalanceSheetPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const sp = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(sp.to ?? "") ? sp.to! : todayISO();
  const [{ rows }, result] = await Promise.all([trialBalance("1900-01-01", date, 2), profitLoss("1900-01-01", date)]);
  const assets = rows.filter((row) => row.type === "asset").map((row) => ({ ...row, value: row.balDebit - row.balCredit })).filter((row) => row.value !== 0);
  const liabilities = rows.filter((row) => row.type === "liability").map((row) => ({ ...row, value: row.balCredit - row.balDebit })).filter((row) => row.value !== 0);
  const equity = rows.filter((row) => row.type === "equity").map((row) => ({ ...row, value: row.balCredit - row.balDebit })).filter((row) => row.value !== 0);
  const assetTotal = assets.reduce((sum, row) => sum + row.value, 0);
  const liabilityTotal = liabilities.reduce((sum, row) => sum + row.value, 0);
  const equityTotal = equity.reduce((sum, row) => sum + row.value, 0);
  const resultTotal = result.net;
  const liabilitiesAndEquity = liabilityTotal + equityTotal + resultTotal;
  const isBalanced = Math.abs(assetTotal - liabilitiesAndEquity) < 1;
  const blocks = [
    { title: "دارایی‌ها", rows: assets, total: assetTotal, tone: "text-primary" },
    { title: "بدهی‌ها", rows: liabilities, total: liabilityTotal, tone: "text-warning" },
    { title: "حقوق صاحبان سرمایه", rows: equity, total: equityTotal, tone: "text-secondary" },
  ];
  return <div>
    <AsOfToolbar date={date} exportHref={`/api/accounting/export?report=bs&to=${date}`} />
    <div className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-5 p-4 md:p-7">
      <div className="text-center"><h2 className="text-xl font-black">ترازنامه</h2><p className="mt-1 text-sm text-base-content/55">وضعیت مالی تا پایان {formatJalali(date)}</p></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-base-300 p-4"><h3 className="mb-3 font-extrabold text-primary">دارایی‌ها</h3><Rows rows={assets} date={date} /><div className="mt-3 flex justify-between border-t border-base-300 pt-3 font-black"><span>جمع دارایی‌ها</span><span>{formatPrice(assetTotal)}</span></div></section>
        <div className="space-y-4">{blocks.slice(1).map((block) => <section key={block.title} className="rounded-2xl border border-base-300 p-4"><h3 className={cn("mb-3 font-extrabold", block.tone)}>{block.title}</h3><Rows rows={block.rows} date={date} /><div className="mt-3 flex justify-between border-t border-base-300 pt-3 font-black"><span>جمع {block.title}</span><span>{formatPrice(block.total)}</span></div></section>)}
          <section className="rounded-2xl border border-base-300 bg-base-200/40 p-4"><div className="flex justify-between text-sm"><span>سود / زیان انباشته ثبت‌شده</span><span className={resultTotal < 0 ? "text-error" : ""}>{formatPrice(Math.abs(resultTotal))} {resultTotal < 0 ? "زیان" : "سود"}</span></div><div className="mt-3 flex justify-between border-t border-base-300 pt-3 font-black"><span>جمع بدهی و سرمایه با نتیجه دوره</span><span>{formatPrice(liabilitiesAndEquity)}</span></div></section>
        </div>
      </div>
      <div className={cn("alert", isBalanced ? "alert-success" : "alert-warning")}><span>{isBalanced ? "ترازنامه متوازن است." : "اختلاف تراز دیده می‌شود؛ حساب‌ها و اسناد ثبت‌شده را بررسی کنید."}</span><b>دارایی: {formatPrice(assetTotal)} · بدهی و سرمایه: {formatPrice(liabilitiesAndEquity)}</b></div>
    </div></div>
  </div>;
}

function Rows({ rows, date }: { rows: { id: number; code: string; name: string; value: number }[]; date: string }) {
  return rows.length ? <ul className="divide-y divide-base-200">{rows.map((row) => <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-sm"><Link className="link-hover" href={`/admin/accounting/ledger?account=${row.id}&from=1900-01-01&to=${date}`}>{row.code} · {row.name}</Link><span className="whitespace-nowrap font-semibold">{amount(row.value)}</span></li>)}</ul> : <p className="py-3 text-sm text-base-content/50">مانده‌ای ثبت نشده است.</p>;
}
