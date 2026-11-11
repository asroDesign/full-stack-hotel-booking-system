import { and, asc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, costCenters, journalEntries, journalLines, reservations, type Account, type AccountType, type Reservation } from "@/db/schema";

export const ACC = {
  CASH: "110101",
  BANK: "110201",
  GATEWAY: "110202",
  RECEIVABLE: "130101",
  PREPAY: "220101",
  ROOM_REV: "410101",
  ROOM_EXTRA_REV: "410102",
  POOL_REV: "410201",
  SERVICE_REV: "410202",
} as const;

export const typeLabel: Record<AccountType, string> = {
  asset: "دارایی",
  liability: "بدهی",
  equity: "حقوق صاحبان سرمایه",
  revenue: "درآمد",
  expense: "هزینه",
};
export const levelLabel = ["", "کل", "معین", "تفصیلی"];
export const debitNature = (t: AccountType) => t === "asset" || t === "expense";

type Seed = [code: string, name: string, type: AccountType, children?: Seed[]];
const CHART: Seed[] = [
  ["11", "موجودی نقد و بانک", "asset", [
    ["1101", "صندوق", "asset", [["110101", "صندوق هتل", "asset"]]],
    ["1102", "بانک‌ها", "asset", [["110201", "بانک ملی - حساب جاری", "asset"], ["110202", "درگاه پرداخت اینترنتی", "asset"]]],
  ]],
  ["13", "حساب‌های دریافتنی", "asset", [["1301", "دریافتنی از مهمانان", "asset", [["130101", "مانده رزرو مهمانان", "asset"]]]]],
  ["15", "دارایی‌های ثابت", "asset", [["1501", "اثاثیه و تجهیزات", "asset", [["150101", "تجهیزات اتاق‌ها", "asset"], ["150102", "تجهیزات استخر", "asset"]]]]],
  ["21", "حساب‌های پرداختنی", "liability", [["2101", "پرداختنی تجاری", "liability", [["210101", "تامین‌کنندگان", "liability"]]], ["2102", "مالیات و عوارض پرداختنی", "liability", [["210201", "مالیات بر ارزش افزوده", "liability"]]]]],
  ["22", "پیش‌دریافت‌ها", "liability", [["2201", "پیش‌دریافت رزرو", "liability", [["220101", "پیش‌پرداخت مهمانان", "liability"], ["220102", "کارت‌های هدیه فروش‌رفته", "liability"]]]]],
  ["31", "سرمایه", "equity", [["3101", "سرمایه", "equity", [["310101", "سرمایه مالک", "equity"]]], ["3102", "برداشت", "equity", [["310201", "برداشت مالک", "equity"]]]]],
  ["41", "درآمدهای عملیاتی", "revenue", [
    ["4101", "درآمد اقامت", "revenue", [["410101", "درآمد اتاق‌ها", "revenue"], ["410102", "درآمد خدمات و وعده‌های اتاق", "revenue"]]],
    ["4102", "درآمد خدمات", "revenue", [["410201", "درآمد استخر خانوادگی", "revenue"], ["410202", "درآمد سایر خدمات", "revenue"], ["410203", "درآمد رستوران و کافه", "revenue"]]],
  ]],
  ["42", "درآمدهای غیرعملیاتی", "revenue", [["4201", "درآمدهای متفرقه", "revenue", [["420101", "سایر درآمدها", "revenue"]]]]],
  ["51", "هزینه‌های عملیاتی", "expense", [
    ["5101", "حقوق و دستمزد", "expense", [["510101", "حقوق کارکنان", "expense"], ["510102", "بیمه کارکنان", "expense"]]],
    ["5102", "آب، برق و گاز", "expense", [["510201", "قبوض آب و برق و گاز", "expense"]]],
    ["5103", "تعمیرات و نگهداری", "expense", [["510301", "تعمیرات ساختمان و تاسیسات", "expense"], ["510302", "نگهداری استخر", "expense"]]],
    ["5104", "مواد مصرفی", "expense", [["510401", "مواد غذایی", "expense"], ["510402", "مواد بهداشتی و شوینده", "expense"]]],
  ]],
  ["52", "هزینه‌های اداری و فروش", "expense", [
    ["5201", "تبلیغات و بازاریابی", "expense", [["520101", "تبلیغات اینترنتی", "expense"]]],
    ["5202", "هزینه‌های عمومی", "expense", [["520201", "کارمزد بانکی", "expense"], ["520202", "هزینه پیامک", "expense"], ["520203", "سایر هزینه‌ها", "expense"]]],
  ]],
];

let ensured: Promise<void> | null = null;
export function ensureAccounts(): Promise<void> {
  if (!ensured) {
    ensured = (async () => {
      const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(accounts);
      if (c > 0) {
        // upgrade: add system accounts introduced in newer versions (never modifies existing ones)
        const add = async (parentCode: string, code: string, name: string, type: AccountType) => {
          const [parent] = await db.select().from(accounts).where(eq(accounts.code, parentCode));
          if (parent) await db.insert(accounts).values({ code, name, type, level: 3, parentId: parent.id, isSystem: true }).onConflictDoNothing();
        };
        await add("4102", "410203", "درآمد رستوران و کافه", "revenue");
        await add("2201", "220102", "کارت‌های هدیه فروش‌رفته", "liability");
        return;
      }
      const insert = async (nodes: Seed[], parentId: number | null, level: number) => {
        for (const [code, name, type, children] of nodes) {
          const [row] = await db
            .insert(accounts)
            .values({ code, name, type, level, parentId, isSystem: true })
            .onConflictDoNothing()
            .returning({ id: accounts.id });
          if (row && children) await insert(children, row.id, level + 1);
        }
      };
      await insert(CHART, null, 1);
      // upgrade path: create vouchers for reservations that already exist
      const existing = await db.select().from(reservations);
      for (const r of existing) if (r.paidAt || r.status === "confirmed") await syncVouchersRaw(r);
    })().catch((e) => {
      ensured = null;
      throw e;
    });
  }
  return ensured;
}

export async function getCostCenters(activeOnly = false) {
  const rows = await db.select().from(costCenters).orderBy(asc(costCenters.code));
  return activeOnly ? rows.filter((center) => center.isActive) : rows;
}

export async function accountIdsByCode(codes: string[]) {
  const rows = await db.select({ id: accounts.id, code: accounts.code }).from(accounts).where(inArray(accounts.code, codes));
  return new Map(rows.map((r) => [r.code, r.id]));
}

export type VoucherLineInput = { accountId?: number; code?: string; debit: number; credit: number; description?: string; costCenterId?: number | null };
export type VoucherInput = {
  date: string;
  description: string;
  source?: string;
  sourceType?: string;
  reservationId?: number | null;
  createdBy?: string;
  lines: VoucherLineInput[];
};

export async function createVoucher(v: VoucherInput): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  await ensureAccounts();
  return createVoucherRaw(v);
}

/** Internal: assumes the chart of accounts already exists (no ensureAccounts → no deadlock in bootstrap). */
async function createVoucherRaw(v: VoucherInput): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return { ok: false, error: "تاریخ سند نامعتبر است." };
  const codes = v.lines.filter((l) => l.code).map((l) => l.code!);
  const byCode = codes.length ? await accountIdsByCode(codes) : new Map<string, number>();
  const lines = v.lines
    .map((l) => ({
      accountId: l.accountId ?? byCode.get(l.code ?? "") ?? 0,
      costCenterId: Number(l.costCenterId) || null,
      debit: Math.round(Math.max(0, Number(l.debit) || 0)),
      credit: Math.round(Math.max(0, Number(l.credit) || 0)),
      description: String(l.description ?? "").slice(0, 300),
    }))
    .filter((l) => l.debit > 0 || l.credit > 0);
  if (lines.length < 2) return { ok: false, error: "سند باید حداقل دو ردیف داشته باشد." };
  if (lines.some((l) => l.debit > 0 && l.credit > 0)) return { ok: false, error: "هر ردیف فقط می‌تواند بدهکار یا بستانکار باشد." };
  const td = lines.reduce((s, l) => s + l.debit, 0);
  const tc = lines.reduce((s, l) => s + l.credit, 0);
  if (td !== tc) return { ok: false, error: "سند تراز نیست؛ جمع بدهکار و بستانکار باید برابر باشد." };
  const ids = Array.from(new Set(lines.map((l) => l.accountId)));
  const accs = await db.select().from(accounts).where(inArray(accounts.id, ids));
  if (accs.length !== ids.length || accs.some((a) => a.level !== 3 || !a.isActive))
    return { ok: false, error: "ثبت سند فقط روی حساب‌های تفصیلی فعال امکان‌پذیر است." };
  const centers = Array.from(new Set(lines.flatMap((line) => line.costCenterId ? [line.costCenterId] : [])));
  if (centers.length) {
    const activeCenters = await db.select().from(costCenters).where(inArray(costCenters.id, centers));
    if (activeCenters.length !== centers.length || activeCenters.some((center) => !center.isActive)) return { ok: false, error: "مرکز هزینه انتخاب‌شده فعال یا معتبر نیست." };
    const accountById = new Map(accs.map((account) => [account.id, account]));
    if (lines.some((line) => line.costCenterId && accountById.get(line.accountId)?.type !== "expense")) return { ok: false, error: "مرکز هزینه فقط برای ردیف حساب‌های هزینه قابل ثبت است." };
  }

  const id = await db.transaction(async (tx) => {
    const [e] = await tx
      .insert(journalEntries)
      .values({
        date: v.date,
        description: v.description.slice(0, 500),
        source: v.source ?? "manual",
        sourceType: v.sourceType ?? "",
        reservationId: v.reservationId ?? null,
        createdBy: v.createdBy ?? "",
      })
      .returning({ id: journalEntries.id });
    await tx.insert(journalLines).values(lines.map((l) => ({ ...l, entryId: e.id })));
    return e.id;
  });
  return { ok: true, id };
}

/** Local calendar date (server timezone) as ISO yyyy-mm-dd. */
export function dateToISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Keep the automatic vouchers of a reservation in sync with its state:
 *  deposit    : Dr bank/gateway       / Cr guest prepayments        (deposit received)
 *  revenue    : Dr prepayments + A/R  / Cr room|service revenue      (reservation confirmed)
 *  refund     : Dr prepayments        / Cr bank                       (rejected/cancelled after payment)
 *  settlement : Dr cash               / Cr A/R                        (balance paid at check-in)
 */
export async function syncReservationVouchers(resOrId: number | Reservation) {
  await ensureAccounts();
  return syncVouchersRaw(resOrId);
}

async function syncVouchersRaw(resOrId: number | Reservation) {
  const r = typeof resOrId === "number" ? (await db.select().from(reservations).where(eq(reservations.id, resOrId)))[0] : resOrId;
  if (!r) return;
  const existing = await db
    .select({ id: journalEntries.id, sourceType: journalEntries.sourceType, date: journalEntries.date })
    .from(journalEntries)
    .where(and(eq(journalEntries.source, "reservation"), eq(journalEntries.reservationId, r.id)));
  const oldDate = (t: string) => existing.find((e) => e.sourceType === t)?.date;
  const today = dateToISO(new Date());
  const label = `${r.guestName} · ${r.itemName} · ${r.trackingCode}`;
  const paid = !!r.paidAt && r.depositAmount > 0;
  const deposit = paid ? r.depositAmount : 0;
  const total = r.totalPrice;
  const cashAcc = r.paymentMethod === "gateway" ? ACC.GATEWAY : ACC.BANK;

  const desired: VoucherInput[] = [];
  if (paid) {
    desired.push({
      date: oldDate("deposit") ?? dateToISO(r.paidAt!),
      description: `دریافت پیش‌پرداخت رزرو - ${label}`,
      sourceType: "deposit",
      lines: [
        ...(r.giftCardAmount > 0 ? [{ code: "220102", debit: Math.min(deposit, r.giftCardAmount), credit: 0, description: `کارت هدیه ${r.giftCardCode}` }] : []),
        ...(deposit - Math.min(deposit, r.giftCardAmount) > 0
          ? [{ code: cashAcc, debit: deposit - Math.min(deposit, r.giftCardAmount), credit: 0, description: r.paymentRef ? `مرجع ${r.paymentRef}` : "" }]
          : []),
        { code: ACC.PREPAY, debit: 0, credit: deposit },
      ],
    });
  }
  if (r.status === "confirmed" && total > 0) {
    const revLines: VoucherLineInput[] = [];
    if (r.kind === "room") {
      // total is net of any promo discount; never let a part go negative
      const roomPart = Math.max(0, total - r.optionsTotal);
      const optionsPart = total - roomPart;
      if (roomPart > 0) revLines.push({ code: ACC.ROOM_REV, debit: 0, credit: roomPart });
      if (optionsPart > 0) revLines.push({ code: ACC.ROOM_EXTRA_REV, debit: 0, credit: optionsPart });
    } else {
      revLines.push({ code: r.itemName.includes("استخر") ? ACC.POOL_REV : ACC.SERVICE_REV, debit: 0, credit: total });
    }
    const lines: VoucherLineInput[] = [];
    if (deposit > 0) lines.push({ code: ACC.PREPAY, debit: Math.min(deposit, total), credit: 0 });
    if (total - deposit > 0) lines.push({ code: ACC.RECEIVABLE, debit: total - deposit, credit: 0 });
    desired.push({
      date: oldDate("revenue") ?? (r.confirmedAt ? dateToISO(r.confirmedAt) : today),
      description: `شناسایی درآمد رزرو ${r.reservationCode ?? ""} - ${label}`,
      sourceType: "revenue",
      lines: [...lines, ...revLines],
    });
    if (r.settledAt && total - deposit > 0) {
      desired.push({
        date: oldDate("settlement") ?? dateToISO(r.settledAt),
        description: `تسویه مانده رزرو هنگام پذیرش - ${label}`,
        sourceType: "settlement",
        lines: [
          { code: ACC.CASH, debit: total - deposit, credit: 0 },
          { code: ACC.RECEIVABLE, debit: 0, credit: total - deposit },
        ],
      });
    }
  }
  if ((r.status === "rejected" || r.status === "cancelled") && paid) {
    desired.push({
      date: oldDate("refund") ?? today,
      description: `استرداد پیش‌پرداخت رزرو ${r.status === "rejected" ? "رد شده" : "لغو شده"} - ${label}`,
      sourceType: "refund",
      lines: [
        { code: ACC.PREPAY, debit: deposit, credit: 0 },
        { code: cashAcc, debit: 0, credit: deposit },
      ],
    });
  }

  if (existing.length) await db.delete(journalEntries).where(inArray(journalEntries.id, existing.map((e) => e.id)));
  for (const v of desired) await createVoucherRaw({ ...v, source: "reservation", reservationId: r.id, createdBy: "سیستم" });
}

/* ------------------------------ reports ------------------------------ */

export async function getAccounts() {
  await ensureAccounts();
  return db.select().from(accounts).orderBy(asc(accounts.code));
}

async function sums(from?: string, to?: string) {
  const conds = [];
  if (from) conds.push(gte(journalEntries.date, from));
  if (to) conds.push(lte(journalEntries.date, to));
  const rows = await db
    .select({
      accountId: journalLines.accountId,
      debit: sql<number>`coalesce(sum(${journalLines.debit}),0)::bigint`,
      credit: sql<number>`coalesce(sum(${journalLines.credit}),0)::bigint`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(journalLines.accountId);
  return new Map(rows.map((r) => [r.accountId, { debit: Number(r.debit), credit: Number(r.credit) }]));
}

function rollup(all: Account[], leaf: Map<number, { debit: number; credit: number }>) {
  const children = new Map<number, Account[]>();
  for (const a of all) if (a.parentId) children.set(a.parentId, [...(children.get(a.parentId) ?? []), a]);
  const memo = new Map<number, { debit: number; credit: number }>();
  const calc = (a: Account): { debit: number; credit: number } => {
    if (memo.has(a.id)) return memo.get(a.id)!;
    const own = leaf.get(a.id) ?? { debit: 0, credit: 0 };
    const res = (children.get(a.id) ?? []).reduce((acc, ch) => {
      const x = calc(ch);
      return { debit: acc.debit + x.debit, credit: acc.credit + x.credit };
    }, { ...own });
    memo.set(a.id, res);
    return res;
  };
  all.forEach(calc);
  return { totals: memo, children };
}

export type TrialRow = {
  id: number;
  code: string;
  name: string;
  level: number;
  type: AccountType;
  openDebit: number;
  openCredit: number;
  debit: number;
  credit: number;
  balDebit: number;
  balCredit: number;
};

export async function trialBalance(from: string, to: string, level: 1 | 2 | 3) {
  const all = await getAccounts();
  const [open, period] = await Promise.all([sums(undefined, prevDay(from)), sums(from, to)]);
  const o = rollup(all, open).totals;
  const p = rollup(all, period).totals;
  const rows: TrialRow[] = all
    .filter((a) => a.level === level)
    .map((a) => {
      const ob = (o.get(a.id)?.debit ?? 0) - (o.get(a.id)?.credit ?? 0);
      const pd = p.get(a.id)?.debit ?? 0;
      const pc = p.get(a.id)?.credit ?? 0;
      const bal = ob + pd - pc;
      return {
        id: a.id,
        code: a.code,
        name: a.name,
        level: a.level,
        type: a.type,
        openDebit: ob > 0 ? ob : 0,
        openCredit: ob < 0 ? -ob : 0,
        debit: pd,
        credit: pc,
        balDebit: bal > 0 ? bal : 0,
        balCredit: bal < 0 ? -bal : 0,
      };
    })
    .filter((r) => r.openDebit || r.openCredit || r.debit || r.credit);
  const total = rows.reduce(
    (t, r) => ({
      openDebit: t.openDebit + r.openDebit,
      openCredit: t.openCredit + r.openCredit,
      debit: t.debit + r.debit,
      credit: t.credit + r.credit,
      balDebit: t.balDebit + r.balDebit,
      balCredit: t.balCredit + r.balCredit,
    }),
    { openDebit: 0, openCredit: 0, debit: 0, credit: 0, balDebit: 0, balCredit: 0 },
  );
  return { rows, total };
}

export async function profitLoss(from: string, to: string) {
  const all = await getAccounts();
  const { totals } = rollup(all, await sums(from, to));
  const section = (type: "revenue" | "expense") => {
    const sign = type === "revenue" ? -1 : 1;
    const groups = all
      .filter((a) => a.type === type && a.level === 1)
      .map((g) => {
        const subs = all
          .filter((a) => a.parentId === g.id)
          .map((m) => ({
            code: m.code,
            name: m.name,
            amount: sign * ((totals.get(m.id)?.debit ?? 0) - (totals.get(m.id)?.credit ?? 0)),
            details: all
              .filter((t) => t.parentId === m.id)
              .map((t) => ({ code: t.code, name: t.name, amount: sign * ((totals.get(t.id)?.debit ?? 0) - (totals.get(t.id)?.credit ?? 0)) }))
              .filter((t) => t.amount !== 0),
          }))
          .filter((m) => m.amount !== 0 || m.details.length);
        return { code: g.code, name: g.name, amount: subs.reduce((s, x) => s + x.amount, 0), subs };
      })
      .filter((g) => g.subs.length);
    return { groups, total: groups.reduce((s, g) => s + g.amount, 0) };
  };
  const revenue = section("revenue");
  const expense = section("expense");
  return { revenue, expense, net: revenue.total - expense.total };
}

export async function journalBook(from: string, to: string, opts: { source?: string; q?: string } = {}) {
  await ensureAccounts();
  const conds = [gte(journalEntries.date, from), lte(journalEntries.date, to)];
  if (opts.source) conds.push(eq(journalEntries.source, opts.source));
  if (opts.q) conds.push(sql`(${journalEntries.description} ilike ${"%" + opts.q + "%"} or cast(${journalEntries.id} as text) ilike ${"%" + opts.q + "%"})`);
  const entries = await db
    .select()
    .from(journalEntries)
    .where(and(...conds))
    .orderBy(asc(journalEntries.date), asc(journalEntries.id))
    .limit(1000);
  if (!entries.length) return [];
  const lines = await db
    .select({
      entryId: journalLines.entryId,
      debit: journalLines.debit,
      credit: journalLines.credit,
      description: journalLines.description,
      code: accounts.code,
      name: accounts.name,
      costCenterCode: costCenters.code,
      costCenterName: costCenters.name,
      id: journalLines.id,
    })
    .from(journalLines)
    .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
    .leftJoin(costCenters, eq(costCenters.id, journalLines.costCenterId))
    .where(inArray(journalLines.entryId, entries.map((e) => e.id)))
    .orderBy(asc(journalLines.id));
  return entries.map((e) => ({ ...e, lines: lines.filter((l) => l.entryId === e.id) }));
}

export async function ledger(accountId: number, from: string, to: string) {
  const all = await getAccounts();
  const acc = all.find((a) => a.id === accountId);
  if (!acc) return null;
  const ids = new Set<number>([acc.id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const a of all) if (a.parentId && ids.has(a.parentId) && !ids.has(a.id)) {
      ids.add(a.id);
      grew = true;
    }
  }
  const idList = Array.from(ids);
  const [openRow] = await db
    .select({ bal: sql<number>`coalesce(sum(${journalLines.debit} - ${journalLines.credit}),0)::bigint` })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
    .where(and(inArray(journalLines.accountId, idList), lt(journalEntries.date, from)));
  const rows = await db
    .select({
      id: journalLines.id,
      entryId: journalEntries.id,
      date: journalEntries.date,
      entryDesc: journalEntries.description,
      description: journalLines.description,
      debit: journalLines.debit,
      credit: journalLines.credit,
      code: accounts.code,
      name: accounts.name,
      costCenterCode: costCenters.code,
      costCenterName: costCenters.name,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
    .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
    .leftJoin(costCenters, eq(costCenters.id, journalLines.costCenterId))
    .where(and(inArray(journalLines.accountId, idList), gte(journalEntries.date, from), lte(journalEntries.date, to)))
    .orderBy(asc(journalEntries.date), asc(journalEntries.id), asc(journalLines.id))
    .limit(3000);
  let running = Number(openRow?.bal ?? 0);
  const opening = running;
  const out = rows.map((r) => {
    running += Number(r.debit) - Number(r.credit);
    return { ...r, debit: Number(r.debit), credit: Number(r.credit), balance: running };
  });
  return { account: acc, opening, rows: out, closing: running };
}

function prevDay(iso: string) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
