import Link from "next/link";
import { trialBalance } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { LevelSelect, ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { formatJalali, formatPrice } from "@/lib/utils";

const f = (n: number) => (n ? formatPrice(n) : "—");

export default async function TrialBalancePage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; level?: string }> }) {
  const sp = await searchParams;
  const { from, to } = reportRange(sp);
  const level = ([1, 2, 3].includes(Number(sp.level)) ? Number(sp.level) : 2) as 1 | 2 | 3;
  const { rows, total } = await trialBalance(from, to, level);
  const ok = total.balDebit === total.balCredit && total.debit === total.credit;
  return (
    <div>
      <ReportToolbar from={from} to={to} exportHref={`/api/accounting/export?report=trial&from=${from}&to=${to}&level=${level}`}>
        <div><label className="field-label">سطح تراز</label><LevelSelect level={level} /></div>
      </ReportToolbar>
      <div className="card card-border bg-base-100 shadow-sm">
        <div className="card-body p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black">تراز آزمایشی {["", "کل", "معین", "تفصیلی"][level]} <span className="text-sm font-normal text-base-content/50">از {formatJalali(from)} تا {formatJalali(to)}</span></h2>
            <span className={ok ? "badge badge-success" : "badge badge-error"}>{ok ? "تراز است ✓" : "تراز نیست"}</span>
          </div>
          {rows.length === 0 ? (
            <EmptyBox title="گردشی در این بازه وجود ندارد" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm min-w-[980px]">
                <thead className="bg-base-200">
                  <tr><th rowSpan={2}>کد</th><th rowSpan={2}>نام حساب</th><th colSpan={2} className="text-center">مانده ابتدای دوره</th><th colSpan={2} className="text-center">گردش دوره</th><th colSpan={2} className="text-center">مانده پایان دوره</th></tr>
                  <tr><th className="text-left">بدهکار</th><th className="text-left">بستانکار</th><th className="text-left">بدهکار</th><th className="text-left">بستانکار</th><th className="text-left">بدهکار</th><th className="text-left">بستانکار</th></tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-base-200/50">
                      <td className="font-mono" dir="ltr" style={{ textAlign: "right" }}>{r.code}</td>
                      <td><Link href={`/admin/accounting/ledger?account=${r.id}&from=${from}&to=${to}`} className="link-hover">{r.name}</Link></td>
                      <td className="text-left">{f(r.openDebit)}</td><td className="text-left">{f(r.openCredit)}</td>
                      <td className="text-left">{f(r.debit)}</td><td className="text-left">{f(r.credit)}</td>
                      <td className="text-left font-medium">{f(r.balDebit)}</td><td className="text-left font-medium">{f(r.balCredit)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-sm font-black">
                    <td colSpan={2}>جمع</td>
                    <td className="text-left">{f(total.openDebit)}</td><td className="text-left">{f(total.openCredit)}</td>
                    <td className="text-left">{f(total.debit)}</td><td className="text-left">{f(total.credit)}</td>
                    <td className="text-left">{f(total.balDebit)}</td><td className="text-left">{f(total.balCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
