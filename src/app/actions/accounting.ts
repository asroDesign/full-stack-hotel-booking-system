"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { accounts, journalEntries, journalLines, type AccountType } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { createVoucher, ensureAccounts } from "@/lib/accounting";
import { toEnDigits } from "@/lib/utils";

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

export async function deleteVoucher(id: number): Promise<Res> {
  await requireAdmin();
  const [e] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
  if (!e) return { ok: false, message: "سند یافت نشد." };
  if (e.source === "reservation") return { ok: false, message: "اسناد خودکار رزرو با تغییر وضعیت رزرو مدیریت می‌شوند." };
  await db.delete(journalEntries).where(and(eq(journalEntries.id, id)));
  revalidatePath("/admin/accounting", "layout");
  return { ok: true, message: `سند ${id} حذف شد.` };
}
