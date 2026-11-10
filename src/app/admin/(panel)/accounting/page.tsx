import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { ArrowDownCircle, ArrowUpCircle, Landmark, TrendingUp, Wallet, FileText } from "lucide-react";
import { db } from "@/db";
import { accounts, journalEntries } from "@/db/schema";
import { ledger, profitLoss } from "@/lib/accounting";
import { cn, faNum, formatJalali, formatPrice, isoToJalali, jalaliToISO, jMonths, todayISO } from "@/lib/utils";

const srcLabel: Record<string, [string, string]> = {
  reservation: ["رزرو", "badge-info"],
  income: ["درآمد", "badge-success"],
  expense: ["هزینه", "badge-error"],
  manual: ["دستی", "badge-ghost"],
};

export default async function AccountingDashboard() {
  const today = todayISO();
  const t = isoToJalali(today);
  const monthFrom = jalaliToISO(t.jy, t.jm, 1);
  const yearFrom = jalaliToISO(t.jy, 1, 1);
  const [month, year, recent, moneyAccs] = await Promise.all([
    profitLoss(monthFrom, today),
    profitLoss(yearFrom, today),
    db.select().from(journalEntries).orderBy(desc(journalEntries.id)).limit(8),
    db.select().from(accounts).where(inArray(accounts.code, ["110101", "110201", "110202", "130101", "220101"])),
  ]);
  const balances = await Promise.all(moneyAccs.map(async (a) => ({ a, l: await ledger(a.id, "1900-01-01", today) })));

  const cards = [
    { l: `درآمد ${jMonths[t.jm - 1]}`, v: month.revenue.total, Icon: ArrowDownCircle, c: "text-success bg-success/10" },
    { l: `هزینه ${jMonths[t.jm - 1]}`, v: month.expense.total, Icon: ArrowUpCircle, c: "text-error bg-error/10" },
    { l: `سود خالص ${jMonths[t.jm - 1]}`, v: month.net, Icon: TrendingUp, c: "text-primary bg-primary/10" },
    { l: `سود خالص سال ${faNum(t.jy)}`, v: year.net, Icon: Wallet, c: "text-secondary bg-secondary/15" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ l, v, Icon, c }) => (
          <div key={l} className="card card-border bg-base-100 shadow-sm">
            <div className="card-body p-5">
              <span className={cn("grid h-11 w-11 place-items-center rounded-box", c)}><Icon className="h-5 w-5" /></span>
              <div className="mt-2 text-sm text-base-content/60">{l}</div>
              <div className={cn("text-2xl font-black", v < 0 && "text-error")}>{v < 0 ? "−" : ""}{formatPrice(Math.abs(v))}</div>
              <div className="text-xs text-base-content/40">تومان</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-3 p-5">
            <h3 className="flex items-center gap-2 font-extrabold"><Landmark className="h-5 w-5 text-primary" /> مانده حساب‌های کلیدی</h3>
            <ul className="divide-y divide-base-200">
              {balances.sort((x, y) => x.a.code.localeCompare(y.a.code)).map(({ a, l }) => (
                <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link href={`/admin/accounting/ledger?account=${a.id}`} className="link-hover">{a.name}</Link>
                  <span className={cn("font-bold", (l?.closing ?? 0) < 0 && "text-warning")}>{formatPrice(Math.abs(l?.closing ?? 0))} <span className="text-[10px] font-normal text-base-content/50">{(l?.closing ?? 0) >= 0 ? "بد" : "بس"}</span></span>
                </li>
              ))}
            </ul>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link href="/admin/accounting/entry" className="btn btn-success btn-sm btn-soft">ثبت درآمد / هزینه</Link>
              <Link href="/admin/accounting/entry#voucher" className="btn btn-primary btn-sm btn-soft">سند دستی</Link>
            </div>
          </div>
        </div>
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-3 p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-extrabold"><FileText className="h-5 w-5 text-primary" /> آخرین اسناد</h3>
              <Link href="/admin/accounting/journal" className="link link-primary text-sm">دفتر روزنامه</Link>
            </div>
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-base-content/50">هنوز سندی ثبت نشده است.</p>
            ) : (
              <ul className="divide-y divide-base-200">
                {recent.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="badge badge-outline badge-sm font-mono">{faNum(e.id)}</span>
                    <span className="min-w-0 flex-1 truncate">{e.description}</span>
                    <span className={cn("badge badge-sm badge-soft", srcLabel[e.source]?.[1])}>{srcLabel[e.source]?.[0] ?? e.source}</span>
                    <span className="hidden text-xs text-base-content/50 sm:inline">{formatJalali(e.date)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
