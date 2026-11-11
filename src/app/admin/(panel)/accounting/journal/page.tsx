import { journalBook } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import Link from "next/link";
import { DeleteVoucherButton, JournalFilters, ReportToolbar } from "@/components/admin/accounting-ui";
import { EmptyBox } from "@/components/admin/ui";
import { cn, faNum, formatJalali, formatPrice } from "@/lib/utils";

const sourceLabel: Record<string, [string, string]> = {
  reservation: ["رزرو", "badge-info"],
  income: ["درآمد", "badge-success"],
  expense: ["هزینه", "badge-error"],
  manual: ["سند دستی", "badge-ghost"],
  payroll: ["حقوق و بیمه", "badge-warning"],
};

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; source?: string; q?: string }> }) {
  const params = await searchParams;
  const { from, to } = reportRange(params);
  const source = ["reservation", "income", "expense", "manual", "payroll"].includes(params.source ?? "") ? params.source : undefined;
  const query = (params.q ?? "").trim().slice(0, 60);
  const entries = await journalBook(query ? "1900-01-01" : from, query ? "2999-12-31" : to, { source, q: query || undefined });
  const debitTotal = entries.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.debit), 0), 0);
  const creditTotal = entries.reduce((sum, entry) => sum + entry.lines.reduce((lineSum, line) => lineSum + Number(line.credit), 0), 0);
  const exportParams = new URLSearchParams({ report: "journal", from, to });
  if (source) exportParams.set("source", source);
  if (query) exportParams.set("q", query);

  return <div>
    <ReportToolbar from={from} to={to} exportHref={`/api/accounting/export?${exportParams.toString()}`} />
    <JournalFilters source={source ?? "all"} query={query} />
    <section className="card card-border bg-base-100 shadow-sm">
      <div className="card-body p-4 md:p-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-black">دفتر روزنامه</h2><p className="mt-1 text-sm text-base-content/55">گردش اسناد از {formatJalali(from)} تا {formatJalali(to)}</p></div><div className="flex flex-wrap gap-2 text-xs"><span className="badge badge-outline">{faNum(entries.length)} سند</span><span className="badge badge-success badge-soft">بدهکار {formatPrice(debitTotal)}</span><span className="badge badge-info badge-soft">بستانکار {formatPrice(creditTotal)}</span></div></div>
        {entries.length === 0 ? <EmptyBox title="سندی در این بازه ثبت نشده است" /> : <div className="overflow-x-auto">
          <table className="table table-sm min-w-[900px]">
            <thead className="sticky top-0 z-10 bg-base-200"><tr><th className="w-28">تاریخ</th><th className="w-20">سند</th><th>شرح</th><th>حساب</th><th>تفصیلی</th><th className="w-36 text-left">بدهکار</th><th className="w-36 text-left">بستانکار</th></tr></thead>
            {entries.map((entry) => {
              const label = sourceLabel[entry.source] ?? [entry.source, "badge-ghost"];
              return <tbody key={entry.id} className="border-b-2 border-base-300">
                {entry.lines.map((line, index) => <tr key={line.id} className={index === 0 ? "bg-base-100" : ""}>
                  <td className="whitespace-nowrap">{index === 0 ? formatJalali(entry.date) : ""}</td>
                  <td>{index === 0 ? <Link href={`/admin/accounting/voucher/${entry.id}`} className="font-bold text-primary">#{faNum(entry.id)}</Link> : ""}</td>
                  <td className="min-w-64"><div>{index === 0 ? entry.description : line.description || ""}</div>{index === 0 && <div className="mt-1 flex flex-wrap items-center gap-1"><span className={cn("badge badge-xs badge-soft", label[1])}>{label[0]}</span>{entry.sourceType.startsWith("reversal:") && <span className="badge badge-xs badge-warning">برگشت</span>}{line.description && line.description !== entry.description && <span className="text-[10px] text-base-content/50">{line.description}</span>}<span className="print:hidden"><DeleteVoucherButton id={entry.id} /></span></div>}</td>
                  <td className="min-w-52"><span className="font-mono text-[11px]" dir="ltr">{line.code}</span><span className="mr-1">{line.name}</span></td>
                  <td>{line.costCenterName || "—"}</td>
                  <td className="text-left">{Number(line.debit) ? formatPrice(Number(line.debit)) : "—"}</td>
                  <td className="text-left">{Number(line.credit) ? formatPrice(Number(line.credit)) : "—"}</td>
                </tr>)}
              </tbody>;
            })}
            <tfoot><tr className="text-sm font-black"><td colSpan={5}>جمع کل</td><td className="text-left">{formatPrice(debitTotal)}</td><td className="text-left">{formatPrice(creditTotal)}</td></tr></tfoot>
          </table>
        </div>}
      </div>
    </section>
  </div>;
}
