import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, journalEntries, journalLines, type Account, type Booking } from "@/db/schema";
import { todayISO } from "@/lib/format";

export const CHART_OF_ACCOUNTS: {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  level: "general" | "subsidiary" | "detail";
  parentCode?: string;
}[] = [
  { code: "1", name: "دارایی‌ها", type: "asset", level: "general" },
  { code: "101", name: "دارایی جاری", type: "asset", level: "subsidiary", parentCode: "1" },
  { code: "10101", name: "موجودی نقد و بانک", type: "asset", level: "detail", parentCode: "101" },
  { code: "10102", name: "حساب‌های دریافتنی", type: "asset", level: "detail", parentCode: "101" },
  { code: "10103", name: "موجودی مواد و کالا", type: "asset", level: "detail", parentCode: "101" },
  { code: "102", name: "دارایی ثابت", type: "asset", level: "subsidiary", parentCode: "1" },
  { code: "10201", name: "ساختمان و تأسیسات", type: "asset", level: "detail", parentCode: "102" },
  { code: "2", name: "بدهی‌ها", type: "liability", level: "general" },
  { code: "201", name: "بدهی جاری", type: "liability", level: "subsidiary", parentCode: "2" },
  { code: "20101", name: "حساب‌های پرداختنی", type: "liability", level: "detail", parentCode: "201" },
  { code: "20102", name: "مالیات و عوارض پرداختنی", type: "liability", level: "detail", parentCode: "201" },
  { code: "3", name: "حقوق صاحبان سهام", type: "equity", level: "general" },
  { code: "301", name: "سرمایه", type: "equity", level: "subsidiary", parentCode: "3" },
  { code: "30101", name: "سرمایه مالک", type: "equity", level: "detail", parentCode: "301" },
  { code: "4", name: "درآمدها", type: "revenue", level: "general" },
  { code: "401", name: "درآمد عملیاتی", type: "revenue", level: "subsidiary", parentCode: "4" },
  { code: "40101", name: "درآمد اقامت اتاق", type: "revenue", level: "detail", parentCode: "401" },
  { code: "40102", name: "درآمد استخر خانوادگی", type: "revenue", level: "detail", parentCode: "401" },
  { code: "40103", name: "درآمد خدمات و امکانات", type: "revenue", level: "detail", parentCode: "401" },
  { code: "5", name: "هزینه‌ها", type: "expense", level: "general" },
  { code: "501", name: "هزینه‌های عملیاتی", type: "expense", level: "subsidiary", parentCode: "5" },
  { code: "50101", name: "حقوق و دستمزد", type: "expense", level: "detail", parentCode: "501" },
  { code: "50102", name: "آب، برق و انرژی", type: "expense", level: "detail", parentCode: "501" },
  { code: "50103", name: "مواد غذایی و پذیرایی", type: "expense", level: "detail", parentCode: "501" },
  { code: "50104", name: "تعمیر و نگهداری", type: "expense", level: "detail", parentCode: "501" },
  { code: "50105", name: "بازاریابی و تبلیغات", type: "expense", level: "detail", parentCode: "501" },
  { code: "50106", name: "سایر هزینه‌ها", type: "expense", level: "detail", parentCode: "501" },
];

export { ACCOUNT_TYPE_LABELS, ACCOUNT_LEVEL_LABELS } from "@/lib/accounting-constants";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_LEVEL_LABELS } from "@/lib/accounting-constants";

export async function ensureChartOfAccounts(): Promise<Account[]> {
  const existing = await db.select({ code: accounts.code }).from(accounts);
  const codes = new Set(existing.map((row) => row.code));
  const missing = CHART_OF_ACCOUNTS.filter((account) => !codes.has(account.code));
  if (missing.length > 0) {
    await db
      .insert(accounts)
      .values(missing.map((account) => ({ ...account, parentCode: account.parentCode ?? null })))
      .onConflictDoNothing();
  }
  return db.select().from(accounts).orderBy(asc(accounts.code));
}

export type JournalLineInput = { accountId: number; debit: number; credit: number; description?: string };

export async function createJournalEntry(input: {
  date: string;
  description: string;
  reference?: string;
  source?: string;
  createdBy?: string;
  lines: JournalLineInput[];
}): Promise<{ ok: true; id: number; number: number } | { ok: false; error: string }> {
  const lines = input.lines.filter((line) => line.accountId > 0 && (line.debit > 0 || line.credit > 0));
  if (lines.length < 2) return { ok: false, error: "حداقل دو ردیف با مبلغ لازم است." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return { ok: false, error: "تاریخ سند معتبر نیست." };

  const totalDebit = lines.reduce((sum, line) => sum + Math.max(0, Math.round(line.debit)), 0);
  const totalCredit = lines.reduce((sum, line) => sum + Math.max(0, Math.round(line.credit)), 0);
  if (totalDebit !== totalCredit) return { ok: false, error: "جمع بدهکار و بستانکار باید برابر باشد." };
  if (totalDebit <= 0) return { ok: false, error: "مبلغ سند باید بزرگ‌تر از صفر باشد." };

  const accountRows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(inArray(accounts.id, lines.map((line) => line.accountId)));
  if (accountRows.length !== new Set(lines.map((line) => line.accountId)).size) {
    return { ok: false, error: "یکی از حساب‌ها معتبر نیست." };
  }

  try {
    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(4488201)`);
      const maxRow = await tx.select({ max: sql<number>`coalesce(max(${journalEntries.number}), 0)` }).from(journalEntries);
      const nextNumber = Number(maxRow[0]?.max ?? 0) + 1;
      const [entry] = await tx
        .insert(journalEntries)
        .values({
          number: nextNumber,
          date: input.date,
          description: input.description.slice(0, 400),
          reference: (input.reference ?? "").slice(0, 120),
          source: input.source ?? "manual",
          createdBy: input.createdBy ?? "admin",
        })
        .returning();
      await tx.insert(journalLines).values(
        lines.map((line) => ({
          entryId: entry.id,
          accountId: line.accountId,
          debit: Math.max(0, Math.round(line.debit)),
          credit: Math.max(0, Math.round(line.credit)),
          description: (line.description ?? "").slice(0, 240),
        })),
      );
      return entry;
    });
    return { ok: true, id: result.id, number: result.number };
  } catch (error) {
    console.error("[accounting] create entry failed", error);
    return { ok: false, error: "ثبت سند انجام نشد." };
  }
}

async function accountIdByCode(code: string): Promise<number | null> {
  const rows = await db.select({ id: accounts.id }).from(accounts).where(eq(accounts.code, code)).limit(1);
  return rows[0]?.id ?? null;
}

/** Posts the revenue/asset movement for a confirmed booking (idempotent). */
export async function postBookingRevenue(booking: Booking): Promise<void> {
  const reference = `booking-${booking.id}`;
  const existing = await db
    .select({ id: journalEntries.id })
    .from(journalEntries)
    .where(eq(journalEntries.reference, reference))
    .limit(1);
  if (existing[0]) return;

  await ensureChartOfAccounts();
  const [bankId, receivableId, roomsRevenueId, poolRevenueId, servicesRevenueId] = await Promise.all([
    accountIdByCode("10101"),
    accountIdByCode("10102"),
    accountIdByCode("40101"),
    accountIdByCode("40102"),
    accountIdByCode("40103"),
  ]);
  if (!bankId || !receivableId || !roomsRevenueId || !poolRevenueId || !servicesRevenueId) return;

  const paid = Math.min(booking.paidAmount, booking.totalAmount);
  const receivable = Math.max(0, booking.totalAmount - paid);
  const services = booking.addonsTotal;
  const coreRevenue = Math.max(0, booking.totalAmount - services);
  const revenueAccountId = booking.serviceType === "pool" ? poolRevenueId : roomsRevenueId;

  const lines: JournalLineInput[] = [];
  if (paid > 0) lines.push({ accountId: bankId, debit: paid, credit: 0, description: "پیش‌پرداخت دریافت‌شده" });
  if (receivable > 0)
    lines.push({ accountId: receivableId, debit: receivable, credit: 0, description: "مانده در محل پذیرش" });
  if (coreRevenue > 0)
    lines.push({ accountId: revenueAccountId, debit: 0, credit: coreRevenue, description: "درآمد اقامت/استخر" });
  if (services > 0)
    lines.push({ accountId: servicesRevenueId, debit: 0, credit: services, description: "درآمد خدمات و امکانات" });

  await createJournalEntry({
    date: todayISO(),
    description: `رزرو ${booking.reservationCode ?? booking.trackingCode} — ${booking.guestName}`,
    reference,
    source: "booking",
    lines,
  });
}

export async function getJournalBook(options?: { from?: string; to?: string; limit?: number; source?: string }) {
  const filters = [];
  if (options?.from) filters.push(gte(journalEntries.date, options.from));
  if (options?.to) filters.push(lte(journalEntries.date, options.to));
  if (options?.source && options.source !== "all") filters.push(eq(journalEntries.source, options.source));
  const entries = await db
    .select()
    .from(journalEntries)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(journalEntries.date), desc(journalEntries.number))
    .limit(options?.limit ?? 200);
  if (entries.length === 0) return [];
  const lines = await db
    .select({
      id: journalLines.id,
      entryId: journalLines.entryId,
      debit: journalLines.debit,
      credit: journalLines.credit,
      description: journalLines.description,
      accountCode: accounts.code,
      accountName: accounts.name,
    })
    .from(journalLines)
    .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
    .where(inArray(journalLines.entryId, entries.map((entry) => entry.id)))
    .orderBy(asc(journalLines.id));
  return entries.map((entry) => ({
    ...entry,
    lines: lines.filter((line) => line.entryId === entry.id),
  }));
}

export async function getTrialBalance(from?: string, to?: string) {
  const filters = [];
  if (from) filters.push(gte(journalEntries.date, from));
  if (to) filters.push(lte(journalEntries.date, to));
  const rows = await db
    .select({
      accountId: accounts.id,
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      level: accounts.level,
      debit: sql<number>`coalesce(sum(${journalLines.debit}), 0)`,
      credit: sql<number>`coalesce(sum(${journalLines.credit}), 0)`,
    })
    .from(accounts)
    .leftJoin(journalLines, eq(journalLines.accountId, accounts.id))
    .leftJoin(journalEntries, and(eq(journalLines.entryId, journalEntries.id), filters.length ? and(...filters) : undefined))
    .groupBy(accounts.id, accounts.code, accounts.name, accounts.type, accounts.level)
    .orderBy(asc(accounts.code));

  return rows.map((row) => {
    const debit = Number(row.debit);
    const credit = Number(row.credit);
    const balance = debit - credit;
    return {
      ...row,
      debit,
      credit,
      balance,
      balanceLabel: balance >= 0 ? "بدهکار" : "بستانکار",
    };
  });
}

export async function getProfitLoss(from?: string, to?: string) {
  const balance = await getTrialBalance(from, to);
  const revenue = balance.filter((row) => row.type === "revenue");
  const expenses = balance.filter((row) => row.type === "expense");
  const totalRevenue = revenue.reduce((sum, row) => sum + (row.credit - row.debit), 0);
  const totalExpenses = expenses.reduce((sum, row) => sum + (row.debit - row.credit), 0);
  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netProfit: totalRevenue - totalExpenses,
  };
}

export async function listAccounts() {
  return ensureChartOfAccounts();
}
