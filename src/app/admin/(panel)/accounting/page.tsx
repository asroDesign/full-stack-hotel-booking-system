import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { journalBook, ledger } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { JournalFilters, ReportToolbar } from "@/components/admin/accounting-ui";
import { cn, faNum, formatJalali, formatPrice } from "@/lib/utils";

const sourceLabel: Record<string, [string, string]> = {
  reservation: ["رزرو", "badge-info"],
  income: ["درآمد", "badge-success"],
  expense: ["هزینه", "badge-error"],
  manual: ["دستی", "badge-ghost"],
  payroll: ["حقوق و بیمه", "badge-warning"],
};

export default async function AccountingDashboard({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; source?: string; q?: string }> }) {
  const params = await searchParams;
  const { from, to } = reportRange(params);
  const source = ["reservation", "income", "expense", "manual", "payroll"].includes(params.source ?? "") ? params.source : undefined;
  const query = (params.q ?? "").trim().slice(0, 60);
  const fetched = await journalBook(query ? "1900-01-01" : from, query ? "2999-12-31" : to, { source, q: query || undefined });
  const entries = [...fetched].reverse();
  const moneyAccounts = await db.select().from(accounts).where(inArray(accounts.code, ["110101", "110201", "110202", "130101", "220101"]));
  const keyBalances = await Promise.all(moneyAccounts.map(async (account) => ({ account, balance: await ledger(account.id, "1900-01-01", to) })));
  const debitTotal = entries.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.debit), 0), 0);
  const creditTotal = entries.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.credit), 0), 0);
  const exportParams = new URLSearchParams({ report: "journal", from, to });
  if (source) exportParams.set("source", source);
  if (query) exportParams.set("q", query);

  return <div className="space-y-4">
    <div className="flex flex-wrap justify-end gap-2 print:hidden">
      <Link href="/admin/accounting/entry" className="btn btn-sm btn-success btn-soft">ثبت درآمد / هزینه</Link>
      <Link href="/admin/accounting/entry?manual=1" className="btn btn-sm btn-primary">ثبت سند دستی</Link>
    </div>
    <ReportToolbar from={from} to={to} exportHref={`/api/accounting/export?${exportParams.toString()}`} />
    <JournalFilters source={source ?? "all"} query={query} action="/admin/accounting" />
    <section className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-4 md:p-6">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b border-base-200 pb-4">
          <div><h2 className="text-xl font-black">اسناد صادرشده</h2><p className="mt-1 text-sm text-base-content/55">فهرست اسناد حسابداری از {formatJalali(from)} تا {formatJalali(to)}، همراه با روکش چاپی و جزئیات هر سند.</p></div>
          <div className="flex flex-wrap gap-2 text-xs"><span className="badge badge-outline">{faNum(entries.length)} سند</span><span className="badge badge-success badge-soft">بدهکار {formatPrice(debitTotal)}</span><span className="badge badge-info badge-soft">بستانکار {formatPrice(creditTotal)}</span></div>
        </header>
        {entries.length ? <div className="grid gap-3">
          {entries.map((entry) => {
            const debit = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
            const credit = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);
            const label = sourceLabel[entry.source] ?? [entry.source, "badge-ghost"];
            return <article key={entry.id} className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3 bg-base-200/30 p-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-11 min-w-11 place-items-center rounded-xl bg-primary/10 px-2 font-mono text-sm font-black text-primary">{faNum(entry.id)}</span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold">{entry.description || "سند بدون شرح"}</h3><span className={cn("badge badge-sm badge-soft", label[1])}>{label[0]}</span>{entry.sourceType.startsWith("reversal:") && <span className="badge badge-sm badge-warning">برگشت</span>}</div><p className="mt-1 text-xs text-base-content/55">تاریخ {formatJalali(entry.date)} · {faNum(entry.lines.length)} آرتیکل · {entry.createdBy || "ثبت سیستمی"}</p></div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs"><span className="rounded-lg bg-success/10 px-2.5 py-1.5 text-success">بدهکار {formatPrice(debit)}</span><span className="rounded-lg bg-info/10 px-2.5 py-1.5 text-info">بستانکار {formatPrice(credit)}</span></div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-base-200 px-4 py-3">
                <span className={cn("text-xs", debit === credit ? "text-success" : "text-error")}>{debit === credit ? "سند متوازن" : "اختلاف تراز؛ نیازمند بررسی"}</span>
                <div className="flex flex-wrap gap-2"><Link href={`/print/journal/${entry.id}`} className="btn btn-sm btn-outline">چاپ روکش</Link><Link href={`/admin/accounting/voucher/${entry.id}`} className="btn btn-sm btn-primary btn-soft">جزئیات سند</Link></div>
              </div>
            </article>;
          })}
        </div> : <div className="rounded-2xl border border-dashed border-base-300 p-10 text-center"><p className="font-bold">در این بازه سندی صادر نشده است</p><p className="mt-1 text-sm text-base-content/55">بازهٔ زمانی یا فیلتر را تغییر دهید، یا یک درآمد، هزینه و سند دستی ثبت کنید.</p></div>}
      </div>
    </section>
    <section className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-extrabold">مانده حساب‌های کلیدی</h2><p className="mt-1 text-xs text-base-content/55">مانده تجمعی تا {formatJalali(to)}</p></div><div className="flex flex-wrap gap-2"><Link href="/admin/accounting/entry" className="btn btn-sm btn-success btn-soft">ثبت سریع درآمد / هزینه</Link><Link href="/admin/accounting/entry?manual=1" className="btn btn-sm btn-primary">سند دستی</Link></div></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">{keyBalances.map(({ account, balance }) => <Link key={account.id} href={`/admin/accounting/ledger?account=${account.id}&to=${to}`} className="rounded-xl border border-base-200 bg-base-200/20 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"><span className="block text-xs text-base-content/60">{account.name}</span><b className="mt-1 block text-sm">{formatPrice(Math.abs(balance?.closing ?? 0))} <small className="font-normal text-base-content/50">{(balance?.closing ?? 0) >= 0 ? "بدهکار" : "بستانکار"}</small></b></Link>)}</div>
      </div>
    </section>
  </div>;
}
