import { and, eq, gte, lte, sql } from "drizzle-orm";
import { getCurrentAdmin } from "@/lib/auth";
import { accounts, costCenters, journalEntries, journalLines } from "@/db/schema";
import { db } from "@/db";
import { journalBook, ledger, profitLoss, trialBalance } from "@/lib/accounting";
import { reportRange } from "@/lib/report-range";
import { createXlsx } from "@/lib/xlsx";
import { isoToJalali, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

const jalaliDate = (iso: string) => {
  const { jy, jm, jd } = isoToJalali(iso);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
};
const asOfDate = (value?: string) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? value! : todayISO();
const csvCell = (value: unknown) => {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return new Response("Unauthorized", { status: 401 });
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const { from, to } = reportRange(params);
  const report = params.report;
  const rows: (string | number)[][] = [];
  let fileName = report || "accounting";

  if (report === "journal") {
    const source = ["reservation", "income", "expense", "manual", "payroll"].includes(params.source ?? "") ? params.source : undefined;
    const query = (params.q ?? "").trim().slice(0, 60);
    const entries = await journalBook(query ? "1900-01-01" : from, query ? "2999-12-31" : to, { source, q: query || undefined });
    rows.push(["شماره سند", "تاریخ", "شرح سند", "نوع", "کد حساب", "نام حساب", "شرح ردیف", "کد مرکز هزینه", "مرکز هزینه", "بدهکار (تومان)", "بستانکار (تومان)"]);
    for (const entry of entries) for (const line of entry.lines) rows.push([entry.id, jalaliDate(entry.date), entry.description, entry.source, line.code, line.name, line.description, line.costCenterCode || "", line.costCenterName || "", Number(line.debit), Number(line.credit)]);
    fileName = "journal";
  } else if (report === "trial") {
    const level = ([1, 2, 3].includes(Number(params.level)) ? Number(params.level) : 2) as 1 | 2 | 3;
    const { rows: trialRows, total } = await trialBalance(from, to, level);
    rows.push(["کد", "نام حساب", "مانده اول دوره بدهکار", "مانده اول دوره بستانکار", "گردش بدهکار", "گردش بستانکار", "مانده بدهکار", "مانده بستانکار"]);
    for (const row of trialRows) rows.push([row.code, row.name, row.openDebit, row.openCredit, row.debit, row.credit, row.balDebit, row.balCredit]);
    rows.push(["", "جمع", total.openDebit, total.openCredit, total.debit, total.credit, total.balDebit, total.balCredit]);
    fileName = `trial-balance-level${level}`;
  } else if (report === "pl") {
    const result = await profitLoss(from, to);
    rows.push(["بخش", "کد", "حساب", "مبلغ (تومان)"]);
    for (const [title, section] of [["درآمد", result.revenue], ["هزینه", result.expense]] as const) {
      for (const group of section.groups) {
        rows.push([title, group.code, group.name, group.amount]);
        for (const sub of group.subs) {
          rows.push([title, sub.code, sub.name, sub.amount]);
          for (const detail of sub.details) rows.push([title, detail.code, detail.name, detail.amount]);
        }
      }
      rows.push([title, "", `جمع ${title}`, section.total]);
    }
    rows.push(["", "", result.net >= 0 ? "سود خالص" : "زیان خالص", Math.abs(result.net)]);
    fileName = "profit-loss";
  } else if (report === "ledger") {
    const data = await ledger(Number(params.account), from, to);
    if (!data) return new Response("Not found", { status: 404 });
    rows.push([`دفتر حساب ${data.account.code} - ${data.account.name}`]);
    rows.push(["تاریخ", "شماره سند", "حساب", "شرح", "کد مرکز هزینه", "مرکز هزینه", "بدهکار", "بستانکار", "مانده"]);
    rows.push(["", "", "", "مانده ابتدای دوره", "", "", "", "", data.opening]);
    for (const row of data.rows) rows.push([jalaliDate(row.date), row.entryId, `${row.code} ${row.name}`, row.description || row.entryDesc, row.costCenterCode || "", row.costCenterName || "", row.debit, row.credit, row.balance]);
    rows.push(["", "", "", "جمع گردش / مانده پایان دوره", "", "", data.rows.reduce((sum, row) => sum + row.debit, 0), data.rows.reduce((sum, row) => sum + row.credit, 0), data.closing]);
    fileName = `ledger-${data.account.code}`;
  } else if (report === "bs") {
    const date = asOfDate(params.to);
    const [{ rows: trialRows }, result] = await Promise.all([trialBalance("1900-01-01", date, 2), profitLoss("1900-01-01", date)]);
    rows.push([`ترازنامه تا ${jalaliDate(date)}`], ["بخش", "کد", "حساب", "مانده (تومان)"]);
    const sections = [
      ["دارایی", trialRows.filter((row) => row.type === "asset"), (row: (typeof trialRows)[number]) => row.balDebit - row.balCredit],
      ["بدهی", trialRows.filter((row) => row.type === "liability"), (row: (typeof trialRows)[number]) => row.balCredit - row.balDebit],
      ["حقوق صاحبان سرمایه", trialRows.filter((row) => row.type === "equity"), (row: (typeof trialRows)[number]) => row.balCredit - row.balDebit],
    ] as const;
    for (const [title, section, valueOf] of sections) {
      let total = 0;
      for (const row of section) {
        const value = valueOf(row);
        if (!value) continue;
        rows.push([title, row.code, row.name, value]);
        total += value;
      }
      rows.push([title, "", `جمع ${title}`, total]);
    }
    rows.push(["سود/زیان انباشته", "", result.net >= 0 ? "سود" : "زیان", Math.abs(result.net)]);
    fileName = "balance-sheet";
  } else if (report === "arap") {
    const date = asOfDate(params.to);
    const { rows: trialRows } = await trialBalance("1900-01-01", date, 3);
    rows.push([`دریافتنی و پرداختنی تا ${jalaliDate(date)}`], ["نوع", "کد", "حساب", "مانده (تومان)"]);
    const selected = trialRows.filter((row) => (row.type === "asset" && row.code.startsWith("13")) || (row.type === "liability" && row.code.startsWith("21")));
    for (const row of selected) rows.push([row.type === "asset" ? "دریافتنی" : "پرداختنی", row.code, row.name, row.type === "asset" ? row.balDebit - row.balCredit : row.balCredit - row.balDebit]);
    fileName = "receivables-payables";
  } else if (report === "vendors") {
    const { rows: trialRows } = await trialBalance(from, to, 3);
    const payrollAccounts = new Set(["210102", "210103", "210104"]);
    const vendors = trialRows.filter((row) => row.type === "liability" && row.code.startsWith("2101") && !payrollAccounts.has(row.code));
    rows.push(["کد حساب", "فروشنده", "مانده ابتدای دوره", "بدهکار دوره", "بستانکار دوره", "مانده پایان"]);
    for (const row of vendors) rows.push([row.code, row.name, row.openCredit - row.openDebit, row.debit, row.credit, row.balCredit - row.balDebit]);
    rows.push(["", "جمع", vendors.reduce((sum, row) => sum + row.openCredit - row.openDebit, 0), vendors.reduce((sum, row) => sum + row.debit, 0), vendors.reduce((sum, row) => sum + row.credit, 0), vendors.reduce((sum, row) => sum + row.balCredit - row.balDebit, 0)]);
    fileName = "vendor-accounts";
  } else if (report === "cost") {
    const result = await db.select({
      centerCode: costCenters.code,
      centerName: costCenters.name,
      accountCode: accounts.code,
      accountName: accounts.name,
      debit: sql<number>`coalesce(sum(${journalLines.debit}),0)::bigint`,
      credit: sql<number>`coalesce(sum(${journalLines.credit}),0)::bigint`,
    }).from(journalLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
      .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
      .leftJoin(costCenters, eq(costCenters.id, journalLines.costCenterId))
      .where(and(gte(journalEntries.date, from), lte(journalEntries.date, to), eq(accounts.type, "expense")))
      .groupBy(costCenters.id, costCenters.code, costCenters.name, accounts.id, accounts.code, accounts.name)
      .orderBy(costCenters.code, accounts.code);
    rows.push(["کد مرکز", "مرکز هزینه", "کد حساب", "حساب هزینه", "بدهکار", "بستانکار", "هزینه خالص"]);
    for (const row of result) rows.push([row.centerCode || "", row.centerName || "بدون مرکز هزینه", row.accountCode, row.accountName, Number(row.debit), Number(row.credit), Number(row.debit) - Number(row.credit)]);
    fileName = "cost-centers";
  } else {
    return new Response("Bad request", { status: 400 });
  }

  const heading = report === "bs" || report === "arap" ? rows.shift() : [`گزارش از ${jalaliDate(from)} تا ${jalaliDate(to)}`];
  if (heading) rows.unshift(heading);
  if (params.format === "csv") {
    const csv = "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${fileName}-${from}-${to}.csv"`, "Cache-Control": "no-store" } });
  }
  const workbook = createXlsx("گزارش", rows);
  return new Response(workbook, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}-${from}-${to}.xlsx"`,
      "Cache-Control": "private, no-store",
    },
  });
}
