import { getAccounts, ledger } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { AccountPicker, ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { faNum, formatJalali, formatPrice } from "@/lib/utils";

const bal = (n: number) => `${formatPrice(Math.abs(n))} ${n > 0 ? "بد" : n < 0 ? "بس" : ""}`;

export default async function LedgerPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; account?: string }> }) {
  const sp = await searchParams;
  const { from, to } = reportRange(sp);
  const accs = await getAccounts();
  const rows = accs.map((a) => ({ id: a.id, code: a.code, name: a.name, level: a.level, type: a.type, parentId: a.parentId, isSystem: a.isSystem, isActive: a.isActive }));
  const accountId = Number(sp.account) || 0;
  const data = accountId ? await ledger(accountId, from, to) : null;
  return (
    <div>
      <ReportToolbar from={from} to={to} exportHref={accountId ? `/api/accounting/export?report=ledger&account=${accountId}&from=${from}&to=${to}` : undefined}>
        <div><label className="field-label">حساب (کل، معین یا تفصیلی)</label><AccountPicker accounts={rows} value={accountId} /></div>
      </ReportToolbar>
      {!data ? (
        <EmptyBox title="یک حساب را انتخاب کنید" desc="گردش حساب‌های کل و معین شامل همه زیرحساب‌هاست." />
      ) : (
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body p-4 md:p-6">
            <h2 className="text-lg font-black">دفتر {["", "کل", "معین", "تفصیلی"][data.account.level]}: {data.account.code} - {data.account.name}</h2>
            <p className="text-sm text-base-content/50">از {formatJalali(from)} تا {formatJalali(to)}</p>
            <div className="overflow-x-auto">
              <table className="table table-sm min-w-[860px]">
                <thead className="bg-base-200"><tr><th>تاریخ</th><th>سند</th><th>حساب</th><th>شرح</th><th className="text-left">بدهکار</th><th className="text-left">بستانکار</th><th className="text-left">مانده</th></tr></thead>
                <tbody>
                  <tr className="bg-base-200/40 font-medium"><td colSpan={6}>مانده ابتدای دوره</td><td className="text-left">{bal(data.opening)}</td></tr>
                  {data.rows.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap">{formatJalali(r.date)}</td>
                      <td>#{faNum(r.entryId)}</td>
                      <td className="text-xs">{r.code} {r.name}</td>
                      <td className="max-w-80 truncate" title={r.entryDesc}>{r.description || r.entryDesc}</td>
                      <td className="text-left">{r.debit ? formatPrice(r.debit) : ""}</td>
                      <td className="text-left">{r.credit ? formatPrice(r.credit) : ""}</td>
                      <td className="text-left font-medium">{bal(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-sm font-black">
                    <td colSpan={4}>جمع گردش / مانده پایان دوره</td>
                    <td className="text-left">{formatPrice(data.rows.reduce((s, r) => s + r.debit, 0))}</td>
                    <td className="text-left">{formatPrice(data.rows.reduce((s, r) => s + r.credit, 0))}</td>
                    <td className="text-left">{bal(data.closing)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
