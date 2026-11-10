import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { customerGroupMembers, customerGroups, customers, reservations, settings, type Customer, type CustomerTier, type Reservation, type SegmentRules, type CampaignAudience } from "@/db/schema";
import { getSettingsFresh, type SiteSettings } from "./data";
import { diffDays, isoToJalali, todayISO } from "./utils";

export const TIERS: { key: CustomerTier; label: string; badge: string }[] = [
  { key: "bronze", label: "برنزی", badge: "badge-ghost" },
  { key: "silver", label: "نقره‌ای", badge: "badge-info" },
  { key: "gold", label: "طلایی", badge: "badge-warning" },
  { key: "platinum", label: "پلاتینیوم", badge: "badge-primary" },
];
export const tierLabel = (t: string) => TIERS.find((x) => x.key === t)?.label ?? "برنزی";
export const tierBadge = (t: string) => TIERS.find((x) => x.key === t)?.badge ?? "badge-ghost";

export const SOURCES: { key: string; label: string; color: string }[] = [
  { key: "website", label: "سایت", color: "#0ea5e9" },
  { key: "walk_in", label: "حضوری", color: "#22c55e" },
  { key: "phone", label: "تلفنی", color: "#a855f7" },
  { key: "agency", label: "آژانس", color: "#f59e0b" },
  { key: "partner_site", label: "سایت همکار", color: "#ef4444" },
  { key: "admin", label: "پنل مدیریت", color: "#64748b" },
];
export const sourceLabel = (s: string) => SOURCES.find((x) => x.key === s)?.label ?? s;
export const sourceColor = (s: string) => SOURCES.find((x) => x.key === s)?.color ?? "#64748b";

export function normalizeMobile(m: string) {
  const d = String(m ?? "")
    .replace(/[۰-۹]/g, (x) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(x)))
    .replace(/[^\d]/g, "");
  if (d.startsWith("0098") && d.length === 14) return "0" + d.slice(4);
  if (d.startsWith("98") && d.length === 12) return "0" + d.slice(2);
  if (d.length === 10 && d.startsWith("9")) return "0" + d;
  return d;
}
export const isMobile = (m: string) => /^09\d{9}$/.test(m);

export function tierFor(total: number, s: Pick<SiteSettings, "tierSilver" | "tierGold" | "tierPlatinum">): CustomerTier {
  if (total >= Number(s.tierPlatinum || Infinity)) return "platinum";
  if (total >= Number(s.tierGold || Infinity)) return "gold";
  if (total >= Number(s.tierSilver || Infinity)) return "silver";
  return "bronze";
}

/** Create or update a customer profile by mobile number. */
export async function upsertCustomer(input: { name?: string; phone: string; email?: string; nationalId?: string; source?: string }) {
  const phone = normalizeMobile(input.phone);
  if (!phone || phone.length < 8) return null;
  const [existing] = await db.select().from(customers).where(eq(customers.phone, phone));
  if (existing) {
    const patch: Partial<Customer> = {};
    if (input.name && !existing.name) patch.name = input.name;
    if (input.email && !existing.email) patch.email = input.email;
    if (input.nationalId && !existing.nationalId) patch.nationalId = input.nationalId;
    if (Object.keys(patch).length) await db.update(customers).set(patch).where(eq(customers.id, existing.id));
    return existing.id;
  }
  const [row] = await db
    .insert(customers)
    .values({ phone, name: input.name ?? "", email: input.email ?? "", nationalId: input.nationalId ?? "", source: input.source ?? "website" })
    .onConflictDoUpdate({ target: customers.phone, set: { phone } })
    .returning({ id: customers.id });
  return row?.id ?? null;
}

/** Recalculate stays, spending, tier and points from confirmed reservations. */
export async function recomputeCustomer(customerId: number, s?: SiteSettings) {
  const st = s ?? (await getSettingsFresh());
  const [agg] = await db
    .select({
      stays: sql<number>`count(*) filter (where ${reservations.kind} = 'room')::int`,
      spent: sql<number>`coalesce(sum(${reservations.totalPrice}),0)::bigint`,
      last: sql<string | null>`max(${reservations.checkIn}) filter (where ${reservations.kind} = 'room')`,
    })
    .from(reservations)
    .where(and(eq(reservations.customerId, customerId), eq(reservations.status, "confirmed")));
  const spent = Number(agg?.spent ?? 0);
  await db
    .update(customers)
    .set({
      staysCount: agg?.stays ?? 0,
      totalSpent: spent,
      lastStayAt: agg?.last ?? null,
      tier: tierFor(spent, st),
      points: Math.floor(spent / Math.max(1, Number(st.pointsPer) || 1_000_000)),
    })
    .where(eq(customers.id, customerId));
}

/** Link a reservation to its customer profile (creates the profile when needed). */
export async function linkReservationCustomer(r: Reservation) {
  const id = r.customerId ?? (await upsertCustomer({ name: r.guestName, phone: r.phone, email: r.email, nationalId: r.nationalId, source: r.source }));
  if (!id) return null;
  if (r.customerId !== id) await db.update(reservations).set({ customerId: id }).where(eq(reservations.id, r.id));
  await recomputeCustomer(id);
  return id;
}

export function matchesRules(c: Customer, rules: SegmentRules, today = todayISO()) {
  if (rules.tiers?.length && !rules.tiers.includes(c.tier)) return false;
  if (rules.minStays && c.staysCount < rules.minStays) return false;
  if (rules.minSpent && c.totalSpent < rules.minSpent) return false;
  if (rules.city && !c.city.includes(rules.city)) return false;
  if (rules.source && c.source !== rules.source) return false;
  if (rules.tag && !c.tags.includes(rules.tag)) return false;
  if (rules.birthdayMonth) {
    if (!c.birthDate || isoToJalali(c.birthDate).jm !== rules.birthdayMonth) return false;
  }
  if (rules.lastStayWithinDays) {
    if (!c.lastStayAt || diffDays(c.lastStayAt, today) > rules.lastStayWithinDays) return false;
  }
  if (rules.lastStayBeforeDays) {
    if (!c.lastStayAt || diffDays(c.lastStayAt, today) < rules.lastStayBeforeDays) return false;
  }
  return true;
}

export async function groupMemberIds(groupId: number): Promise<number[]> {
  const [g] = await db.select().from(customerGroups).where(eq(customerGroups.id, groupId));
  if (!g) return [];
  if (g.kind === "static") {
    const rows = await db.select({ id: customerGroupMembers.customerId }).from(customerGroupMembers).where(eq(customerGroupMembers.groupId, groupId));
    return rows.map((r) => r.id);
  }
  const all = await db.select().from(customers);
  return all.filter((c) => matchesRules(c, g.rules)).map((c) => c.id);
}

export async function groupCounts() {
  const groups = await db.select().from(customerGroups);
  const all = await db.select().from(customers);
  const members = await db.select().from(customerGroupMembers);
  return new Map(
    groups.map((g) => [g.id, g.kind === "static" ? members.filter((m) => m.groupId === g.id).length : all.filter((c) => matchesRules(c, g.rules)).length]),
  );
}

/** Resolve a campaign audience to customers (opted-in, valid mobile, de-duplicated). */
export async function resolveAudience(a: CampaignAudience, opts: { marketing?: boolean } = { marketing: true }) {
  let list: Customer[];
  if (a.all || (!a.groupIds?.length && !a.tiers?.length)) {
    list = await db.select().from(customers);
  } else {
    const ids = new Set<number>();
    for (const gid of a.groupIds ?? []) for (const id of await groupMemberIds(gid)) ids.add(id);
    const base = ids.size ? await db.select().from(customers).where(inArray(customers.id, [...ids])) : a.tiers?.length ? await db.select().from(customers) : [];
    list = a.tiers?.length ? (ids.size ? base.filter((c) => a.tiers!.includes(c.tier)) : base.filter((c) => a.tiers!.includes(c.tier))) : base;
  }
  const seen = new Set<string>();
  return list.filter((c) => {
    if (opts.marketing && !c.smsOptIn) return false;
    if (!isMobile(c.phone) || seen.has(c.phone)) return false;
    seen.add(c.phone);
    return true;
  });
}

export function fillTemplate(tpl: string, vars: Record<string, string | number | undefined>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : ""));
}

/** One-time upgrade: create customer profiles for all existing reservations. */
export async function ensureCustomersBackfill() {
  const [flag] = await db.select().from(settings).where(eq(settings.key, "seed_customers_v1"));
  if (flag) return;
  const all = await db.select().from(reservations);
  const s = await getSettingsFresh();
  const touched = new Set<number>();
  for (const r of all) {
    const id = r.customerId ?? (await upsertCustomer({ name: r.guestName, phone: r.phone, email: r.email, nationalId: r.nationalId, source: r.source }));
    if (!id) continue;
    if (r.customerId !== id) await db.update(reservations).set({ customerId: id }).where(eq(reservations.id, r.id));
    touched.add(id);
  }
  for (const id of touched) await recomputeCustomer(id, s);
  await db.insert(settings).values({ key: "seed_customers_v1", value: "1" }).onConflictDoNothing();
}
