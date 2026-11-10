import { getCurrentAdmin } from "@/lib/auth";
import { journalBook, ledger, profitLoss, trialBalance } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { isoToJalali } from "@/lib/utils";

export const dynamic = "force-dynamic";

const jd = (iso: string) => {
  const { jy, jm, jd } = isoToJalali(iso);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
};

/** CSV cell: quote, escape quotes, and neutralise spreadsheet formula injection. */
function cell(v: unknown) {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}
const toCsv = (rows: unknown[][]) => "\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n");

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const sp = Object.fromEntries(new URL(req.url).searchParams);
  const { from, to } = reportRange(sp);
  const report = sp.report;
  let rows: unknown[][] = [];
  let name = report;

  if (report === "journal") {
    const entries = await journalBook(from, to, { source: sp.source || undefined });
    rows.push(["شماره سند", "تاریخ", "شرح سند", "کد حساب", "نام حساب", "شرح ردیف", "بدهکار", "بستانکار"]);
    for (const e of entries) for (const l of e.lines) rows.push([e.id, jd(e.date), e.description, l.code, l.name, l.description, Number(l.debit), Number(l.credit)]);
    name = "journal";
  } else if (report === "trial") {
    const level = ([1, 2, 3].includes(Number(sp.level)) ? Number(sp.level) : 2) as 1 | 2 | 3;
    const { rows: tr, total } = await trialBalance(from, to, level);
    rows.push(["کد", "نام حساب", "مانده ابتدای دوره بدهکار", "مانده ابتدای دوره بستانکار", "گردش بدهکار", "گردش بستانکار", "مانده بدهکار", "مانده بستانکار"]);
    for (const r of tr) rows.push([r.code, r.name, r.openDebit, r.openCredit, r.debit, r.credit, r.balDebit, r.balCredit]);
    rows.push(["", "جمع", total.openDebit, total.openCredit, total.debit, total.credit, total.balDebit, total.balCredit]);
    name = `trial-balance-level${level}`;
  } else if (report === "pl") {
    const pl = await profitLoss(from, to);
    rows.push(["بخش", "کد", "حساب", "مبلغ"]);
    for (const [title, s] of [["درآمد", pl.revenue], ["هزینه", pl.expense]] as const) {
      for (const g of s.groups) {
        rows.push([title, g.code, g.name, g.amount]);
        for (const m of g.subs) {
          rows.push([title, m.code, "  " + m.name, m.amount]);
          for (const d of m.details) rows.push([title, d.code, "    " + d.name, d.amount]);
        }
      }
      rows.push([title, "", `جمع ${title}`, s.total]);
    }
    rows.push(["", "", pl.net >= 0 ? "سود خالص" : "زیان خالص", Math.abs(pl.net)]);
    name = "profit-loss";
  } else if (report === "ledger") {
    const data = await ledger(Number(sp.account), from, to);
    if (!data) return new Response("Not found", { status: 404 });
    rows.push([`دفتر حساب ${data.account.code} - ${data.account.name}`]);
    rows.push(["تاریخ", "شماره سند", "حساب", "شرح", "بدهکار", "بستانکار", "مانده"]);
    rows.push(["", "", "", "مانده ابتدای دوره", "", "", data.opening]);
    for (const r of data.rows) rows.push([jd(r.date), r.entryId, `${r.code} ${r.name}`, r.description || r.entryDesc, r.debit, r.credit, r.balance]);
    name = `ledger-${data.account.code}`;
  } else {
    return new Response("Bad request", { status: 400 });
  }
  rows = [[`گزارش از ${jd(from)} تا ${jd(to)}`], ...rows];
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}-${from}-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
