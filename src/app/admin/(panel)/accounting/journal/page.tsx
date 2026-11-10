import { journalBook } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { DeleteVoucherButton, ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { cn, faNum, formatJalali, formatPrice } from "@/lib/utils";

const srcLabel: Record<string, [string, string]> = {
  reservation: ["رزرو (خودکار)", "badge-info"],
  income: ["درآمد", "badge-success"],
  expense: ["هزینه", "badge-error"],
  manual: ["سند دستی", "badge-ghost"],
};

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; source?: string; q?: string }> }) {
  const sp = await searchParams;
  const { from, to } = reportRange(sp);
  const source = ["reservation", "income", "expense", "manual"].includes(sp.source ?? "") ? sp.source : undefined;
  const q = (sp.q ?? "").slice(0, 60);
  const entries = await journalBook(q ? "1900-01-01" : from, q ? "2999-12-31" : to, { source, q: q || undefined });
  const td = entries.reduce((s, e) => s + e.lines.reduce((x, l) => x + Number(l.debit), 0), 0);
  const tc = entries.reduce((s, e) => s + e.lines.reduce((x, l) => x + Number(l.credit), 0), 0);
  return (
    <div>
      <ReportToolbar from={from} to={to} exportHref={`/api/accounting/export?report=journal&from=${from}&to=${to}${source ? `&source=${source}` : ""}`} />
      <div className="card card-border bg-base-100 shadow-sm">
        <div className="card-body p-4 md:p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-black">دفتر روزنامه <span className="text-sm font-normal text-base-content/50">از {formatJalali(from)} تا {formatJalali(to)}</span></h2>
            <span className="badge badge-ghost">{faNum(entries.length)} سند</span>
          </div>
          {entries.length === 0 ? (
            <EmptyBox title="سندی در این بازه ثبت نشده است" />
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm min-w-[860px]">
                <thead className="bg-base-200">
                  <tr><th className="w-20">سند</th><th className="w-28">تاریخ</th><th>کد حساب</th><th>شرح</th><th className="w-36 text-left">بدهکار</th><th className="w-36 text-left">بستانکار</th></tr>
                </thead>
                {entries.map((e) => (
                  <tbody key={e.id} className="border-b-2 border-base-300">
                    <tr className="bg-base-200/40">
                      <td className="font-bold">#{faNum(e.id)}</td>
                      <td>{formatJalali(e.date)}</td>
                      <td colSpan={2} className="font-medium">
                        {e.description} <span className={cn("badge badge-xs badge-soft mr-1", srcLabel[e.source]?.[1])}>{srcLabel[e.source]?.[0]}</span>
                      </td>
                      <td colSpan={2} className="text-left">{e.source !== "reservation" && <DeleteVoucherButton id={e.id} />}</td>
                    </tr>
                    {e.lines.map((l) => (
                      <tr key={l.id}>
                        <td /><td />
                        <td className={cn("font-mono text-xs", Number(l.credit) > 0 && "pr-8")} dir="ltr" style={{ textAlign: "right" }}>{l.code}</td>
                        <td className={cn(Number(l.credit) > 0 && "pr-8")}>{l.name}{l.description && <span className="text-xs text-base-content/50"> — {l.description}</span>}</td>
                        <td className="text-left">{Number(l.debit) ? formatPrice(Number(l.debit)) : ""}</td>
                        <td className="text-left">{Number(l.credit) ? formatPrice(Number(l.credit)) : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
                <tfoot>
                  <tr className="text-sm font-black"><td colSpan={4}>جمع کل</td><td className="text-left">{formatPrice(td)}</td><td className="text-left">{formatPrice(tc)}</td></tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
