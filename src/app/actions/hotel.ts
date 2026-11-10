"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  campaigns,
  customerGroupMembers,
  customerGroups,
  customers,
  giftCards,
  guestRequestMessages,
  guestRequests,
  partners,
  reservationGuests,
  reservations,
  rooms,
  smsTemplates,
  tableBookings,
  type CampaignAudience,
  type CustomerTier,
  type ReservationSource,
  type SegmentRules,
} from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { roomConflicts } from "@/lib/availability";
import { quoteRoom } from "@/lib/pricing";
import { syncReservationVouchers } from "@/lib/accounting";
import { isMobile, linkReservationCustomer, normalizeMobile, recomputeCustomer, resolveAudience } from "@/lib/crm";
import { notifyGuest, sendBulkText, sendText } from "@/lib/sms";
import { runDueJobs, runBirthdayJob, sendCampaign } from "@/lib/jobs";
import { activateGiftCard, genGiftCode, voidGiftCard } from "@/lib/giftcards";
import { newCredentials } from "@/lib/partner-api";
import { addDaysISO, diffDays, genReservationCode, genTrackingCode, toEnDigits, todayISO } from "@/lib/utils";

type Res = { ok: boolean; message: string };
export type HState = { ok?: boolean; error?: string; message?: string } | null;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown) => Number(toEnDigits(String(v ?? "")).replace(/[,٬]/g, "")) || 0;
const str = (fd: FormData, k: string, max = 300) => cleanText(fd.get(k), max);
const TIER_KEYS: CustomerTier[] = ["bronze", "silver", "gold", "platinum"];
const SOURCE_KEYS: ReservationSource[] = ["website", "walk_in", "phone", "agency", "partner_site", "admin"];

/* ======================= front desk ======================= */

export type CompanionInput = { fullName: string; idNumber: string; nationality: string; phone: string; relation: string };

export async function createAdminReservation(_p: HState, fd: FormData): Promise<HState> {
  await requireAdmin();
  const roomId = num(fd.get("roomId"));
  const checkIn = String(fd.get("checkIn") ?? "");
  const checkOut = String(fd.get("checkOut") ?? "");
  const guests = Math.min(30, Math.max(1, num(fd.get("guests")) || 1));
  const name = str(fd, "guestName", 80);
  const phone = normalizeMobile(String(fd.get("phone") ?? ""));
  const sourceRaw = String(fd.get("source") ?? "walk_in") as ReservationSource;
  const source = SOURCE_KEYS.includes(sourceRaw) ? sourceRaw : "walk_in";
  const partnerId = num(fd.get("partnerId")) || null;
  const status = fd.get("status") === "pending" ? "pending_payment" : "confirmed";
  const checkInNow = fd.get("checkInNow") === "on";
  if (!roomId) return { error: "اتاق را انتخاب کنید." };
  if (!ISO.test(checkIn) || !ISO.test(checkOut) || checkOut <= checkIn) return { error: "تاریخ ورود و خروج را درست انتخاب کنید." };
  if (diffDays(checkIn, checkOut) > 60) return { error: "حداکثر ۶۰ شب." };
  if (name.length < 2) return { error: "نام مهمان را وارد کنید." };
  if (phone && !isMobile(phone)) return { error: "شماره موبایل معتبر نیست." };
  if ((source === "agency" || source === "partner_site") && !partnerId) return { error: "آژانس / سایت همکار را انتخاب کنید." };
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return { error: "اتاق یافت نشد." };
  if ((await roomConflicts(room.id, checkIn, checkOut)).length) return { error: "اتاق در این بازه رزرو قطعی یا پرداخت‌شده دارد." };
  const q = await quoteRoom(room, checkIn, checkOut, guests, []);
  const override = num(fd.get("totalOverride"));
  const total = override > 0 ? override : q.total;
  const deposit = Math.min(total, Math.max(0, num(fd.get("depositPaid"))));
  let companions: CompanionInput[] = [];
  try {
    companions = (JSON.parse(String(fd.get("companions") ?? "[]")) as CompanionInput[]).filter((c) => cleanText(c.fullName, 80)).slice(0, 30);
  } catch {
    /* ignore */
  }
  let commission = 0;
  if (partnerId) {
    const [p] = await db.select().from(partners).where(eq(partners.id, partnerId));
    commission = p ? Math.round((total * p.commissionPercent) / 100) : 0;
  }
  const [created] = await db
    .insert(reservations)
    .values({
      trackingCode: genTrackingCode(),
      reservationCode: status === "confirmed" ? genReservationCode() : null,
      kind: "room",
      roomId: room.id,
      itemName: room.name,
      guestName: name,
      phone: phone || "",
      email: str(fd, "email", 120),
      nationalId: toEnDigits(str(fd, "nationalId", 20)),
      guests,
      checkIn,
      checkOut,
      nights: diffDays(checkIn, checkOut),
      totalPrice: total,
      extraGuestFee: q.extraGuestFee,
      nightly: q.nights.map((n) => ({ date: n.date, price: n.price, kind: n.kind })),
      depositAmount: deposit,
      paymentMethod: deposit > 0 ? (String(fd.get("paymentMethod") ?? "cash").slice(0, 20) || "cash") : "",
      paymentRef: str(fd, "paymentRef", 40),
      paidAt: deposit > 0 ? new Date() : null,
      status,
      confirmedAt: status === "confirmed" ? new Date() : null,
      checkedInAt: checkInNow && status === "confirmed" ? new Date() : null,
      source,
      partnerId: source === "agency" || source === "partner_site" ? partnerId : null,
      externalRef: str(fd, "externalRef", 80),
      commission,
      notes: str(fd, "notes", 1000),
      adminNote: `ثبت ${source === "walk_in" ? "حضوری" : source === "phone" ? "تلفنی" : "دستی"} در پنل`,
    })
    .returning();
  if (companions.length)
    await db.insert(reservationGuests).values(
      companions.map((c) => ({
        reservationId: created.id,
        fullName: cleanText(c.fullName, 80),
        idNumber: toEnDigits(cleanText(c.idNumber, 30)),
        nationality: cleanText(c.nationality, 40) || "ایرانی",
        phone: cleanText(c.phone, 20),
        relation: cleanText(c.relation, 40),
      })),
    );
  await syncReservationVouchers(created);
  if (created.phone) await linkReservationCustomer(created).catch(() => null);
  if (status === "confirmed" && created.phone && fd.get("sendSms") === "on") after(() => notifyGuest(created, "guest_confirmed").then(() => undefined));
  revalidatePath("/admin", "layout");
  redirect(`/admin/reservations/${created.id}?created=1`);
}

export async function checkInReservation(id: number): Promise<Res> {
  await requireAdmin();
  const [r] = await db.select().from(reservations).where(eq(reservations.id, id));
  if (!r || r.status !== "confirmed") return { ok: false, message: "فقط رزرو قطعی قابل پذیرش است." };
  await db.update(reservations).set({ checkedInAt: new Date(), checkedOutAt: null }).where(eq(reservations.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${r.guestName} پذیرش (Check-in) شد.` };
}

export async function checkOutReservation(id: number): Promise<Res> {
  await requireAdmin();
  const [r] = await db.select().from(reservations).where(eq(reservations.id, id));
  if (!r || !r.checkedInAt) return { ok: false, message: "ابتدا پذیرش (Check-in) را ثبت کنید." };
  await db.update(reservations).set({ checkedOutAt: new Date() }).where(eq(reservations.id, id));
  if (r.roomId) await db.update(rooms).set({ housekeeping: "dirty" }).where(eq(rooms.id, r.roomId));
  revalidatePath("/admin", "layout");
  return { ok: true, message: `${r.guestName} تخلیه (Check-out) شد و اتاق برای نظافت علامت خورد.` };
}

export async function undoCheck(id: number, which: "in" | "out"): Promise<Res> {
  await requireAdmin();
  await db.update(reservations).set(which === "in" ? { checkedInAt: null, checkedOutAt: null } : { checkedOutAt: null }).where(eq(reservations.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true, message: "لغو شد." };
}

export async function setHousekeeping(roomId: number, status: "clean" | "dirty" | "inspected" | "out_of_order"): Promise<Res> {
  await requireAdmin();
  if (!["clean", "dirty", "inspected", "out_of_order"].includes(status)) return { ok: false, message: "وضعیت نامعتبر" };
  await db.update(rooms).set({ housekeeping: status }).where(eq(rooms.id, roomId));
  revalidatePath("/admin/front-desk");
  return { ok: true, message: "وضعیت اتاق به‌روز شد." };
}

export async function saveCompanions(reservationId: number, list: CompanionInput[]): Promise<Res> {
  await requireAdmin();
  const clean = list
    .map((c) => ({
      reservationId,
      fullName: cleanText(c.fullName, 80),
      idNumber: toEnDigits(cleanText(c.idNumber, 30)),
      nationality: cleanText(c.nationality, 40) || "ایرانی",
      phone: cleanText(c.phone, 20),
      relation: cleanText(c.relation, 40),
    }))
    .filter((c) => c.fullName)
    .slice(0, 30);
  await db.transaction(async (tx) => {
    await tx.delete(reservationGuests).where(eq(reservationGuests.reservationId, reservationId));
    if (clean.length) await tx.insert(reservationGuests).values(clean);
  });
  revalidatePath(`/admin/reservations/${reservationId}`);
  return { ok: true, message: `لیست ${clean.length} همراه ذخیره شد.` };
}

export async function setReservationSource(id: number, source: ReservationSource, partnerId: number | null): Promise<Res> {
  await requireAdmin();
  if (!SOURCE_KEYS.includes(source)) return { ok: false, message: "منبع نامعتبر" };
  await db.update(reservations).set({ source, partnerId: source === "agency" || source === "partner_site" ? partnerId : null }).where(eq(reservations.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true, message: "منبع رزرو به‌روز شد." };
}

/* ======================= customers & groups ======================= */

export async function saveCustomer(_p: HState, fd: FormData): Promise<HState> {
  await requireAdmin();
  const id = num(fd.get("id"));
  const phone = normalizeMobile(String(fd.get("phone") ?? ""));
  if (!isMobile(phone)) return { error: "شماره موبایل معتبر نیست." };
  const birth = String(fd.get("birthDate") ?? "");
  const data = {
    name: str(fd, "name", 80),
    phone,
    email: str(fd, "email", 120),
    nationalId: toEnDigits(str(fd, "nationalId", 20)),
    birthDate: ISO.test(birth) ? birth : null,
    gender: str(fd, "gender", 10),
    city: str(fd, "city", 60),
    tags: str(fd, "tags", 300)
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 20),
    notes: str(fd, "notes", 2000),
    smsOptIn: fd.get("smsOptIn") === "on",
  };
  let cid = id;
  try {
    if (id) await db.update(customers).set(data).where(eq(customers.id, id));
    else cid = (await db.insert(customers).values({ ...data, source: "admin" }).returning({ id: customers.id }))[0].id;
  } catch {
    return { error: "مشتری دیگری با این شماره موبایل وجود دارد." };
  }
  const groupIds = fd.getAll("groupIds").map(Number).filter(Boolean);
  const staticGroups = (await db.select().from(customerGroups).where(eq(customerGroups.kind, "static"))).map((g) => g.id);
  await db.delete(customerGroupMembers).where(and(eq(customerGroupMembers.customerId, cid), inArray(customerGroupMembers.groupId, staticGroups.length ? staticGroups : [0])));
  const keep = groupIds.filter((g) => staticGroups.includes(g));
  if (keep.length) await db.insert(customerGroupMembers).values(keep.map((groupId) => ({ groupId, customerId: cid }))).onConflictDoNothing();
  await db.update(reservations).set({ customerId: cid }).where(and(eq(reservations.phone, phone), sql`${reservations.customerId} is null`));
  await recomputeCustomer(cid);
  revalidatePath("/admin/customers", "layout");
  if (!id) redirect(`/admin/customers/${cid}`);
  return { ok: true, message: "پروفایل مشتری ذخیره شد." };
}

export async function deleteCustomer(id: number): Promise<Res> {
  await requireAdmin();
  await db.update(reservations).set({ customerId: null }).where(eq(reservations.customerId, id));
  await db.delete(customers).where(eq(customers.id, id));
  revalidatePath("/admin/customers", "layout");
  return { ok: true, message: "مشتری حذف شد (رزروها حفظ شدند)." };
}

export async function saveGroup(_p: HState, fd: FormData): Promise<HState> {
  await requireAdmin();
  const id = num(fd.get("id"));
  const name = str(fd, "name", 80);
  if (!name) return { error: "نام گروه الزامی است." };
  const kind = fd.get("kind") === "dynamic" ? "dynamic" : "static";
  const rules: SegmentRules = {};
  const tiers = fd.getAll("tiers").map(String).filter((t): t is CustomerTier => TIER_KEYS.includes(t as CustomerTier));
  if (tiers.length) rules.tiers = tiers;
  for (const k of ["minStays", "minSpent", "birthdayMonth", "lastStayWithinDays", "lastStayBeforeDays"] as const) {
    const v = num(fd.get(k));
    if (v > 0) rules[k] = v;
  }
  for (const k of ["city", "source", "tag"] as const) {
    const v = str(fd, k, 60);
    if (v) rules[k] = v;
  }
  const data = { name, description: str(fd, "description", 300), color: str(fd, "color", 20) || "primary", kind: kind as "static" | "dynamic", rules };
  if (id) await db.update(customerGroups).set(data).where(eq(customerGroups.id, id));
  else await db.insert(customerGroups).values(data);
  revalidatePath("/admin/customers", "layout");
  return { ok: true, message: "گروه ذخیره شد." };
}

export async function deleteGroup(id: number): Promise<Res> {
  await requireAdmin();
  await db.delete(customerGroups).where(eq(customerGroups.id, id));
  revalidatePath("/admin/customers", "layout");
  return { ok: true, message: "گروه حذف شد." };
}

/* ======================= campaigns ======================= */

function audienceFrom(fd: FormData): CampaignAudience {
  const all = fd.get("audienceAll") === "on";
  const groupIds = fd.getAll("groupIds").map(Number).filter(Boolean);
  const tiers = fd.getAll("tiers").map(String).filter((t): t is CustomerTier => TIER_KEYS.includes(t as CustomerTier));
  return all ? { all: true } : { groupIds, tiers };
}

export async function audienceCount(a: CampaignAudience) {
  await requireAdmin();
  return (await resolveAudience(a)).length;
}

function intentDateTime(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return "";
  const parsed = new Date(`${date}T${time}:00+03:30`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date ? "" : parsed.toISOString();
}

export async function saveCampaign(_p: HState, fd: FormData): Promise<HState> {
  await requireAdmin();
  const id = num(fd.get("id"));
  const name = str(fd, "name", 120);
  const message = cleanText(fd.get("message"), 700);
  if (!name || message.length < 5) return { error: "نام کمپین و متن پیامک را وارد کنید." };
  const promoMode = (["none", "shared", "unique"].includes(String(fd.get("promoMode"))) ? fd.get("promoMode") : "none") as "none" | "shared" | "unique";
  if (promoMode !== "none" && !/\{code\}/.test(message)) return { error: "برای ارسال کد تخفیف، متغیر {code} را در متن پیامک قرار دهید." };
  const scheduledDate = String(fd.get("scheduledDate") ?? "");
  const scheduledTime = String(fd.get("scheduledTime") ?? "");
  const intent = String(fd.get("intent") ?? "draft");
  const when = intentDateTime(scheduledDate, scheduledTime);
  const data = {
    name,
    message,
    audience: audienceFrom(fd),
    promoMode,
    promoCode: promoMode === "shared" ? str(fd, "promoCode", 30).toUpperCase().replace(/[^A-Z0-9_-]/g, "") : "",
    promoKind: (fd.get("promoKind") === "fixed" ? "fixed" : "percent") as "percent" | "fixed",
    promoValue: Math.max(0, num(fd.get("promoValue"))),
    promoValidDays: Math.max(1, num(fd.get("promoValidDays")) || 30),
    scheduledAt: intent === "schedule" && when ? new Date(when) : intent === "send" ? new Date() : null,
    status: (intent === "draft" ? "draft" : "scheduled") as "draft" | "scheduled",
  };
  if (intent === "schedule" && (!when || Number.isNaN(new Date(when).getTime()) || new Date(when).getTime() <= Date.now())) return { error: "تاریخ و ساعت آینده را برای زمان‌بندی انتخاب کنید." };
  let cid = id;
  if (id) {
    const [c] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    if (!c || !["draft", "scheduled", "failed"].includes(c.status)) return { error: "این کمپین قبلاً ارسال شده و قابل ویرایش نیست." };
    await db.update(campaigns).set(data).where(eq(campaigns.id, id));
  } else cid = (await db.insert(campaigns).values(data).returning({ id: campaigns.id }))[0].id;
  if (intent === "send") after(async () => void (await sendCampaign(cid)));
  revalidatePath("/admin/campaigns", "layout");
  redirect(`/admin/campaigns?saved=${intent}`);
}

export async function deleteCampaign(id: number): Promise<Res> {
  await requireAdmin();
  await db.delete(campaigns).where(and(eq(campaigns.id, id), inArray(campaigns.status, ["draft", "scheduled", "failed"])));
  revalidatePath("/admin/campaigns");
  return { ok: true, message: "کمپین حذف شد." };
}

export async function runJobsNow(): Promise<Res> {
  await requireAdmin();
  const r = await runDueJobs();
  const b = await runBirthdayJob(true);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "skipped" in r ? "کار دیگری در حال اجراست؛ کمی بعد دوباره امتحان کنید." : `اجرا شد: ${"campaigns" in r ? r.campaigns : 0} کمپین زمان‌بندی‌شده، ${b} پیامک تولد، ${"invites" in r ? r.invites : 0} دعوت به ثبت نظر.` };
}

/* ======================= SMS center ======================= */

export async function sendManualSms(_p: HState, fd: FormData): Promise<HState> {
  await requireAdmin();
  const text = cleanText(fd.get("text"), 700);
  if (text.length < 2) return { error: "متن پیامک را وارد کنید." };
  const target = String(fd.get("target") ?? "numbers");
  let numbers: string[] = [];
  if (target === "numbers") {
    numbers = String(fd.get("numbers") ?? "")
      .split(/[\s,،;]+/)
      .map(normalizeMobile)
      .filter(isMobile);
  } else {
    const a: CampaignAudience = target === "all" ? { all: true } : { groupIds: fd.getAll("groupIds").map(Number).filter(Boolean) };
    numbers = (await resolveAudience(a)).map((c) => c.phone);
  }
  numbers = Array.from(new Set(numbers)).slice(0, 5000);
  if (!numbers.length) return { error: "هیچ شماره معتبری انتخاب نشده است." };
  const marketing = fd.get("marketing") === "on";
  const r = await sendBulkText(numbers, text, { event: "manual", marketing });
  revalidatePath("/admin/sms");
  if (r.disabled) return { error: `ارسال انجام نشد: ${r.disabled}` };
  return { ok: true, message: `ارسال به ${r.sent} شماره انجام شد${r.failed ? ` (${r.failed} ناموفق)` : ""}.` };
}

export async function saveSmsTemplate(_p: HState, fd: FormData): Promise<HState> {
  await requireAdmin();
  const id = num(fd.get("id"));
  const title = str(fd, "title", 80);
  const body = cleanText(fd.get("body"), 700);
  if (!title || !body) return { error: "عنوان و متن قالب الزامی است." };
  if (id) await db.update(smsTemplates).set({ title, body }).where(eq(smsTemplates.id, id));
  else await db.insert(smsTemplates).values({ title, body });
  revalidatePath("/admin/sms");
  return { ok: true, message: "قالب ذخیره شد." };
}

export async function deleteSmsTemplate(id: number): Promise<Res> {
  await requireAdmin();
  await db.delete(smsTemplates).where(eq(smsTemplates.id, id));
  revalidatePath("/admin/sms");
  return { ok: true, message: "قالب حذف شد." };
}

/* ======================= gift cards ======================= */

export async function issueGiftCard(_p: HState, fd: FormData): Promise<HState> {
  await requireAdmin();
  const amount = num(fd.get("amount"));
  if (amount < 100_000) return { error: "مبلغ کارت را وارد کنید." };
  const complimentary = fd.get("complimentary") === "on";
  const [g] = await db
    .insert(giftCards)
    .values({
      code: genGiftCode(),
      initialAmount: amount,
      purchaserName: str(fd, "purchaserName", 80),
      purchaserPhone: normalizeMobile(String(fd.get("purchaserPhone") ?? "")),
      recipientName: str(fd, "recipientName", 80),
      recipientPhone: normalizeMobile(String(fd.get("recipientPhone") ?? "")),
      message: str(fd, "message", 300),
      issuedBy: complimentary ? "complimentary" : "admin",
      paymentMethod: complimentary ? "" : String(fd.get("paymentMethod") ?? "cash"),
      paymentRef: str(fd, "paymentRef", 40),
    })
    .returning();
  await activateGiftCard(g.id, { silent: fd.get("sendSms") !== "on" });
  revalidatePath("/admin/gift-cards");
  return { ok: true, message: `کارت ${g.code} صادر شد.` };
}

export async function activateGiftCardAction(id: number): Promise<Res> {
  await requireAdmin();
  const g = await activateGiftCard(id);
  revalidatePath("/admin/gift-cards");
  return { ok: !!g, message: g ? `کارت ${g.code} فعال شد و برای گیرنده پیامک شد.` : "کارت یافت نشد." };
}

export async function voidGiftCardAction(id: number): Promise<Res> {
  await requireAdmin();
  const r = await voidGiftCard(id);
  revalidatePath("/admin/gift-cards");
  return r;
}

/* ======================= table bookings ======================= */

export async function setTableBookingStatus(id: number, status: "new" | "confirmed" | "seated" | "cancelled" | "no_show"): Promise<Res> {
  await requireAdmin();
  const [b] = await db.update(tableBookings).set({ status }).where(eq(tableBookings.id, id)).returning();
  if (b && status === "confirmed") {
    const { getSettingsFresh } = await import("@/lib/data");
    const s = await getSettingsFresh();
    if (s.tableSmsOnConfirm === "1") {
      const { formatJalali } = await import("@/lib/utils");
      after(() => sendText(b.phone, `${b.name} عزیز، رزرو میز شما برای ${b.guests} نفر در تاریخ ${formatJalali(b.date)} ساعت ${b.time} در ${s.hotelName} تایید شد.`, { event: "table" }).then(() => undefined));
    }
  }
  revalidatePath("/admin/table-bookings");
  return { ok: true, message: "وضعیت رزرو میز به‌روز شد." };
}

/* ======================= guest requests ======================= */

export async function replyGuestRequest(id: number, body: string, status?: "open" | "in_progress" | "done"): Promise<Res> {
  await requireAdmin();
  const text = cleanText(body, 1500);
  if (text) await db.insert(guestRequestMessages).values({ requestId: id, sender: "staff", body: text });
  await db
    .update(guestRequests)
    .set({ unreadStaff: false, unreadGuest: !!text, updatedAt: new Date(), ...(status ? { status } : text ? { status: "in_progress" as const } : {}) })
    .where(eq(guestRequests.id, id));
  revalidatePath("/admin/guest-requests");
  return { ok: true, message: text ? "پاسخ برای مهمان ارسال شد." : "وضعیت به‌روز شد." };
}

/* ======================= partners ======================= */

export async function savePartner(_p: HState, fd: FormData): Promise<HState> {
  await requireAdmin();
  const id = num(fd.get("id"));
  const name = str(fd, "name", 120);
  if (!name) return { error: "نام همکار الزامی است." };
  const data = {
    name,
    type: (fd.get("type") === "site" ? "site" : "agency") as "agency" | "site",
    contactName: str(fd, "contactName", 80),
    phone: str(fd, "phone", 30),
    email: str(fd, "email", 120),
    commissionPercent: Math.min(50, Math.max(0, num(fd.get("commissionPercent")))),
    autoConfirm: fd.get("autoConfirm") === "on",
    canCancel: fd.get("canCancel") === "on",
    allowedIps: str(fd, "allowedIps", 500),
    isActive: fd.get("isActive") === "on",
  };
  if (id) await db.update(partners).set(data).where(eq(partners.id, id));
  else await db.insert(partners).values({ ...data, secret: newCredentials().secret, tokenHash: "", tokenHint: "" });
  revalidatePath("/admin/partners", "layout");
  return { ok: true, message: id ? "اطلاعات همکار ذخیره شد." : "همکار ایجاد شد. اکنون «صدور توکن و کلید امضا» را بزنید." };
}

/** Generates a fresh token + signing secret. Returned only once; the token is stored hashed. */
export async function regeneratePartnerCredentials(id: number): Promise<{ ok: boolean; token?: string; secret?: string; message: string }> {
  await requireAdmin();
  const c = newCredentials();
  await db.update(partners).set({ tokenHash: c.tokenHash, tokenHint: c.tokenHint, secret: c.secret }).where(eq(partners.id, id));
  revalidatePath("/admin/partners", "layout");
  return { ok: true, token: c.token, secret: c.secret, message: "توکن و کلید امضای جدید صادر شد؛ کلیدهای قبلی دیگر کار نمی‌کنند." };
}

export async function deletePartner(id: number): Promise<Res> {
  await requireAdmin();
  await db.update(partners).set({ isActive: false, tokenHash: "" }).where(eq(partners.id, id));
  revalidatePath("/admin/partners", "layout");
  return { ok: true, message: "همکار غیرفعال و دسترسی API آن قطع شد (سوابق رزرو حفظ شد)." };
}

export async function quickRoomQuote(roomId: number, checkIn: string, checkOut: string, guests: number) {
  await requireAdmin();
  if (!ISO.test(checkIn) || !ISO.test(checkOut) || checkOut <= checkIn) return null;
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room) return null;
  const q = await quoteRoom(room, checkIn, checkOut, Math.max(1, guests), []);
  const busy = (await roomConflicts(room.id, checkIn, checkOut)).length > 0;
  return { total: q.total, nights: q.nightsCount, busy };
}

export async function nextDay(iso: string) {
  return addDaysISO(iso, 1);
}
export async function todayServer() {
  return todayISO();
}
