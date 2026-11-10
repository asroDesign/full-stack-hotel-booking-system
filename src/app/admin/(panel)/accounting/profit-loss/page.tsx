import { Fragment } from "react";
import { profitLoss } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { ReportToolbar } from "@/components/admin/accounting-ui";
import { cn, formatJalali, formatPrice } from "@/lib/utils";

type Section = Awaited<ReturnType<typeof profitLoss>>["revenue"];

function Block({ title, s, tone }: { title: string; s: Section; tone: string }) {
  return (
    <div>
      <h3 className={cn("mb-2 text-base font-black", tone)}>{title}</h3>
      {s.groups.length === 0 ? (
        <p className="rounded-box bg-base-200 p-3 text-sm text-base-content/50">موردی ثبت نشده است.</p>
      ) : (
        <table className="table table-sm">
          <tbody>
            {s.groups.map((g) => (
              <Fragment key={g.code}>
                <tr className="bg-base-200/60 font-bold"><td>{g.code} - {g.name}</td><td className="text-left">{formatPrice(g.amount)}</td></tr>
                {g.subs.map((m) => (
                  <Fragment key={m.code}>
                    <tr className="font-medium"><td className="pr-6">{m.code} - {m.name}</td><td className="text-left">{formatPrice(m.amount)}</td></tr>
                    {m.details.map((d) => (
                      <tr key={d.code} className="text-xs text-base-content/60"><td className="pr-12">{d.code} - {d.name}</td><td className="text-left">{formatPrice(d.amount)}</td></tr>
                    ))}
                  </Fragment>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot><tr className={cn("text-sm font-black", tone)}><td>جمع {title}</td><td className="text-left">{formatPrice(s.total)}</td></tr></tfoot>
        </table>
      )}
    </div>
  );
}

export default async function ProfitLossPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { from, to } = reportRange(sp);
  const pl = await profitLoss(from, to);
  return (
    <div>
      <ReportToolbar from={from} to={to} exportHref={`/api/accounting/export?report=pl&from=${from}&to=${to}`} />
      <div className="card card-border bg-base-100 shadow-sm">
        <div className="card-body gap-6 p-4 md:p-8">
          <h2 className="text-center text-xl font-black">صورت سود و زیان <span className="block text-sm font-normal text-base-content/50">از {formatJalali(from)} تا {formatJalali(to)}</span></h2>
          <div className="grid gap-8 lg:grid-cols-2">
            <Block title="درآمدها" s={pl.revenue} tone="text-success" />
            <Block title="هزینه‌ها" s={pl.expense} tone="text-error" />
          </div>
          <div className={cn("rounded-box p-5 text-center", pl.net >= 0 ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
            <div className="text-sm">{pl.net >= 0 ? "سود خالص دوره" : "زیان خالص دوره"}</div>
            <div className="text-3xl font-black">{formatPrice(Math.abs(pl.net))} <span className="text-base font-medium">تومان</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
