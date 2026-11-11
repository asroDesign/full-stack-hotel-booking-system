import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, journalEntries, journalLines } from "@/db/schema";
import { getAccounts } from "@/lib/accounting";
import { PrintButton, ReverseVoucherButton, VoucherEditForm } from "@/components/admin/accounting-ui";
import { faNum, formatJalali, formatPrice } from "@/lib/utils";

const sourceName: Record<string, string> = { reservation: "رزرو خودکار", income: "درآمد", expense: "هزینه", manual: "سند دستی", payroll: "حقوق و بیمه" };

export default async function VoucherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const rows = await db.select({ entry: journalEntries, line: journalLines, account: accounts }).from(journalEntries)
    .innerJoin(journalLines, eq(journalLines.entryId, journalEntries.id)).innerJoin(accounts, eq(journalLines.accountId, accounts.id))
    .where(eq(journalEntries.id, id)).orderBy(journalLines.id);
  if (!rows.length) notFound();
  const entry = rows[0].entry;
  const accountChoices = (await getAccounts()).map((account) => ({ id: account.id, code: account.code, name: account.name, level: account.level, type: account.type, parentId: account.parentId, isSystem: account.isSystem, isActive: account.isActive }));
  const debitTotal = rows.reduce((sum, row) => sum + Number(row.line.debit), 0);
  const creditTotal = rows.reduce((sum, row) => sum + Number(row.line.credit), 0);
  const [reversal] = await db.select({ id: journalEntries.id }).from(journalEntries).where(and(eq(journalEntries.source, "manual"), eq(journalEntries.sourceType, `reversal:${entry.id}`)));
  const reversedFrom = /^reversal:(\d+)$/.exec(entry.sourceType)?.[1];
  const canReverse = entry.source !== "reservation" && entry.source !== "payroll" && !entry.sourceType.startsWith("reversal:") && !reversal;
  return <div className="mx-auto max-w-5xl space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 print:hidden"><Link href="/admin/accounting/journal" className="btn btn-ghost btn-sm">بازگشت به دفتر روزنامه</Link><div className="flex gap-2">{canReverse && <ReverseVoucherButton id={entry.id} />}<PrintButton /></div></div>
    <article className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-5 p-5 md:p-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-base-300 pb-4"><div><div className="text-sm text-base-content/55">سند حسابداری</div><h1 className="mt-1 text-2xl font-black">شماره {faNum(entry.id)}</h1><div className="mt-2 text-sm">{entry.description}</div></div><div className="text-sm"><div><b>تاریخ:</b> {formatJalali(entry.date)}</div><div className="mt-1"><b>منبع:</b> {sourceName[entry.source] ?? entry.source}</div><div className="mt-1"><b>ثبت‌کننده:</b> {entry.createdBy || "سیستم"}</div></div></header>
      {reversal && <div className="alert alert-warning">این سند برگشت خورده است. <Link className="link font-bold" href={`/admin/accounting/voucher/${reversal.id}`}>مشاهده سند برگشت شماره {faNum(reversal.id)}</Link></div>}
      {reversedFrom && <div className="alert alert-info">این سند برگشتی است و سند اصلی آن <Link className="link font-bold" href={`/admin/accounting/voucher/${reversedFrom}`}>شماره {faNum(Number(reversedFrom))}</Link> است.</div>}
      <div className="overflow-x-auto"><table className="table"><thead><tr><th>ردیف</th><th>کد حساب</th><th>حساب</th><th>شرح ردیف</th><th className="text-left">بدهکار (تومان)</th><th className="text-left">بستانکار (تومان)</th></tr></thead><tbody>{rows.map(({ line, account }, index) => <tr key={line.id}><td>{faNum(index + 1)}</td><td dir="ltr" className="font-mono">{account.code}</td><td>{account.name}</td><td>{line.description || entry.description}</td><td className="text-left">{line.debit ? formatPrice(Number(line.debit)) : "—"}</td><td className="text-left">{line.credit ? formatPrice(Number(line.credit)) : "—"}</td></tr>)}</tbody><tfoot><tr className="font-black"><td colSpan={4}>جمع سند</td><td className="text-left">{formatPrice(debitTotal)}</td><td className="text-left">{formatPrice(creditTotal)}</td></tr></tfoot></table></div>
      <div className={`alert ${debitTotal === creditTotal ? "alert-success" : "alert-error"}`}>{debitTotal === creditTotal ? "سند تراز است." : "سند تراز نیست؛ ردیف‌ها نیاز به بررسی دارند."}</div>
      {entry.source !== "reservation" && entry.source !== "payroll" && !entry.sourceType && !reversal && <VoucherEditForm voucher={{ id: entry.id, date: entry.date, description: entry.description, lines: rows.map(({ line }) => ({ accountId: line.accountId, debit: Number(line.debit), credit: Number(line.credit), description: line.description })) }} accounts={accountChoices} />}
    </div></article>
  </div>;
}
