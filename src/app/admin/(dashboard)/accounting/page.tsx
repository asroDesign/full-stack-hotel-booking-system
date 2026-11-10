import AccountingWorkspace from "@/components/admin/AccountingWorkspace";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getJournalBook, getProfitLoss, getTrialBalance, listAccounts } from "@/lib/accounting";
import { formatMoney, todayISO, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminAccountingPage() {
  const [accounts, entries, trial, profitLoss] = await Promise.all([
    listAccounts(),
    getJournalBook({ limit: 120 }),
    getTrialBalance(),
    getProfitLoss(),
  ]);

  const trialDebit = trial.reduce((sum, row) => sum + row.debit, 0);
  const trialCredit = trial.reduce((sum, row) => sum + row.credit, 0);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="حسابداری دوطرفه"
        title="حسابداری، دفتر روزنامه و گزارش‌ها"
        description="حساب‌های کل، معین و تفصیلی؛ ثبت دستی هزینه و درآمد؛ دفتر روزنامه، تراز آزمایشی و صورت سود و زیان با خروجی CSV."
        action={
          <span className="rounded-xl border border-cream-200 bg-white px-3 py-1.5 text-[10px] text-forest-800/60">
            امروز: {todayISO()}
          </span>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="جمع درآمدها" value={formatMoney(profitLoss.totalRevenue)} icon="📈" tone="success" />
        <StatCard label="جمع هزینه‌ها" value={formatMoney(profitLoss.totalExpenses)} icon="📉" tone="warning" />
        <StatCard
          label="سود / زیان خالص"
          value={formatMoney(profitLoss.netProfit)}
          icon="💹"
          tone={profitLoss.netProfit >= 0 ? "gold" : "warning"}
        />
        <StatCard
          label="تعداد اسناد"
          value={toFa(entries.length)}
          icon="📚"
          tone="dark"
          hint={`جمع بدهکار ${formatMoney(trialDebit)} / بستانکار ${formatMoney(trialCredit)}`}
        />
      </div>

      <AccountingWorkspace
        accounts={accounts.map((account) => ({
          id: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          level: account.level,
          parentCode: account.parentCode,
        }))}
        entries={entries.map((entry) => ({
          id: entry.id,
          number: entry.number,
          date: entry.date,
          description: entry.description,
          reference: entry.reference,
          source: entry.source,
          lines: entry.lines.map((line) => ({
            id: line.id,
            accountCode: line.accountCode,
            accountName: line.accountName,
            debit: line.debit,
            credit: line.credit,
            description: line.description,
          })),
        }))}
        trial={trial}
        profitLoss={profitLoss}
      />
    </div>
  );
}
