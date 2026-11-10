import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, campaigns, customers, diningVenues, faqs, galleryItems, giftCards, guestRequests, journalEntries, messages, partners, promotions, reservations, smsLogs, tableBookings, testimonials } from "@/db/schema";
import { verifyPassword } from "./auth";
import { getSettingsFresh } from "./data";

export const DEMO_EMAIL = "admin@espinas.ir";
export const DEMO_EMAILS = ["admin@espinas.ir", "admin@atalar.ir"];
export const DEMO_PASSWORD = "admin123";

/** Exact signatures of the records created by the demo seed – used to remove ONLY demo data. */
export const DEMO_RESERVATIONS: [string, string][] = [
  ["حسین رضایی", "09121234567"],
  ["نگار شریفی", "09351112233"],
  ["امیر حسینی", "09141239876"],
  ["فاطمه جعفری", "09193334455"],
  ["محمد صادقی", "09127778899"],
  ["زهرا کاظمی", "09381212121"],
  ["کامران عباسی", "09145556677"],
  ["لیلا مرادی", "09367654321"],
];
export const DEMO_MESSAGES = ["پریسا نادری", "مهدی فرهادی", "Elena Petrova"];
export const DEMO_TESTIMONIALS = ["مریم احمدی", "رضا کریمی", "سارا محمدی", "علی نوروزی"];
export const DEMO_VOUCHERS = [
  "واریز سرمایه اولیه به حساب بانکی",
  "پرداخت حقوق کارکنان",
  "قبوض آب، برق و گاز",
  "خرید مواد غذایی رستوران",
  "سرویس دوره‌ای و مواد ضدعفونی استخر",
  "تبلیغات اینترنتی",
  "فروش رستوران به مهمانان غیرمقیم",
];

export type DemoCategory = "reservations" | "messages" | "testimonials" | "vouchers" | "smsLogs" | "dining" | "extras" | "crm";

/**
 * Demo mode decides whether the demo login is advertised on the login page.
 *  - DEMO_MODE=false / true in the environment forces it off / on.
 *  - Otherwise the "demoMode" setting (toggle in the admin panel) is used.
 *  - Credentials are shown ONLY while the demo account still has the default password.
 */
export async function getDemoState() {
  const s = await getSettingsFresh();
  const env = process.env.DEMO_MODE;
  const forced = env === "true" || env === "false";
  const enabled = env === "false" ? false : env === "true" ? true : s.demoMode === "1";
  const [demoAdmin] = await db.select().from(admins).where(inArray(admins.email, DEMO_EMAILS));
  const defaultCredentials = !!demoAdmin && verifyPassword(DEMO_PASSWORD, demoAdmin.passwordHash);
  return { enabled, forced, defaultCredentials, showCredentials: process.env.NODE_ENV !== "production" && enabled && defaultCredentials, email: demoAdmin?.email ?? DEMO_EMAIL };
}

/** Does this admin still use the publicly known default password? */
export async function adminUsesDefaultPassword(adminId: number) {
  const [a] = await db.select().from(admins).where(eq(admins.id, adminId));
  return !!a && verifyPassword(DEMO_PASSWORD, a.passwordHash);
}

function reservationFilter() {
  return eq(reservations.isDemo, true);
}
function voucherFilter() {
  return and(eq(journalEntries.isDemo, true), ne(journalEntries.source, "reservation"))!;
}

export async function demoDataCounts(): Promise<Record<DemoCategory, number>> {
  const count = sql<number>`count(*)::int`;
  const [[r], [m], [t], [v], [s], [d], [e1], [e2], [e3], [k1], [k2], [k3], [k4], [k5], [k6]] = await Promise.all([
    db.select({ c: count }).from(reservations).where(reservationFilter()),
    db.select({ c: count }).from(messages).where(eq(messages.isDemo, true)),
    db.select({ c: count }).from(testimonials).where(eq(testimonials.isDemo, true)),
    db.select({ c: count }).from(journalEntries).where(voucherFilter()),
    db.select({ c: count }).from(smsLogs),
    db.select({ c: count }).from(diningVenues).where(eq(diningVenues.isDemo, true)),
    db.select({ c: count }).from(promotions).where(eq(promotions.isDemo, true)),
    db.select({ c: count }).from(faqs).where(eq(faqs.isDemo, true)),
    db.select({ c: count }).from(galleryItems).where(eq(galleryItems.isDemo, true)),
    db.select({ c: count }).from(customers).where(eq(customers.isDemo, true)),
    db.select({ c: count }).from(campaigns).where(eq(campaigns.isDemo, true)),
    db.select({ c: count }).from(giftCards).where(eq(giftCards.isDemo, true)),
    db.select({ c: count }).from(tableBookings).where(eq(tableBookings.isDemo, true)),
    db.select({ c: count }).from(guestRequests).where(eq(guestRequests.isDemo, true)),
    db.select({ c: count }).from(partners).where(eq(partners.isDemo, true)),
  ]);
  return { reservations: r.c, messages: m.c, testimonials: t.c, vouchers: v.c, smsLogs: s.c, dining: d.c, extras: e1.c + e2.c + e3.c, crm: k1.c + k2.c + k3.c + k4.c + k5.c + k6.c };
}

export async function removeDemoData(categories: DemoCategory[]) {
  const removed: Partial<Record<DemoCategory, number>> = {};
  await db.transaction(async (tx) => {
    if (categories.includes("reservations")) {
      const ids = (await tx.select({ id: reservations.id }).from(reservations).where(reservationFilter())).map((x) => x.id);
      if (ids.length) {
        await tx.delete(journalEntries).where(and(eq(journalEntries.source, "reservation"), inArray(journalEntries.reservationId, ids)));
        await tx.delete(reservations).where(inArray(reservations.id, ids));
      }
      removed.reservations = ids.length;
    }
    if (categories.includes("messages")) {
      removed.messages = (await tx.delete(messages).where(eq(messages.isDemo, true)).returning({ id: messages.id })).length;
    }
    if (categories.includes("testimonials")) {
      removed.testimonials = (await tx.delete(testimonials).where(eq(testimonials.isDemo, true)).returning({ id: testimonials.id })).length;
    }
    if (categories.includes("vouchers")) {
      removed.vouchers = (await tx.delete(journalEntries).where(voucherFilter()).returning({ id: journalEntries.id })).length;
    }
    if (categories.includes("dining")) {
      removed.dining = (await tx.delete(diningVenues).where(eq(diningVenues.isDemo, true)).returning({ id: diningVenues.id })).length;
    }
    if (categories.includes("extras")) {
      const a = await tx.delete(promotions).where(eq(promotions.isDemo, true)).returning({ id: promotions.id });
      const b = await tx.delete(faqs).where(eq(faqs.isDemo, true)).returning({ id: faqs.id });
      const g = await tx.delete(galleryItems).where(eq(galleryItems.isDemo, true)).returning({ id: galleryItems.id });
      removed.extras = a.length + b.length + g.length;
    }
    if (categories.includes("crm")) {
      let n = 0;
      n += (await tx.delete(guestRequests).where(eq(guestRequests.isDemo, true)).returning({ id: guestRequests.id })).length;
      n += (await tx.delete(tableBookings).where(eq(tableBookings.isDemo, true)).returning({ id: tableBookings.id })).length;
      n += (await tx.delete(campaigns).where(eq(campaigns.isDemo, true)).returning({ id: campaigns.id })).length;
      n += (await tx.delete(giftCards).where(eq(giftCards.isDemo, true)).returning({ id: giftCards.id })).length;
      await tx.update(reservations).set({ customerId: null }).where(inArray(reservations.customerId, tx.select({ id: customers.id }).from(customers).where(eq(customers.isDemo, true))));
      n += (await tx.delete(customers).where(eq(customers.isDemo, true)).returning({ id: customers.id })).length;
      n += (await tx.update(partners).set({ isActive: false, tokenHash: "" }).where(eq(partners.isDemo, true)).returning({ id: partners.id })).length;
      removed.crm = n;
    }
    if (categories.includes("smsLogs")) {
      removed.smsLogs = (await tx.delete(smsLogs).returning({ id: smsLogs.id })).length;
    }
  });
  return removed;
}
