"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  admins,
  amenities,
  attractions,
  messages,
  reservations,
  rooms,
  services,
  settings,
  testimonials,
  type ReservationStatus,
} from "@/db/schema";
import {
  createSession,
  destroySession,
  dummyVerify,
  hashPassword,
  requireAdmin,
  revokeOtherSessions,
  verifyPassword,
} from "@/lib/auth";
import { rateLimit, resetRateLimit, retryMessage } from "@/lib/rate-limit";
import { cleanText, clientIp, safeUrl, safeUrlList } from "@/lib/security";
import { syncReservationVouchers } from "@/lib/accounting";
import { linkReservationCustomer } from "@/lib/crm";
import { DEMO_PASSWORD, removeDemoData, type DemoCategory } from "@/lib/demo";
import { notifyGuest, sendPattern } from "@/lib/sms";
import { journalEntries, type RoomOption } from "@/db/schema";
import { and as andOp } from "drizzle-orm";
import { ensureSeeded } from "@/lib/seed";
import { defaultSettings } from "@/lib/data";
import { encryptPaymentCredential, isPrivatePaymentField } from "@/lib/payment-settings";
import { bookedSlots, roomConflicts } from "@/lib/availability";
import { formatJalali, genReservationCode, linesToArray, slugify, toEnDigits } from "@/lib/utils";
import { defaultBooking, defaultHome } from "@/lib/content";
import { grantPublicAccess } from "@/lib/public-access";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

const str = (fd: FormData, k: string) => cleanText(fd.get(k), 20000);
const num = (fd: FormData, k: string) => Number(toEnDigits(str(fd, k)).replace(/[,٬]/g, "")) || 0;
const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";

function revalidateSite() {
  revalidatePath("/", "layout");
}

/* ---------------- auth ---------------- */
export async function login(_p: ActionState, fd: FormData): Promise<ActionState> {
  await ensureSeeded();
  const email = str(fd, "email").toLowerCase().slice(0, 190);
  const password = String(fd.get("password") ?? "").slice(0, 200);
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([rateLimit(`login-ip:${ip}`, 20, 900), rateLimit(`login-email:${email}`, 6, 900)]);
  if (!byIp.ok || !byEmail.ok) return { error: retryMessage(Math.max(byIp.retryAfter, byEmail.retryAfter)) };
  const [admin] = await db.select().from(admins).where(eq(admins.email, email));
  if (!admin) {
    dummyVerify();
    return { error: "ایمیل یا رمز عبور اشتباه است." };
  }
  if (!verifyPassword(password, admin.passwordHash)) return { error: "ایمیل یا رمز عبور اشتباه است." };
  await resetRateLimit(`login-email:${email}`);
  await createSession(admin.id);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

export async function changePassword(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const current = str(fd, "current");
  const next = str(fd, "next");
  const [admin] = await db.select().from(admins).where(eq(admins.id, me.id));
  if (!admin || !verifyPassword(current, admin.passwordHash)) return { error: "رمز فعلی اشتباه است." };
  if (next.length < 12) return { error: "رمز جدید باید حداقل ۱۲ کاراکتر باشد." };
  if (next === DEMO_PASSWORD) return { error: "این رمز، رمز عمومی نسخه نمایشی است؛ رمز دیگری انتخاب کنید." };
  await db.update(admins).set({ passwordHash: hashPassword(next) }).where(eq(admins.id, me.id));
  await revokeOtherSessions(me.id);
  return { ok: true, message: "رمز عبور تغییر کرد و سایر نشست‌های فعال خارج شدند." };
}


export async function openGuestReservation(fd: FormData): Promise<never> {
  await requireAdmin();
  const id = num(fd, "id");
  const [reservation] = await db.select({ trackingCode: reservations.trackingCode, phone: reservations.phone }).from(reservations).where(eq(reservations.id, id));
  if (!reservation) redirect("/admin/reservations");
  await grantPublicAccess("reservation", reservation.trackingCode, reservation.phone);
  redirect(`/track/${reservation.trackingCode}`);
}

/* ---------------- rooms ---------------- */
function parseRoomOptions(raw: string): RoomOption[] {
  try {
    const arr = JSON.parse(raw) as Partial<RoomOption>[];
    const units: RoomOption["unit"][] = ["per_night", "per_person_night", "per_stay", "per_person"];
    return arr
      .map((o, i) => ({
        id: String(o.id || `o${Date.now().toString(36)}${i}`).replace(/[^\w-]/g, "").slice(0, 30) || `o${i}`,
        title: cleanText(o.title, 80),
        price: Math.max(0, Math.round(Number(o.price) || 0)),
        unit: units.includes(o.unit as RoomOption["unit"]) ? (o.unit as RoomOption["unit"]) : "per_night",
        included: !!o.included,
      }))
      .filter((o) => o.title)
      .slice(0, 20);
  } catch {
    return [];
  }
}

export async function saveRoom(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = num(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "نام اتاق الزامی است." };
  const data = {
    name,
    slug: slugify(str(fd, "slug") || `room-${str(fd, "roomNumber") || name}`),
    roomNumber: toEnDigits(str(fd, "roomNumber")),
    type: str(fd, "type"),
    floor: num(fd, "floor"),
    capacity: Math.max(1, num(fd, "capacity")),
    extraBeds: Math.max(0, num(fd, "maxCapacity") - Math.max(1, num(fd, "capacity"))),
    extraGuestPrice: Math.max(0, num(fd, "extraGuestPrice")),
    holidayPrice: Math.max(0, num(fd, "holidayPrice")),
    peakPrice: Math.max(0, num(fd, "peakPrice")),
    options: parseRoomOptions(String(fd.get("options") ?? "[]")),
    beds: str(fd, "beds"),
    size: num(fd, "size"),
    view: str(fd, "view"),
    pricePerNight: num(fd, "pricePerNight"),
    shortDescription: str(fd, "shortDescription"),
    description: str(fd, "description"),
    features: linesToArray(fd.get("features")),
    images: safeUrlList(linesToArray(fd.get("images"))),
    videoUrl: safeUrl(str(fd, "videoUrl")),
    isActive: bool(fd, "isActive"),
    isFeatured: bool(fd, "isFeatured"),
    sortOrder: num(fd, "sortOrder"),
  };
  try {
    if (id) await db.update(rooms).set(data).where(eq(rooms.id, id));
    else await db.insert(rooms).values(data);
  } catch {
    return { error: "نامک (slug) تکراری است. مقدار دیگری وارد کنید." };
  }
  revalidateSite();
  redirect("/admin/rooms?saved=1");
}

export async function deleteRoom(id: number) {
  await requireAdmin();
  await db.delete(rooms).where(eq(rooms.id, id));
  revalidateSite();
}

export async function toggleRoom(id: number, field: "isActive" | "isFeatured", value: boolean) {
  await requireAdmin();
  await db.update(rooms).set({ [field]: value }).where(eq(rooms.id, id));
  revalidateSite();
}

/* ---------------- services ---------------- */
export async function saveService(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = num(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "نام خدمت الزامی است." };
  const gallery = safeUrlList(linesToArray(fd.get("gallery")));
  let slotRows: { time: string; price: number }[] = [];
  try {
    slotRows = JSON.parse(str(fd, "slots") || "[]");
  } catch {
    return { error: "فرمت سانس‌ها نامعتبر است." };
  }
  const timeSlots: string[] = [];
  const slotPrices: Record<string, number> = {};
  for (const row of slotRows) {
    const t = toEnDigits(String(row.time ?? "")).trim();
    if (!t || timeSlots.includes(t)) continue;
    timeSlots.push(t);
    slotPrices[t] = Math.max(0, Number(row.price) || 0);
  }
  const data = {
    name,
    slug: slugify(str(fd, "slug") || name),
    icon: str(fd, "icon") || "Sparkles",
    shortDescription: str(fd, "shortDescription"),
    description: str(fd, "description"),
    image: gallery[0] ?? "",
    gallery,
    videoUrl: safeUrl(str(fd, "videoUrl")),
    price: num(fd, "price"),
    priceUnit: str(fd, "priceUnit"),
    workingHours: str(fd, "workingHours"),
    rules: linesToArray(fd.get("rules")),
    timeSlots,
    slotPrices,
    includedGuests: Math.max(1, num(fd, "includedGuests") || 1),
    extraGuestPrice: num(fd, "extraGuestPrice"),
    maxGuests: Math.max(1, num(fd, "maxGuests")),
    isBookable: bool(fd, "isBookable"),
    isActive: bool(fd, "isActive"),
    sortOrder: num(fd, "sortOrder"),
  };
  try {
    if (id) await db.update(services).set(data).where(eq(services.id, id));
    else await db.insert(services).values(data);
  } catch {
    return { error: "نامک (slug) تکراری است." };
  }
  revalidateSite();
  redirect("/admin/services?saved=1");
}

export async function deleteService(id: number) {
  await requireAdmin();
  await db.delete(services).where(eq(services.id, id));
  revalidateSite();
}

/* ---------------- amenities ---------------- */
export async function saveAmenity(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = num(fd, "id");
  const title = str(fd, "title");
  if (!title) return { error: "عنوان الزامی است." };
  const data = {
    title,
    icon: str(fd, "icon") || "Sparkles",
    description: str(fd, "description"),
    category: str(fd, "category") || "عمومی",
    sortOrder: num(fd, "sortOrder"),
  };
  if (id) await db.update(amenities).set(data).where(eq(amenities.id, id));
  else await db.insert(amenities).values(data);
  revalidateSite();
  return { ok: true, message: id ? "امکان ویرایش شد." : "امکان جدید افزوده شد." };
}

export async function deleteAmenity(id: number) {
  await requireAdmin();
  await db.delete(amenities).where(eq(amenities.id, id));
  revalidateSite();
}

/* ---------------- attractions ---------------- */
export async function saveAttraction(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = num(fd, "id");
  const name = str(fd, "name");
  if (!name) return { error: "نام مکان الزامی است." };
  const data = {
    name,
    category: str(fd, "category") || "طبیعی",
    description: str(fd, "description"),
    image: safeUrl(linesToArray(fd.get("image"))[0] ?? ""),
    distanceKm: Number(toEnDigits(str(fd, "distanceKm"))) || 0,
    travelTime: str(fd, "travelTime"),
    lat: Number(toEnDigits(str(fd, "lat"))) || 0,
    lng: Number(toEnDigits(str(fd, "lng"))) || 0,
    sortOrder: num(fd, "sortOrder"),
  };
  if (id) await db.update(attractions).set(data).where(eq(attractions.id, id));
  else await db.insert(attractions).values(data);
  revalidateSite();
  return { ok: true, message: id ? "مکان ویرایش شد." : "مکان جدید افزوده شد." };
}

export async function deleteAttraction(id: number) {
  await requireAdmin();
  await db.delete(attractions).where(eq(attractions.id, id));
  revalidateSite();
}

/* ---------------- testimonials ---------------- */
export async function saveTestimonial(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = num(fd, "id");
  const name = str(fd, "name");
  const body = str(fd, "body");
  if (!name || !body) return { error: "نام و متن نظر الزامی است." };
  const data = { name, body, city: str(fd, "city"), rating: Math.min(5, Math.max(1, num(fd, "rating") || 5)) };
  if (id) await db.update(testimonials).set(data).where(eq(testimonials.id, id));
  else await db.insert(testimonials).values(data);
  revalidateSite();
  return { ok: true, message: "نظر ذخیره شد." };
}

export async function deleteTestimonial(id: number) {
  await requireAdmin();
  await db.delete(testimonials).where(eq(testimonials.id, id));
  revalidateSite();
}

/* ---------------- reservations ---------------- */
export async function setReservationStatus(
  id: number,
  status: ReservationStatus,
): Promise<{ ok: boolean; error?: string; reservationCode?: string | null }> {
  await requireAdmin();
  const [res] = await db.select().from(reservations).where(eq(reservations.id, id));
  if (!res) return { ok: false, error: "رزرو یافت نشد." };

  const patch: Partial<typeof reservations.$inferInsert> = { status };

  if (status === "confirmed") {
    if (res.kind === "room" && res.roomId && res.checkOut) {
      const c = await roomConflicts(res.roomId, res.checkIn, res.checkOut, res.id);
      if (c.length) return { ok: false, error: "تداخل با رزرو قطعی/پرداخت‌شده دیگر برای این اتاق وجود دارد." };
    }
    if (res.kind === "service" && res.serviceId) {
      const taken = await bookedSlots(res.serviceId, res.checkIn, res.id);
      if (taken.includes(res.timeSlot)) return { ok: false, error: "این سانس برای مهمان دیگری قطعی شده است." };
    }
    patch.reservationCode = res.reservationCode ?? genReservationCode();
    patch.confirmedAt = new Date();
    if (!res.paidAt) patch.paidAt = new Date();
  } else if (status === "paid") {
    patch.reservationCode = null;
    patch.paidAt = res.paidAt ?? new Date();
    if (!res.paymentMethod) patch.paymentMethod = "manual";
  } else {
    patch.reservationCode = null;
    patch.confirmedAt = null;
    if (status === "pending_payment") patch.paidAt = null;
  }

  const [updated] = await db.update(reservations).set(patch).where(eq(reservations.id, id)).returning();
  await syncReservationVouchers(updated);
  await linkReservationCustomer(updated).catch(() => null);

  if (status === "confirmed" && res.status !== "confirmed") {
    const sms = await notifyGuest(updated, "guest_confirmed");
    await db.update(reservations).set({ smsStatus: sms }).where(eq(reservations.id, id));
  } else if (status === "rejected" && res.status !== "rejected") {
    const sms = await notifyGuest(updated, "guest_rejected");
    await db.update(reservations).set({ smsStatus: sms }).where(eq(reservations.id, id));
  }

  revalidatePath("/admin", "layout");
  revalidatePath(`/track/${res.trackingCode}`);
  return { ok: true, reservationCode: patch.reservationCode ?? null };
}

export async function updateReservation(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = num(fd, "id");
  if (!id) return { error: "شناسه نامعتبر" };
  await db
    .update(reservations)
    .set({
      guestName: str(fd, "guestName"),
      phone: toEnDigits(str(fd, "phone")),
      email: str(fd, "email"),
      nationalId: toEnDigits(str(fd, "nationalId")),
      guests: Math.max(1, num(fd, "guests")),
      totalPrice: num(fd, "totalPrice"),
      depositAmount: num(fd, "depositAmount"),
      paymentRef: str(fd, "paymentRef"),
      adminNote: str(fd, "adminNote"),
    })
    .where(eq(reservations.id, id));
  await syncReservationVouchers(id);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "اطلاعات رزرو ذخیره شد و اسناد حسابداری به‌روز شد." };
}

export async function settleReservation(id: number, settled: boolean) {
  await requireAdmin();
  await db.update(reservations).set({ settledAt: settled ? new Date() : null }).where(eq(reservations.id, id));
  await syncReservationVouchers(id);
  revalidatePath("/admin", "layout");
}

export async function deleteReservation(id: number) {
  await requireAdmin();
  await db.delete(journalEntries).where(andOp(eq(journalEntries.source, "reservation"), eq(journalEntries.reservationId, id)));
  await db.delete(reservations).where(eq(reservations.id, id));
  revalidatePath("/admin", "layout");
}

/* ---------------- messages ---------------- */
export async function setMessageRead(id: number, isRead: boolean) {
  await requireAdmin();
  await db.update(messages).set({ isRead }).where(eq(messages.id, id));
  revalidatePath("/admin", "layout");
}

export async function deleteMessage(id: number) {
  await requireAdmin();
  await db.delete(messages).where(eq(messages.id, id));
  revalidatePath("/admin", "layout");
}

/* ---------------- settings ---------------- */
export async function saveSettings(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const keys = Object.keys(defaultSettings);
  for (const key of keys) {
    if (!fd.has(key)) continue;
    const all = fd.getAll(key);
    const value = all.length > 1 ? cleanText(all[all.length - 1], 20000) : str(fd, key);
    if ((key === "smsApiKey" || isPrivatePaymentField(key)) && (value === "" || value.includes("•"))) continue;
    if (isPrivatePaymentField(key)) {
      let encrypted: string;
      try { encrypted = encryptPaymentCredential(value); }
      catch (e) { return { error: e instanceof Error ? e.message : "کلید رمزگذاری درگاه تنظیم نشده است." }; }
      await db.insert(settings).values({ key, value: encrypted }).onConflictDoUpdate({ target: settings.key, set: { value: encrypted } });
      continue;
    }
    if (key === "logoUrl") {
      const v = safeUrl(linesToArray(value)[0] ?? "");
      await db.insert(settings).values({ key, value: v }).onConflictDoUpdate({ target: settings.key, set: { value: v } });
      continue;
    }
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  revalidateSite();
  return { ok: true, message: "تنظیمات ذخیره شد." };
}

/* ---------------- page content (home / booking) ---------------- */
export async function saveContent(_p: ActionState, fd: FormData): Promise<ActionState> {
  await requireAdmin();
  const key = str(fd, "key");
  if (key !== "home" && key !== "booking") return { error: "کلید نامعتبر" };
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(String(fd.get("json") ?? "{}"));
  } catch {
    return { error: "داده نامعتبر است." };
  }
  const defaults = (key === "home" ? defaultHome : defaultBooking) as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  for (const k of Object.keys(defaults)) {
    if (parsed[k] !== undefined && typeof parsed[k] === typeof defaults[k]) clean[k] = parsed[k];
  }
  for (const k of ["heroMedia", "poolMedia"]) {
    if (Array.isArray(clean[k])) {
      clean[k] = (clean[k] as { url: string; type: string; duration: number }[])
        .map((m) => ({ url: safeUrl(m?.url), type: m?.type === "video" ? "video" : "image", duration: Math.min(120, Math.max(0, Number(m?.duration) || 0)) }))
        .filter((m) => m.url)
        .slice(0, 20);
    }
  }
  const value = JSON.stringify(clean);
  await db
    .insert(settings)
    .values({ key: `content_${key}`, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });

  // per-service rules edited from the booking page editor
  if (key === "booking") {
    const raw = fd.get("serviceRules");
    if (raw) {
      try {
        const map = JSON.parse(String(raw)) as Record<string, string[]>;
        for (const [sid, rules] of Object.entries(map)) {
          await db
            .update(services)
            .set({ rules: rules.map((r) => String(r).trim()).filter(Boolean) })
            .where(eq(services.id, Number(sid)));
        }
      } catch {
        return { error: "قوانین خدمات نامعتبر است." };
      }
    }
  }
  revalidateSite();
  return { ok: true, message: "تغییرات با موفقیت ذخیره و در سایت منتشر شد." };
}

export async function resetContent(key: "home" | "booking") {
  await requireAdmin();
  await db.delete(settings).where(eq(settings.key, `content_${key}`));
  revalidateSite();
}

/* ---------------- SMS ---------------- */
export async function sendTestSms(mobile: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const m = toEnDigits(String(mobile)).replace(/[^\d]/g, "");
  if (!/^09\d{9}$/.test(m)) return { ok: false, message: "شماره موبایل معتبر نیست." };
  const r = await sendPattern("test", m, { code: "ATL-1234-TST", tracking: "TR-TEST01", name: "مهمان آزمایشی", item: "اتاق نمونه", date: "1404/01/01", phone: m });
  revalidatePath("/admin/sms");
  return r === "sent"
    ? { ok: true, message: "پیامک آزمایشی ارسال شد." }
    : { ok: false, message: r === "disabled" ? "پنل پیامک، کلید API یا قالب «تایید رزرو» تنظیم نشده است." : "ارسال ناموفق بود؛ جزئیات در گزارش پیامک‌ها." };
}

/* ---------------- go-live / demo mode ---------------- */
export async function updateAdminProfile(_p: ActionState, fd: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const name = cleanText(fd.get("name"), 80);
  const email = cleanText(fd.get("email"), 190).toLowerCase();
  const current = String(fd.get("current") ?? "").slice(0, 200);
  const next = String(fd.get("next") ?? "").slice(0, 200);
  const confirm = String(fd.get("confirm") ?? "").slice(0, 200);
  const [admin] = await db.select().from(admins).where(eq(admins.id, me.id));
  if (!admin || !verifyPassword(current, admin.passwordHash)) return { error: "رمز عبور فعلی اشتباه است." };
  if (name.length < 2) return { error: "نام را وارد کنید." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "ایمیل معتبر نیست." };
  const patch: Partial<typeof admins.$inferInsert> = { name, email };
  if (next) {
    if (next.length < 12) return { error: "رمز جدید باید حداقل ۱۲ کاراکتر باشد." };
    if (next !== confirm) return { error: "تکرار رمز جدید مطابقت ندارد." };
    if (next === DEMO_PASSWORD) return { error: "این رمز، رمز عمومی نسخه نمایشی است؛ رمز دیگری انتخاب کنید." };
    if (!/[A-Za-z]/.test(next) || !/\d/.test(next)) return { error: "رمز جدید باید شامل حرف و عدد باشد." };
    patch.passwordHash = hashPassword(next);
  }
  try {
    await db.update(admins).set(patch).where(eq(admins.id, me.id));
  } catch {
    return { error: "این ایمیل قبلاً استفاده شده است." };
  }
  if (next) await revokeOtherSessions(me.id);
  revalidatePath("/admin", "layout");
  return { ok: true, message: next ? "اطلاعات حساب و رمز عبور به‌روزرسانی شد." : "اطلاعات حساب به‌روزرسانی شد." };
}

export async function setDemoMode(enabled: boolean): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const value = enabled ? "1" : "0";
  await db.insert(settings).values({ key: "demoMode", value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  revalidatePath("/admin", "layout");
  return { ok: true, message: enabled ? "حالت نمایشی فعال شد." : "سایت از حالت نمایشی خارج شد." };
}

export async function cleanupDemoData(categories: DemoCategory[], confirmText: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  if (confirmText.trim() !== "حذف") return { ok: false, message: "برای تأیید، کلمه «حذف» را تایپ کنید." };
  const allowed: DemoCategory[] = ["reservations", "messages", "testimonials", "vouchers", "smsLogs", "dining", "extras", "crm"];
  const list = categories.filter((c) => allowed.includes(c));
  if (!list.length) return { ok: false, message: "موردی انتخاب نشده است." };
  const removed = await removeDemoData(list);
  revalidatePath("/", "layout");
  const total = Object.values(removed).reduce((s, n) => s + (n ?? 0), 0);
  return { ok: true, message: `${total} رکورد نمایشی حذف شد. داده‌های واقعی دست نخوردند.` };
}

/* ---------------- appearance presets ---------------- */
export async function applyPreset(key: string, replaceTexts: boolean): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const { PRESETS, cityHomeContent, cityBookingContent } = await import("@/lib/presets");
  const { getContent } = await import("@/lib/content");
  const { getSettingsFresh } = await import("@/lib/data");
  const preset = PRESETS.find((p) => p.key === key);
  if (!preset) return { ok: false, message: "قالب آماده یافت نشد." };
  for (const [k, value] of Object.entries(preset.settings)) {
    await db.insert(settings).values({ key: k, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  const s = await getSettingsFresh();
  const { home } = await getContent();
  let next = { ...home, ...preset.show, sectionOrder: preset.order };
  if (replaceTexts && (key === "city3" || key === "business4")) {
    next = { ...cityHomeContent(s.hotelName, s.city, Number(s.stars) || 3), ...preset.show, sectionOrder: preset.order };
    await db
      .insert(settings)
      .values({ key: "content_booking", value: JSON.stringify(cityBookingContent()) })
      .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(cityBookingContent()) } });
  }
  const value = JSON.stringify(next);
  await db.insert(settings).values({ key: "content_home", value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  revalidatePath("/", "layout");
  return { ok: true, message: `قالب «${preset.title}» اعمال شد.${replaceTexts ? " متن‌های صفحه اصلی و رزرو هم جایگزین شدند." : " متن‌ها و تصاویر شما حفظ شدند."}` };
}
