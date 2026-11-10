import { randomInt } from "crypto";
import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db, getPool } from "@/db";
import { campaigns, customers, promotions, reservations, settings, testimonials, type Campaign } from "@/db/schema";
import { getSettingsFresh } from "./data";
import { fillTemplate, isMobile, resolveAudience } from "./crm";
import { sendBulkText, sendText } from "./sms";
import { addDaysISO, formatJalali, isoToJalali, todayISO } from "./utils";

const LOCK_ID = 727_274_777;
const ALPHA = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const rand = (n: number) => Array.from({ length: n }, () => ALPHA[randomInt(ALPHA.length)]).join("");

async function createPrivateCode(prefix: string, kind: "percent" | "fixed", value: number, validDays: number, title: string) {
  for (let i = 0; i < 5; i++) {
    const code = `${prefix}${rand(6)}`;
    const [row] = await db
      .insert(promotions)
      .values({ code, title, kind, value, maxUses: 1, isPublic: false, appliesTo: "all", validTo: addDaysISO(todayISO(), validDays), description: title })
      .onConflictDoNothing()
      .returning({ code: promotions.code });
    if (row) return row.code;
  }
  throw new Error("could not create promo code");
}

/** Send (or continue sending) a campaign. Safe to call concurrently: only one caller wins the status transition. */
export async function sendCampaign(id: number) {
  const [c] = await db
    .update(campaigns)
    .set({ status: "sending" })
    .where(and(eq(campaigns.id, id), inArray(campaigns.status, ["draft", "scheduled"])))
    .returning();
  if (!c) return null;
  try {
    const s = await getSettingsFresh();
    // don't generate discount codes when nothing can be sent
    if ((s.smsProvider !== "kavenegar" && s.smsProvider !== "smsir") || !s.smsApiKey || !s.smsLineNumber) {
      const audience = await resolveAudience(c.audience, { marketing: true });
      await db.update(campaigns).set({ status: "failed", recipients: audience.length, sent: 0, failed: audience.length }).where(eq(campaigns.id, id));
      return null;
    }
    const audience = await resolveAudience(c.audience, { marketing: true });
    await db.update(campaigns).set({ recipients: audience.length }).where(eq(campaigns.id, id));
    let shared = c.promoCode;
    if (c.promoMode === "shared" && !shared) {
      shared = await createPrivateCode(`C${id}`, c.promoKind, c.promoValue, c.promoValidDays, `کمپین: ${c.name}`);
      await db.update(promotions).set({ maxUses: 0 }).where(eq(promotions.code, shared));
      await db.update(campaigns).set({ promoCode: shared }).where(eq(campaigns.id, id));
    }
    const expires = formatJalali(addDaysISO(todayISO(), c.promoValidDays));
    const personal = c.promoMode === "unique" || /\{name\}/.test(c.message);
    let sent = 0;
    let failed = 0;
    if (!personal) {
      const text = fillTemplate(c.message, { hotel: s.hotelName, code: shared, expires });
      const r = await sendBulkText(audience.map((a) => a.phone), text, { event: "campaign", campaignId: id, marketing: true });
      sent = r.sent;
      failed = r.failed + (r.disabled ? audience.length : 0);
    } else {
      for (const cu of audience) {
        const code = c.promoMode === "unique" ? await createPrivateCode(`C${id}-`, c.promoKind, c.promoValue, c.promoValidDays, `کمپین: ${c.name} - ${cu.name || cu.phone}`) : shared;
        const text = fillTemplate(c.message, { name: cu.name || "مهمان", hotel: s.hotelName, code, expires });
        const r = await sendText(cu.phone, text, { event: "campaign", campaignId: id, marketing: true });
        sent += r.sent;
        failed += r.failed + (r.disabled ? 1 : 0);
        if (sent + failed > 0 && (sent + failed) % 25 === 0) await db.update(campaigns).set({ sent, failed }).where(eq(campaigns.id, id));
      }
    }
    const [done] = await db
      .update(campaigns)
      .set({ status: sent === 0 && failed > 0 ? "failed" : "sent", sent, failed, sentAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return done;
  } catch (e) {
    console.error("[campaign] failed", e);
    await db.update(campaigns).set({ status: "failed" }).where(eq(campaigns.id, id));
    return null;
  }
}

export async function runBirthdayJob(force = false) {
  const s = await getSettingsFresh();
  if (s.birthdayEnabled !== "1") return 0;
  const today = todayISO();
  const [last] = await db.select().from(settings).where(eq(settings.key, "job_birthday_last"));
  if (!force && last?.value === today) return 0;
  await db.insert(settings).values({ key: "job_birthday_last", value: today }).onConflictDoUpdate({ target: settings.key, set: { value: today } });
  const target = isoToJalali(addDaysISO(today, Math.max(0, Number(s.birthdayDaysBefore) || 0)));
  const year = isoToJalali(today).jy;
  const list = (await db.select().from(customers)).filter((c) => {
    if (!c.birthDate || !c.smsOptIn || c.birthdaySentYear >= year || !isMobile(c.phone)) return false;
    const b = isoToJalali(c.birthDate);
    return b.jm === target.jm && b.jd === target.jd;
  });
  const percent = Math.min(100, Math.max(1, Number(s.birthdayPercent) || 20));
  const days = Math.max(1, Number(s.birthdayValidDays) || 30);
  let n = 0;
  for (const c of list) {
    const code = await createPrivateCode("BD", "percent", percent, days, `هدیه تولد ${c.name || c.phone}`);
    const text = fillTemplate(s.birthdayMessage, { name: c.name || "مهمان", hotel: s.hotelName, code, percent, expires: formatJalali(addDaysISO(today, days)) });
    await sendText(c.phone, text, { event: "birthday", marketing: true });
    await db.update(customers).set({ birthdaySentYear: year }).where(eq(customers.id, c.id));
    n++;
  }
  return n;
}

export async function runReviewInvites() {
  const s = await getSettingsFresh();
  if (s.reviewInviteEnabled !== "1") return 0;
  const today = todayISO();
  const rows = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.kind, "room"),
        eq(reservations.status, "confirmed"),
        isNull(reservations.reviewInviteSentAt),
        lte(reservations.checkOut, today),
        gte(reservations.checkOut, addDaysISO(today, -3)),
      ),
    )
    .limit(100);
  let n = 0;
  for (const r of rows) {
    const [has] = await db.select({ id: testimonials.id }).from(testimonials).where(eq(testimonials.reservationId, r.id));
    await db.update(reservations).set({ reviewInviteSentAt: new Date() }).where(eq(reservations.id, r.id));
    if (has) continue;
    const link = `${(s.siteUrl || "").replace(/\/$/, "")}/reviews?code=${encodeURIComponent(r.reservationCode ?? "")}`;
    await sendText(r.phone, fillTemplate(s.reviewInviteMessage, { name: r.guestName, hotel: s.hotelName, link }), { event: "review_invite" });
    n++;
  }
  return n;
}

/** All periodic work. Uses a PostgreSQL advisory lock so only one process runs it at a time. */
export async function runDueJobs() {
  const client = await getPool().connect();
  let locked = false;
  try {
    locked = (await client.query<{ ok: boolean }>("select pg_try_advisory_lock($1) as ok", [LOCK_ID])).rows[0]?.ok ?? false;
    if (!locked) return { skipped: true };
    const due: Campaign[] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.status, "scheduled"), lte(campaigns.scheduledAt, sql`now()`)));
    for (const c of due) await sendCampaign(c.id);
    const birthdays = await runBirthdayJob();
    const invites = await runReviewInvites();
    return { campaigns: due.length, birthdays, invites };
  } catch (e) {
    console.error("[jobs] failed", e);
    return { error: true };
  } finally {
    if (locked) await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
}
