import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, costCenters, journalEntries, journalLines } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { PrintButton } from "@/components/admin/accounting-ui";
import { faNum, formatJalali, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

const sourceLabel: Record<string, string> = { reservation: "رزرو", income: "درآمد", expense: "هزینه", manual: "سند دستی", payroll: "حقوق و بیمه" };

export default async function JournalCoverPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const rows = await db.select({ entry: journalEntries, line: journalLines, account: accounts, center: costCenters })
    .from(journalEntries)
    .innerJoin(journalLines, eq(journalLines.entryId, journalEntries.id))
    .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
    .leftJoin(costCenters, eq(costCenters.id, journalLines.costCenterId))
    .where(eq(journalEntries.id, id))
    .orderBy(journalLines.id);
  if (!rows.length) notFound();
  const entry = rows[0].entry;
  const settings = await getSettings();
  const debit = rows.reduce((sum, row) => sum + Number(row.line.debit), 0);
  const credit = rows.reduce((sum, row) => sum + Number(row.line.credit), 0);
  const source = sourceLabel[entry.source] ?? entry.source;
  const reference = entry.reservationId ? `${source} · ${faNum(entry.reservationId)}` : entry.sourceType || source;

  return <main dir="rtl" className="min-h-screen bg-base-200 px-3 py-7 text-base-content print:min-h-0 print:bg-white print:p-0">
    <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 print:hidden">
      <Link href="/admin/accounting" className="btn btn-ghost btn-sm">بازگشت به اسناد</Link>
      <PrintButton label="چاپ روکش سند" />
    </div>
    <article className="journal-cover mx-auto max-w-[210mm] rounded-2xl border border-base-300 bg-base-100 p-6 shadow-sm md:p-9 print:m-0 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="border-b-2 border-slate-800 pb-4 text-center text-slate-950">
        <div className="flex items-start justify-between gap-4 text-right text-sm"><strong>{settings.hotelName}</strong><span>{settings.hotelNameEn || "واحد مالی و حسابداری"}</span></div>
        <h1 className="mt-5 text-2xl font-black">روکش سند حسابداری</h1>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm"><span className="rounded border border-slate-500 px-3 py-1">وضعیت: ثبت‌شده</span><span>شماره سند: <b>{faNum(entry.id)}</b></span><span>تاریخ سند: <b>{formatJalali(entry.date)}</b></span></div>
      </header>

      <section className="my-4 grid gap-2 rounded-lg border border-slate-400 p-3 text-sm text-slate-950 sm:grid-cols-2">
        <p className="sm:col-span-2"><b>شرح سند:</b> {entry.description || "—"}</p>
        <p><b>مرجع:</b> {reference}</p>
        <p><b>نوع ثبت:</b> {source}{entry.sourceType ? ` · ${entry.sourceType}` : ""}</p>
        <p><b>تنظیم‌کننده سند:</b> {entry.createdBy || admin.name}</p>
        <p><b>تعداد آرتیکل:</b> {faNum(rows.length)}</p>
      </section>

      <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[720px] border-collapse text-right text-xs text-slate-950 sm:text-sm print:min-w-0 print:text-[10px]">
          <thead><tr className="bg-slate-100"><th className="border border-slate-500 px-2 py-2">ردیف</th><th className="border border-slate-500 px-2 py-2">کد حساب</th><th className="border border-slate-500 px-2 py-2">شرح حساب</th><th className="border border-slate-500 px-2 py-2">طرف حساب / تفصیلی</th><th className="border border-slate-500 px-2 py-2">شرح آرتیکل</th><th className="border border-slate-500 px-2 py-2 text-left">بدهکار</th><th className="border border-slate-500 px-2 py-2 text-left">بستانکار</th></tr></thead>
          <tbody>{rows.map(({ line, account, center }, index) => <tr key={line.id} className="break-inside-avoid">
            <td className="border border-slate-500 px-2 py-2 text-center">{faNum(index + 1)}</td>
            <td className="border border-slate-500 px-2 py-2 font-mono" dir="ltr">{account.code}</td>
            <td className="border border-slate-500 px-2 py-2">{account.name}</td>
            <td className="border border-slate-500 px-2 py-2">{center?.name || "—"}</td>
            <td className="border border-slate-500 px-2 py-2">{line.description || "—"}</td>
            <td className="border border-slate-500 px-2 py-2 text-left">{Number(line.debit) ? formatPrice(Number(line.debit)) : "—"}</td>
            <td className="border border-slate-500 px-2 py-2 text-left">{Number(line.credit) ? formatPrice(Number(line.credit)) : "—"}</td>
          </tr>)}
          <tr className="bg-slate-100 font-black"><td colSpan={5} className="border border-slate-500 px-2 py-2">جمع آرتیکل‌ها</td><td className="border border-slate-500 px-2 py-2 text-left">{formatPrice(debit)}</td><td className="border border-slate-500 px-2 py-2 text-left">{formatPrice(credit)}</td></tr>
          <tr className="font-bold"><td colSpan={5} className="border border-slate-500 px-2 py-2">تراز سند</td><td colSpan={2} className="border border-slate-500 px-2 py-2 text-center">{debit === credit ? "متوازن" : "نامتوازن — نیازمند بررسی"}</td></tr>
        </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-950">
        <p className="flex items-end gap-2"><b className="shrink-0">مبلغ به حروف:</b><span className="flex-1 border-b border-dotted border-slate-500" /></p>
        <p className="flex items-end gap-2"><b className="shrink-0">پیوست / توضیحات:</b><span className="flex-1 border-b border-dotted border-slate-500" /></p>
      </div>
      <div className="mt-7 grid grid-cols-3 gap-3 text-center text-xs text-slate-950">
        {["تنظیم‌کننده", "بررسی‌کننده", "تأییدکننده"].map((title) => <div key={title} className="min-h-28 rounded-lg border border-slate-400 px-2 py-3"><b>{title}</b><p className="mt-2">نام، امضا و تاریخ</p></div>)}
      </div>
      <footer className="mt-5 border-t border-slate-400 pt-3 text-center text-[11px] text-slate-700">این روکش همراه با مستندات و پیوست‌های مالی سند بایگانی شود.</footer>
    </article>
  </main>;
}
