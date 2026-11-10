export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { getCurrentAdmin } from "@/lib/auth";
import {
  ACCOUNT_LEVEL_LABELS,
  ACCOUNT_TYPE_LABELS,
  getJournalBook,
  getProfitLoss,
  getTrialBalance,
} from "@/lib/accounting";
import { toCsv } from "@/lib/security";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response(JSON.stringify({ error: "دسترسی غیرمجاز" }), { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "journal";
  const from = (searchParams.get("from") ?? "").slice(0, 10) || undefined;
  const to = (searchParams.get("to") ?? "").slice(0, 10) || undefined;

  let rows: (string | number | null | undefined)[][] = [];
  let filename = "report.csv";

  if (type === "trial") {
    const balance = await getTrialBalance(from, to);
    rows = [["کد حساب", "نام حساب", "نوع", "سطح", "بدهکار", "بستانکار", "مانده", "ماهیت"]];
    balance.forEach((row) =>
      rows.push([
        row.code,
        row.name,
        ACCOUNT_TYPE_LABELS[row.type] ?? row.type,
        ACCOUNT_LEVEL_LABELS[row.level] ?? row.level,
        row.debit,
        row.credit,
        Math.abs(row.balance),
        row.balanceLabel,
      ]),
    );
    const totalDebit = balance.reduce((sum, row) => sum + row.debit, 0);
    const totalCredit = balance.reduce((sum, row) => sum + row.credit, 0);
    rows.push(["", "جمع کل", "", "", totalDebit, totalCredit, Math.abs(totalDebit - totalCredit), ""]);
    filename = "trial-balance.csv";
  } else if (type === "pl") {
    const pl = await getProfitLoss(from, to);
    rows = [["گروه", "کد حساب", "نام حساب", "مبلغ"]];
    pl.revenue.forEach((row) => rows.push(["درآمد", row.code, row.name, row.credit - row.debit]));
    rows.push(["جمع درآمد", "", "", pl.totalRevenue]);
    pl.expenses.forEach((row) => rows.push(["هزینه", row.code, row.name, row.debit - row.credit]));
    rows.push(["جمع هزینه", "", "", pl.totalExpenses]);
    rows.push(["سود / زیان خالص", "", "", pl.netProfit]);
    filename = "profit-loss.csv";
  } else {
    const entries = await getJournalBook({ from, to, limit: 1000 });
    rows = [["شماره سند", "تاریخ", "شرح", "مرجع", "منبع", "کد حساب", "نام حساب", "بدهکار", "بستانکار"]];
    entries.forEach((entry) => {
      entry.lines.forEach((line) =>
        rows.push([
          entry.number,
          entry.date,
          entry.description,
          entry.reference,
          entry.source === "booking" ? "سیستم" : "دستی",
          line.accountCode,
          line.accountName,
          line.debit,
          line.credit,
        ]),
      );
    });
    filename = "journal-book.csv";
  }

  const csv = toCsv(rows);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
