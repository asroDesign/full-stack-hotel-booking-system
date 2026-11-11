"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, journalEntries, journalLines, type AccountType } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { createVoucher, ensureAccounts } from "@/lib/accounting";
import { toEnDigits, todayISO } from "@/lib/utils";

type Res = { ok: boolean; message: string; id?: number };
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const TYPES: AccountType[] = ["asset", "liability", "equity", "revenue", "expense"];

export async function saveAccount(input: { id?: number; parentId?: number | null; code: string; name: string; type?: AccountType; isActive?: boolean }): Promise<Res> {
  await requireAdmin();
  await ensureAccounts();
  const code = toEnDigits(String(input.code ?? "")).replace(/[^\d]/g, "").slice(0, 12);
  const name = cleanText(input.name, 120);
  if (!code || !name) return { ok: false, message: "کد و نام حساب الزامی است." };

  try {
    if (input.id) {
      const [acc] = await db.select().from(accounts).where(eq(accounts.id, input.id));
      if (!acc) return { ok: false, message: "حساب یافت نشد." };
      await db
        .update(accounts)
        .set({ name, code: acc.isSystem ? acc.code : code, isActive: input.isActive ?? acc.isActive })
        .where(eq(accounts.id, input.id));
    } else {
      let level = 1;
      let type: AccountType = TYPES.includes(input.type as AccountType) ? (input.type as AccountType) : "expense";
      if (input.parentId) {
        const [parent] = await db.select().from(accounts).where(eq(accounts.id, input.parentId));
        if (!parent) return { ok: false, message: "حساب والد یافت نشد." };
        if (parent.level >= 3) return { ok: false, message: "زیر حساب تفصیلی نمی‌توان حساب تعریف کرد." };
        if (!code.startsWith(parent.code)) return { ok: false, message: `کد حساب باید با کد والد (${parent.code}) شروع شود.` };
        level = parent.level + 1;
        type = parent.type;
      }
      await db.insert(accounts).values({ code, name, level, type, parentId: input.parentId ?? null, isSystem: false });
    }
  } catch {
    return { ok: false, message: "کد حساب تکراری است." };
  }
  revalidatePath("/admin/accounting", "layout");
  return { ok: true, message: "حساب ذخیره شد." };
}

export async function deleteAccount(id: number): Promise<Res> {
  await requireAdmin();
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, id));
  if (!acc) return { ok: false, message: "حساب یافت نشد." };
  if (acc.isSystem) return { ok: false, message: "حساب‌های سیستمی قابل حذف نیستند (می‌توانید غیرفعال کنید)." };
  const [{ ch }] = await db.select({ ch: sql<number>`count(*)::int` }).from(accounts).where(eq(accounts.parentId, id));
  if (ch > 0) return { ok: false, message: "ابتدا زیرحساب‌ها را حذف کنید." };
  const [{ ln }] = await db.select({ ln: sql<number>`count(*)::int` }).from(journalLines).where(eq(journalLines.accountId, id));
  if (ln > 0) return { ok: false, message: "این حساب دارای گردش است و قابل حذف نیست." };
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidatePath("/admin/accounting", "layout");
  return { ok: true, message: "حساب حذف شد." };
}

export async function saveManualVoucher(input: {
  date: string;
  description: string;
  lines: { accountId: number; debit: number; credit: number; description: string }[];
}): Promise<Res> {
  const admin = await requireAdmin();
  if (!ISO.test(input.date)) return { ok: false, message: "تاریخ سند را انتخاب کنید." };
  const description = cleanText(input.description, 500);
  if (!description) return { ok: false, message: "شرح سند الزامی است." };
  const r = await createVoucher({
    date: input.date,
    description,
    source: "manual",
    createdBy: admin.name,
    lines: (input.lines ?? []).slice(0, 100).map((l) => ({
      accountId: Number(l.accountId),
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: cleanText(l.description, 300),
    })),
  });
  if (!r.ok) return { ok: false, message: r.error };
  revalidatePath("/admin/accounting", "layout");
  return { ok: true, message: `سند شماره ${r.id} ثبت شد.`, id: r.id };
}

/** Quick income / expense entry (creates a balanced two-line voucher). */
export async function saveQuickEntry(input: {
  kind: "income" | "expense";
  date: string;
  accountId: number;
  moneyAccountId: number;
  amount: number;
  description: string;
}): Promise<Res> {
  const admin = await requireAdmin();
  const amount = Math.round(Number(input.amount) || 0);
  if (amount <= 0) return { ok: false, message: "مبلغ معتبر وارد کنید." };
  if (!ISO.test(input.date)) return { ok: false, message: "تاریخ را انتخاب کنید." };
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, Number(input.accountId)));
  if (!acc || acc.type !== (input.kind === "income" ? "revenue" : "expense"))
    return { ok: false, message: input.kind === "income" ? "یک حساب درآمد انتخاب کنید." : "یک حساب هزینه انتخاب کنید." };
  const description = cleanText(input.description, 500) || (input.kind === "income" ? `ثبت درآمد - ${acc.name}` : `ثبت هزینه - ${acc.name}`);
  const lines =
    input.kind === "income"
      ? [
          { accountId: Number(input.moneyAccountId), debit: amount, credit: 0 },
          { accountId: acc.id, debit: 0, credit: amount },
        ]
      : [
          { accountId: acc.id, debit: amount, credit: 0 },
          { accountId: Number(input.moneyAccountId), debit: 0, credit: amount },
        ];
  const r = await createVoucher({ date: input.date, description, source: input.kind, createdBy: admin.name, lines });
  if (!r.ok) return { ok: false, message: r.error };
  revalidatePath("/admin/accounting", "layout");
  return { ok: true, message: `${input.kind === "income" ? "درآمد" : "هزینه"} با سند شماره ${r.id} ثبت شد.`, id: r.id };
}

export async function recordGatewaySettlement(input: { date: string; provider: string; reference: string; grossAmount: number; netAmount: number; feeAmount: number }): Promise<Res> {
  const admin = await requireAdmin();
  const date = String(input.date ?? "");
  const provider = String(input.provider ?? "");
  const providerNames: Record<string, string> = { zarinpal: "زرین‌پال", zibal: "زیبال", saman: "سامان", mellat: "ملت", other: "سایر" };
  const reference = cleanText(input.reference, 100);
  const gross = Math.round(Number(input.grossAmount) || 0);
  const net = Math.round(Number(input.netAmount) || 0);
  const fee = Math.round(Number(input.feeAmount) || 0);
  if (!ISO.test(date)) return { ok: false, message: "تاریخ تسویه معتبر نیست." };
  if (!providerNames[provider] || !reference) return { ok: false, message: "نام درگاه و شماره پیگیری معتبر الزامی است." };
  if (![gross, net, fee].every(Number.isSafeInteger) || gross <= 0 || net < 0 || fee < 0 || net + fee !== gross) return { ok: false, message: "مبلغ ناخالص باید با جمع واریزی خالص و کارمزد برابر باشد." };
  await ensureAccounts();
  const sourceType = `gateway-settlement:${provider}:${reference}`;
  const result = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${sourceType}))`);
    const [existing] = await tx.select({ id: journalEntries.id }).from(journalEntries).where(eq(journalEntries.sourceType, sourceType));
    if (existing) return { ok: false as const, message: "این شماره پیگیری قبلاً در تسویه درگاه ثبت شده است." };
    const allAccounts = await tx.select().from(accounts);
    const bank = allAccounts.find((account) => account.code === "110201");
    const gateway = allAccounts.find((account) => account.code === "110202");
    const feeAccount = allAccounts.find((account) => account.code === "520201");
    if (!bank?.isActive || bank.level !== 3 || bank.type !== "asset" || !gateway?.isActive || gateway.level !== 3 || gateway.type !== "asset" || (fee > 0 && (!feeAccount?.isActive || feeAccount.level !== 3 || feeAccount.type !== "expense"))) return { ok: false as const, message: "حساب‌های بانک، درگاه یا کارمزد فعال و معتبر نیستند." };
    const [document] = await tx.insert(journalEntries).values({ date, description: `تسویه درگاه ${providerNames[provider]} · پیگیری ${reference}`, source: "manual", sourceType, createdBy: admin.name }).returning({ id: journalEntries.id });
    const lines = [
      { entryId: document.id, accountId: bank.id, debit: net, credit: 0, description: `واریزی خالص درگاه ${providerNames[provider]}` },
      ...(fee && feeAccount ? [{ entryId: document.id, accountId: feeAccount.id, debit: fee, credit: 0, description: `کارمزد تسویه درگاه ${providerNames[provider]}` }] : []),
      { entryId: document.id, accountId: gateway.id, debit: 0, credit: gross, description: `خروج از مانده درگاه ${providerNames[provider]}` },
    ].filter((line) => line.debit || line.credit);
    await tx.insert(journalLines).values(lines);
    return { ok: true as const, id: document.id, message: `تسویه درگاه با سند شماره ${document.id} ثبت شد.` };
  });
  if (result.ok) revalidatePath("/admin/accounting", "layout");
  return result;
}

export async function saveEditedVoucher(input: { id: number; date: string; description: string; lines: { accountId: number; debit: number; credit: number; description?: string }[] }): Promise<Res> {
  await requireAdmin();
  const id = Math.trunc(Number(input.id));
  const date = String(input.date ?? "");
  const description = cleanText(input.description, 500);
  const rawLines = Array.isArray(input.lines) ? input.lines.slice(0, 100) : [];
  const lines = rawLines.map((line) => ({
    accountId: Math.trunc(Number(line.accountId)),
    debit: Math.round(Number(line.debit) || 0),
    credit: Math.round(Number(line.credit) || 0),
    description: cleanText(line.description, 300),
  })).filter((line) => line.debit || line.credit);
  const parsedDate = new Date(`${date}T00:00:00Z`);
  if (!Number.isSafeInteger(id) || id <= 0 || !ISO.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) return { ok: false, message: "شماره سند یا تاریخ معتبر نیست." };
  if (!description || lines.length < 2 || lines.some((line) => !Number.isSafeInteger(line.accountId) || line.accountId <= 0 || line.debit < 0 || line.credit < 0 || (line.debit > 0 && line.credit > 0)) || lines.reduce((sum, line) => sum + line.debit, 0) !== lines.reduce((sum, line) => sum + line.credit, 0) || lines.reduce((sum, line) => sum + line.debit, 0) <= 0) return { ok: false, message: "شرح و ردیف‌های سند باید کامل و تراز باشند." };
  await ensureAccounts();
  const result = await db.transaction(async (tx) => {
    const [entry] = await tx.select().from(journalEntries).where(eq(journalEntries.id, id)).for("update");
    if (!entry) return { ok: false as const, message: "سند یافت نشد." };
    if (!["manual", "income", "expense"].includes(entry.source) || entry.sourceType) return { ok: false as const, message: "این سند خودکار یا دارای گردش خاص است و قابل ویرایش نیست." };
    const [reversal] = await tx.select({ id: journalEntries.id }).from(journalEntries).where(and(eq(journalEntries.source, "manual"), eq(journalEntries.sourceType, `reversal:${id}`)));
    if (reversal) return { ok: false as const, message: "سندی که برگشت خورده قابل ویرایش نیست." };
    const accountIds = Array.from(new Set(lines.map((line) => line.accountId)));
    const selectedAccounts = await tx.select().from(accounts).where(inArray(accounts.id, accountIds));
    if (selectedAccounts.length !== accountIds.length || selectedAccounts.some((account) => !account.isActive || account.level !== 3)) return { ok: false as const, message: "هر ردیف باید به حساب تفصیلی فعال متصل باشد." };
    await tx.update(journalEntries).set({ date, description }).where(eq(journalEntries.id, id));
    await tx.delete(journalLines).where(eq(journalLines.entryId, id));
    await tx.insert(journalLines).values(lines.map((line) => ({ ...line, entryId: id })));
    return { ok: true as const, message: `سند ${id} ویرایش و ذخیره شد.`, id };
  });
  if (result.ok) revalidatePath("/admin/accounting", "layout");
  return result;
}

export async function deleteVoucher(id: number): Promise<Res> {
  await requireAdmin();
  const [e] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
  if (!e) return { ok: false, message: "سند یافت نشد." };
  if (e.source === "reservation" || e.source === "payroll" || e.sourceType) return { ok: false, message: "اسناد خودکار، تسویه‌ای یا برگشتی از این مسیر حذف نمی‌شوند." };
  const [reversal] = await db.select({ id: journalEntries.id }).from(journalEntries).where(and(eq(journalEntries.source, "manual"), eq(journalEntries.sourceType, `reversal:${id}`)));
  if (reversal) return { ok: false, message: "برای این سند برگشت ثبت شده است؛ حذف آن مجاز نیست." };
  await db.delete(journalEntries).where(eq(journalEntries.id, id));
  revalidatePath("/admin/accounting", "layout");
  return { ok: true, message: `سند ${id} حذف شد.` };
}


export async function reverseVoucher(id: number): Promise<Res> {
  const admin = await requireAdmin();
  const voucherId = Math.trunc(Number(id));
  if (!Number.isSafeInteger(voucherId) || voucherId <= 0) return { ok: false, message: "شماره سند معتبر نیست." };
  const result = await db.transaction(async (tx) => {
    const [entry] = await tx.select().from(journalEntries).where(eq(journalEntries.id, voucherId)).for("update");
    if (!entry) return { ok: false as const, message: "سند یافت نشد." };
    if (entry.source === "reservation" || entry.source === "payroll" || entry.sourceType.startsWith("reversal:")) return { ok: false as const, message: "این سند خودکار است و از این مسیر برگشت داده نمی‌شود." };
    const sourceType = `reversal:${entry.id}`;
    const [existing] = await tx.select({ id: journalEntries.id }).from(journalEntries).where(and(eq(journalEntries.source, "manual"), eq(journalEntries.sourceType, sourceType)));
    if (existing) return { ok: false as const, message: "برای این سند قبلاً برگشت ثبت شده است." };
    const lines = await tx.select().from(journalLines).where(eq(journalLines.entryId, entry.id)).orderBy(journalLines.id);
    const debit = lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const credit = lines.reduce((sum, line) => sum + Number(line.credit), 0);
    if (lines.length < 2 || lines.some((line) => line.debit > 0 && line.credit > 0) || debit !== credit || debit <= 0) return { ok: false as const, message: "ردیف‌های سند برای برگشت معتبر نیستند یا سند تراز نیست." };
    const [reversal] = await tx.insert(journalEntries).values({ date: todayISO(), description: `برگشت سند شماره ${entry.id} — ${entry.description}`, source: "manual", sourceType, createdBy: admin.name }).returning({ id: journalEntries.id });
    await tx.insert(journalLines).values(lines.map((line) => ({ entryId: reversal.id, accountId: line.accountId, debit: line.credit, credit: line.debit, description: line.description ? `برگشت: ${line.description}` : `برگشت سند ${entry.id}` })));
    return { ok: true as const, id: reversal.id, message: `سند برگشت شماره ${reversal.id} ثبت شد.` };
  });
  if (result.ok) revalidatePath("/admin/accounting", "layout");
  return result;
}
