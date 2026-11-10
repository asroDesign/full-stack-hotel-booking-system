import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attractions,
  bookings,
  conciergeRequests,
  events,
  facilities,
  gallery,
  menuItems,
  messages,
  offers,
  poolSlots,
  promoCodes,
  reviews,
  rooms,
  settings,
  subscribers,
} from "@/db/schema";
import { slugify } from "@/lib/format";
import { generateRoomBookingCode } from "@/lib/auth";
import { safeUrl, sanitizeText } from "@/lib/security";
import type { RoomAddon } from "@/db/schema";
import { postBookingRevenue } from "@/lib/accounting";
import { notifyGuestReservation, notifyGuestStatus } from "@/lib/sms";

type Body = Record<string, unknown>;

const str = (value: unknown, fallback = "") => (typeof value === "string" ? value.trim() : fallback);
const num = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
};
const bool = (value: unknown, fallback = false) =>
  typeof value === "boolean" ? value : value === "true" || value === 1 || value === "1" ? true : value === "false" ? false : fallback;
const addons = (value: unknown): RoomAddon[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const record = item as Record<string, unknown>;
      return {
        name: sanitizeText(record?.name, 120),
        price: Math.max(0, Math.round(Number(record?.price) || 0)),
        description: sanitizeText(record?.description, 200),
      };
    })
    .filter((item) => item.name.length > 0)
    .slice(0, 30);
};

const urls = (value: unknown): string[] =>
  (Array.isArray(value) ? value : []).map((item) => safeUrl(item)).filter(Boolean).slice(0, 20);

const list = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string")
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  return [];
};

export type AdminResource =
  | "rooms"
  | "facilities"
  | "attractions"
  | "gallery"
  | "bookings"
  | "messages"
  | "pool-slots"
  | "menu-items"
  | "offers"
  | "events"
  | "promo-codes"
  | "reviews"
  | "subscribers"
  | "concierge";

export const ADMIN_RESOURCES: AdminResource[] = [
  "rooms",
  "facilities",
  "attractions",
  "gallery",
  "bookings",
  "messages",
  "pool-slots",
  "menu-items",
  "offers",
  "events",
  "promo-codes",
  "reviews",
  "subscribers",
  "concierge",
];

export function isAdminResource(value: string): value is AdminResource {
  return ADMIN_RESOURCES.includes(value as AdminResource);
}

async function uniqueSlug(base: string, resource: "rooms" | "facilities"): Promise<string> {
  const root = slugify(base) || `item-${Date.now()}`;
  let candidate = root;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const existing =
      resource === "rooms"
        ? await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.slug, candidate)).limit(1)
        : await db.select({ id: facilities.id }).from(facilities).where(eq(facilities.slug, candidate)).limit(1);
    if (existing.length === 0) return candidate;
    candidate = `${root}-${Math.floor(Math.random() * 900 + 100)}`;
  }
  return `${root}-${Date.now()}`;
}

export async function listResource(resource: AdminResource) {
  switch (resource) {
    case "rooms":
      return db.select().from(rooms).orderBy(asc(rooms.sortOrder), asc(rooms.id));
    case "facilities":
      return db.select().from(facilities).orderBy(asc(facilities.sortOrder), asc(facilities.id));
    case "attractions":
      return db.select().from(attractions).orderBy(asc(attractions.sortOrder), asc(attractions.id));
    case "gallery":
      return db.select().from(gallery).orderBy(asc(gallery.sortOrder), asc(gallery.id));
    case "bookings":
      return db.select().from(bookings).orderBy(desc(bookings.createdAt));
    case "messages":
      return db.select().from(messages).orderBy(desc(messages.createdAt));
    case "pool-slots":
      return db.select().from(poolSlots).orderBy(asc(poolSlots.sortOrder), asc(poolSlots.id));
    case "menu-items":
      return db.select().from(menuItems).orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
    case "offers":
      return db.select().from(offers).orderBy(asc(offers.sortOrder), desc(offers.id));
    case "events":
      return db.select().from(events).orderBy(asc(events.startsAt));
    case "promo-codes":
      return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    case "reviews":
      return db.select().from(reviews).orderBy(desc(reviews.createdAt));
    case "subscribers":
      return db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
    case "concierge":
      return db.select().from(conciergeRequests).orderBy(desc(conciergeRequests.createdAt));
  }
}

export async function createResource(
  resource: AdminResource,
  body: Body,
): Promise<{ ok: true; item: unknown } | { ok: false; error: string }> {
  try {
    if (resource === "rooms") {
      const name = str(body.name);
      if (!name) return { ok: false, error: "نام اتاق الزامی است." };
      const price = num(body.pricePerNight);
      if (price <= 0) return { ok: false, error: "قیمت هر شب باید بزرگ‌تر از صفر باشد." };
      const slug = await uniqueSlug(str(body.slug) || name, "rooms");
      const created = await db
        .insert(rooms)
        .values({
          slug,
          name,
          roomNumber: str(body.roomNumber) || str(slug).split("-").pop() || "101",
          roomType: str(body.roomType) || "دو نفره دلوکس",
          floor: num(body.floor, 1),
          capacity: Math.max(1, num(body.capacity, 2)),
          maxCapacity: Math.max(num(body.capacity, 2), num(body.maxCapacity, num(body.capacity, 2) + 2)),
          extraGuestFee: Math.max(0, num(body.extraGuestFee)),
          addons: addons(body.addons),
          size: Math.max(10, num(body.size, 28)),
          bedType: str(body.bedType) || "تخت دو نفره",
          view: str(body.view) || "منظره جنگل",
          description: str(body.description) || name,
          longDescription: str(body.longDescription),
          pricePerNight: price,
          prepaymentPercent: Math.min(100, Math.max(0, num(body.prepaymentPercent, 30))),
          coverImage: safeUrl(body.coverImage),
          gallery: urls(body.gallery),
          amenities: list(body.amenities).map((item) => sanitizeText(item, 120)).slice(0, 40),
          videoUrl: safeUrl(body.videoUrl) || null,
          featured: bool(body.featured),
          active: bool(body.active, true),
          sortOrder: num(body.sortOrder),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "facilities") {
      const title = str(body.title);
      if (!title) return { ok: false, error: "عنوان خدمت الزامی است." };
      const slug = await uniqueSlug(str(body.slug) || title, "facilities");
      const created = await db
        .insert(facilities)
        .values({
          slug,
          title,
          subtitle: str(body.subtitle),
          description: str(body.description) || title,
          icon: str(body.icon) || "✨",
          imageUrl: safeUrl(body.imageUrl),
          category: str(body.category) || "رفاهی",
          features: list(body.features),
          highlight: bool(body.highlight),
          active: bool(body.active, true),
          sortOrder: num(body.sortOrder),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "attractions") {
      const title = str(body.title);
      if (!title) return { ok: false, error: "نام جاذبه الزامی است." };
      const created = await db
        .insert(attractions)
        .values({
          title,
          description: str(body.description) || title,
          category: str(body.category) || "طبیعت‌گردی",
          distanceKm: Math.max(0, num(body.distanceKm, 10)),
          location: str(body.location),
          imageUrl: safeUrl(body.imageUrl),
          mapUrl: safeUrl(body.mapUrl) || null,
          active: bool(body.active, true),
          sortOrder: num(body.sortOrder),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "gallery") {
      const title = str(body.title);
      const imageUrl = safeUrl(body.imageUrl);
      if (!title || !imageUrl) return { ok: false, error: "عنوان و آدرس تصویر الزامی است." };
      const created = await db
        .insert(gallery)
        .values({
          title,
          imageUrl,
          category: str(body.category) || "هتل",
          active: bool(body.active, true),
          sortOrder: num(body.sortOrder),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "pool-slots") {
      const label = str(body.label);
      if (!label) return { ok: false, error: "عنوان سانس الزامی است." };
      const price = num(body.price);
      if (price <= 0) return { ok: false, error: "قیمت سانس باید بزرگ‌تر از صفر باشد." };
      const created = await db
        .insert(poolSlots)
        .values({
          label,
          price,
          capacity: Math.max(1, num(body.capacity, 8)),
          extraGuestFee: Math.max(0, num(body.extraGuestFee)),
          description: str(body.description),
          active: bool(body.active, true),
          sortOrder: num(body.sortOrder),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "menu-items") {
      const name = str(body.name);
      if (!name) return { ok: false, error: "نام آیتم منو الزامی است." };
      const created = await db
        .insert(menuItems)
        .values({
          name: sanitizeText(name, 160),
          description: sanitizeText(body.description, 500),
          price: Math.max(0, num(body.price)),
          category: sanitizeText(body.category, 80) || "غذای اصلی",
          imageUrl: safeUrl(body.imageUrl),
          featured: bool(body.featured),
          active: bool(body.active, true),
          sortOrder: num(body.sortOrder),
        })
        .returning();
      return { ok: true, item: created[0] };
    }


    if (resource === "offers") {
      const title = str(body.title);
      if (!title) return { ok: false, error: "عنوان پیشنهاد الزامی است." };
      let slug = str(body.slug) || slugify(title);
      const base = slug;
      for (let i = 0; i < 5; i += 1) {
        const exists = await db.select({ id: offers.id }).from(offers).where(eq(offers.slug, slug)).limit(1);
        if (exists.length === 0) break;
        slug = `${base}-${Math.floor(Math.random() * 900 + 100)}`;
      }
      const created = await db
        .insert(offers)
        .values({
          slug,
          title: sanitizeText(title, 160),
          subtitle: sanitizeText(body.subtitle, 200),
          description: sanitizeText(body.description, 2000),
          imageUrl: safeUrl(body.imageUrl),
          badge: sanitizeText(body.badge, 60) || "پیشنهاد ویژه",
          price: Math.max(0, num(body.price)),
          oldPrice: Math.max(0, num(body.oldPrice)),
          includes: list(body.includes).map((item) => sanitizeText(item, 120)).slice(0, 20),
          roomId: num(body.roomId) || null,
          validUntil: str(body.validUntil) || null,
          featured: bool(body.featured),
          active: bool(body.active, true),
          sortOrder: num(body.sortOrder),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "events") {
      const title = str(body.title);
      const startsAt = str(body.startsAt).slice(0, 10);
      if (!title) return { ok: false, error: "عنوان رویداد الزامی است." };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startsAt)) return { ok: false, error: "تاریخ شروع معتبر نیست." };
      const created = await db
        .insert(events)
        .values({
          title: sanitizeText(title, 160),
          description: sanitizeText(body.description, 2000),
          imageUrl: safeUrl(body.imageUrl),
          category: sanitizeText(body.category, 60) || "رویداد",
          startsAt,
          endDate: str(body.endDate) || null,
          timeLabel: sanitizeText(body.timeLabel, 60),
          location: sanitizeText(body.location, 160),
          price: Math.max(0, num(body.price)),
          capacity: Math.max(0, num(body.capacity)),
          featured: bool(body.featured),
          active: bool(body.active, true),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "promo-codes") {
      const code = sanitizeText(body.code, 40).toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      if (!code) return { ok: false, error: "کد تخفیف الزامی است." };
      const value = Math.max(0, num(body.value));
      if (value <= 0) return { ok: false, error: "مقدار تخفیف باید بیشتر از صفر باشد." };
      const created = await db
        .insert(promoCodes)
        .values({
          code,
          label: sanitizeText(body.label, 120),
          kind: body.kind === "fixed" ? "fixed" : "percent",
          value,
          minNights: Math.max(1, num(body.minNights, 1)),
          maxUses: Math.max(0, num(body.maxUses)),
          expiresAt: str(body.expiresAt) || null,
          active: bool(body.active, true),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "subscribers") {
      const email = sanitizeText(body.email, 160).toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "ایمیل معتبر نیست." };
      const created = await db
        .insert(subscribers)
        .values({ email, source: sanitizeText(body.source, 40) || "admin", active: bool(body.active, true) })
        .onConflictDoUpdate({ target: subscribers.email, set: { active: true } })
        .returning();
      return { ok: true, item: created[0] };
    }

    if (resource === "reviews") {
      const guestName = sanitizeText(body.guestName, 120);
      const comment = sanitizeText(body.comment, 2000);
      if (guestName.length < 3 || comment.length < 5) return { ok: false, error: "نام و متن نظر الزامی است." };
      const created = await db
        .insert(reviews)
        .values({
          guestName,
          city: sanitizeText(body.city, 80),
          rating: Math.min(5, Math.max(1, num(body.rating, 5))),
          title: sanitizeText(body.title, 140),
          comment,
          roomId: num(body.roomId) || null,
          stayDate: str(body.stayDate) || null,
          status: str(body.status) || "approved",
          featured: bool(body.featured),
        })
        .returning();
      return { ok: true, item: created[0] };
    }

    return { ok: false, error: "ایجاد این منبع از این مسیر پشتیبانی نمی‌شود." };
  } catch (error) {
    console.error("[admin-crud] create", resource, error);
    return { ok: false, error: "ثبت اطلاعات انجام نشد. ورودی‌ها را بررسی کنید." };
  }
}

export async function updateResource(
  resource: AdminResource,
  id: number,
  body: Body,
): Promise<{ ok: true; item: unknown } | { ok: false; error: string }> {
  try {
    if (resource === "rooms") {
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if ("name" in body) patch.name = str(body.name);
      if ("roomNumber" in body) patch.roomNumber = str(body.roomNumber);
      if ("roomType" in body) patch.roomType = str(body.roomType);
      if ("floor" in body) patch.floor = num(body.floor, 1);
      if ("capacity" in body) patch.capacity = Math.max(1, num(body.capacity, 2));
      if ("maxCapacity" in body)
        patch.maxCapacity = Math.max(num(body.capacity, 2), num(body.maxCapacity, num(body.capacity, 2) + 2));
      if ("extraGuestFee" in body) patch.extraGuestFee = Math.max(0, num(body.extraGuestFee));
  if ("starRating" in body) patch.starRating = Math.min(5, Math.max(1, num(body.starRating, 3)));
  if ("modulePool" in body) patch.modulePool = bool(body.modulePool);
  if ("moduleRestaurant" in body) patch.moduleRestaurant = bool(body.moduleRestaurant);
  if ("moduleCafe" in body) patch.moduleCafe = bool(body.moduleCafe);
  if ("moduleSpa" in body) patch.moduleSpa = bool(body.moduleSpa);
      if ("addons" in body) patch.addons = addons(body.addons);
      if ("size" in body) patch.size = Math.max(10, num(body.size, 28));
      if ("bedType" in body) patch.bedType = str(body.bedType);
      if ("view" in body) patch.view = str(body.view);
      if ("description" in body) patch.description = str(body.description);
      if ("longDescription" in body) patch.longDescription = str(body.longDescription);
      if ("pricePerNight" in body) patch.pricePerNight = Math.max(0, num(body.pricePerNight));
      if ("prepaymentPercent" in body) patch.prepaymentPercent = Math.min(100, Math.max(0, num(body.prepaymentPercent, 30)));
      if ("coverImage" in body) patch.coverImage = safeUrl(body.coverImage);
      if ("gallery" in body) patch.gallery = urls(body.gallery);
      if ("amenities" in body) patch.amenities = list(body.amenities).map((item) => sanitizeText(item, 120));
      if ("videoUrl" in body) patch.videoUrl = safeUrl(body.videoUrl) || null;
      if ("featured" in body) patch.featured = bool(body.featured);
      if ("active" in body) patch.active = bool(body.active, true);
      if ("sortOrder" in body) patch.sortOrder = num(body.sortOrder);
      const updated = await db
        .update(rooms)
        .set(patch as Partial<typeof rooms.$inferInsert>)
        .where(eq(rooms.id, id))
        .returning();
      if (!updated[0]) return { ok: false, error: "اتاق یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "facilities") {
      const patch: Record<string, unknown> = {};
      if ("title" in body) patch.title = str(body.title);
      if ("subtitle" in body) patch.subtitle = str(body.subtitle);
      if ("description" in body) patch.description = str(body.description);
      if ("icon" in body) patch.icon = str(body.icon);
      if ("imageUrl" in body) patch.imageUrl = safeUrl(body.imageUrl);
      if ("category" in body) patch.category = str(body.category);
      if ("features" in body) patch.features = list(body.features);
      if ("highlight" in body) patch.highlight = bool(body.highlight);
      if ("active" in body) patch.active = bool(body.active, true);
      if ("sortOrder" in body) patch.sortOrder = num(body.sortOrder);
      const updated = await db
        .update(facilities)
        .set(patch as Partial<typeof facilities.$inferInsert>)
        .where(eq(facilities.id, id))
        .returning();
      if (!updated[0]) return { ok: false, error: "خدمت یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "attractions") {
      const patch: Record<string, unknown> = {};
      if ("title" in body) patch.title = str(body.title);
      if ("description" in body) patch.description = str(body.description);
      if ("category" in body) patch.category = str(body.category);
      if ("distanceKm" in body) patch.distanceKm = Math.max(0, num(body.distanceKm));
      if ("location" in body) patch.location = str(body.location);
      if ("imageUrl" in body) patch.imageUrl = safeUrl(body.imageUrl);
      if ("mapUrl" in body) patch.mapUrl = safeUrl(body.mapUrl) || null;
      if ("active" in body) patch.active = bool(body.active, true);
      if ("sortOrder" in body) patch.sortOrder = num(body.sortOrder);
      const updated = await db
        .update(attractions)
        .set(patch as Partial<typeof attractions.$inferInsert>)
        .where(eq(attractions.id, id))
        .returning();
      if (!updated[0]) return { ok: false, error: "جاذبه یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "gallery") {
      const patch: Record<string, unknown> = {};
      if ("title" in body) patch.title = str(body.title);
      if ("imageUrl" in body) patch.imageUrl = safeUrl(body.imageUrl);
      if ("category" in body) patch.category = str(body.category);
      if ("active" in body) patch.active = bool(body.active, true);
      if ("sortOrder" in body) patch.sortOrder = num(body.sortOrder);
      const updated = await db
        .update(gallery)
        .set(patch as Partial<typeof gallery.$inferInsert>)
        .where(eq(gallery.id, id))
        .returning();
      if (!updated[0]) return { ok: false, error: "تصویر یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "messages") {
      const patch: Record<string, unknown> = {};
      if ("status" in body) patch.status = str(body.status, "read");
      if ("replyNote" in body) patch.replyNote = str(body.replyNote) || null;
      const updated = await db
        .update(messages)
        .set(patch as Partial<typeof messages.$inferInsert>)
        .where(eq(messages.id, id))
        .returning();
      if (!updated[0]) return { ok: false, error: "پیام یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "pool-slots") {
      const patch: Record<string, unknown> = {};
      if ("label" in body) patch.label = str(body.label);
      if ("price" in body) patch.price = Math.max(0, num(body.price));
      if ("capacity" in body) patch.capacity = Math.max(1, num(body.capacity, 8));
      if ("extraGuestFee" in body) patch.extraGuestFee = Math.max(0, num(body.extraGuestFee));
  if ("starRating" in body) patch.starRating = Math.min(5, Math.max(1, num(body.starRating, 3)));
  if ("modulePool" in body) patch.modulePool = bool(body.modulePool);
  if ("moduleRestaurant" in body) patch.moduleRestaurant = bool(body.moduleRestaurant);
  if ("moduleCafe" in body) patch.moduleCafe = bool(body.moduleCafe);
  if ("moduleSpa" in body) patch.moduleSpa = bool(body.moduleSpa);
      if ("description" in body) patch.description = str(body.description);
      if ("active" in body) patch.active = bool(body.active, true);
      if ("sortOrder" in body) patch.sortOrder = num(body.sortOrder);
      const updated = await db
        .update(poolSlots)
        .set(patch as Partial<typeof poolSlots.$inferInsert>)
        .where(eq(poolSlots.id, id))
        .returning();
      if (!updated[0]) return { ok: false, error: "سانس یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "menu-items") {
      const patch: Record<string, unknown> = {};
      if ("name" in body) patch.name = sanitizeText(body.name, 160);
      if ("description" in body) patch.description = sanitizeText(body.description, 500);
      if ("price" in body) patch.price = Math.max(0, num(body.price));
      if ("category" in body) patch.category = sanitizeText(body.category, 80);
      if ("imageUrl" in body) patch.imageUrl = safeUrl(body.imageUrl);
      if ("featured" in body) patch.featured = bool(body.featured);
      if ("active" in body) patch.active = bool(body.active, true);
      if ("sortOrder" in body) patch.sortOrder = num(body.sortOrder);
      const updated = await db
        .update(menuItems)
        .set(patch as Partial<typeof menuItems.$inferInsert>)
        .where(eq(menuItems.id, id))
        .returning();
      if (!updated[0]) return { ok: false, error: "آیتم منو یافت نشد." };
      return { ok: true, item: updated[0] };
    }


    if (resource === "offers") {
      const patch: Record<string, unknown> = {};
      if ("title" in body) patch.title = sanitizeText(body.title, 160);
      if ("subtitle" in body) patch.subtitle = sanitizeText(body.subtitle, 200);
      if ("description" in body) patch.description = sanitizeText(body.description, 2000);
      if ("imageUrl" in body) patch.imageUrl = safeUrl(body.imageUrl);
      if ("badge" in body) patch.badge = sanitizeText(body.badge, 60);
      if ("price" in body) patch.price = Math.max(0, num(body.price));
      if ("oldPrice" in body) patch.oldPrice = Math.max(0, num(body.oldPrice));
      if ("includes" in body) patch.includes = list(body.includes).map((item) => sanitizeText(item, 120));
      if ("roomId" in body) patch.roomId = num(body.roomId) || null;
      if ("validUntil" in body) patch.validUntil = str(body.validUntil) || null;
      if ("featured" in body) patch.featured = bool(body.featured);
      if ("active" in body) patch.active = bool(body.active, true);
      if ("sortOrder" in body) patch.sortOrder = num(body.sortOrder);
      const updated = await db.update(offers).set(patch as Partial<typeof offers.$inferInsert>).where(eq(offers.id, id)).returning();
      if (!updated[0]) return { ok: false, error: "پیشنهاد یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "events") {
      const patch: Record<string, unknown> = {};
      if ("title" in body) patch.title = sanitizeText(body.title, 160);
      if ("description" in body) patch.description = sanitizeText(body.description, 2000);
      if ("imageUrl" in body) patch.imageUrl = safeUrl(body.imageUrl);
      if ("category" in body) patch.category = sanitizeText(body.category, 60);
      if ("startsAt" in body) patch.startsAt = str(body.startsAt).slice(0, 10);
      if ("endDate" in body) patch.endDate = str(body.endDate) || null;
      if ("timeLabel" in body) patch.timeLabel = sanitizeText(body.timeLabel, 60);
      if ("location" in body) patch.location = sanitizeText(body.location, 160);
      if ("price" in body) patch.price = Math.max(0, num(body.price));
      if ("capacity" in body) patch.capacity = Math.max(0, num(body.capacity));
      if ("featured" in body) patch.featured = bool(body.featured);
      if ("active" in body) patch.active = bool(body.active, true);
      const updated = await db.update(events).set(patch as Partial<typeof events.$inferInsert>).where(eq(events.id, id)).returning();
      if (!updated[0]) return { ok: false, error: "رویداد یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "promo-codes") {
      const patch: Record<string, unknown> = {};
      if ("label" in body) patch.label = sanitizeText(body.label, 120);
      if ("kind" in body) patch.kind = body.kind === "fixed" ? "fixed" : "percent";
      if ("value" in body) patch.value = Math.max(0, num(body.value));
      if ("minNights" in body) patch.minNights = Math.max(1, num(body.minNights, 1));
      if ("maxUses" in body) patch.maxUses = Math.max(0, num(body.maxUses));
      if ("expiresAt" in body) patch.expiresAt = str(body.expiresAt) || null;
      if ("active" in body) patch.active = bool(body.active, true);
      const updated = await db.update(promoCodes).set(patch as Partial<typeof promoCodes.$inferInsert>).where(eq(promoCodes.id, id)).returning();
      if (!updated[0]) return { ok: false, error: "کد تخفیف یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "reviews") {
      const patch: Record<string, unknown> = {};
      if ("status" in body) patch.status = str(body.status) || "pending";
      if ("featured" in body) patch.featured = bool(body.featured);
      if ("comment" in body) patch.comment = sanitizeText(body.comment, 2000);
      if ("rating" in body) patch.rating = Math.min(5, Math.max(1, num(body.rating, 5)));
      if ("guestName" in body) patch.guestName = sanitizeText(body.guestName, 120);
      if ("city" in body) patch.city = sanitizeText(body.city, 80);
      const updated = await db.update(reviews).set(patch as Partial<typeof reviews.$inferInsert>).where(eq(reviews.id, id)).returning();
      if (!updated[0]) return { ok: false, error: "نظر یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "subscribers") {
      const patch: Record<string, unknown> = {};
      if ("active" in body) patch.active = bool(body.active, true);
      if ("source" in body) patch.source = sanitizeText(body.source, 40);
      const updated = await db.update(subscribers).set(patch as Partial<typeof subscribers.$inferInsert>).where(eq(subscribers.id, id)).returning();
      if (!updated[0]) return { ok: false, error: "مشترک یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "concierge") {
      const patch: Record<string, unknown> = {};
      if ("status" in body) patch.status = str(body.status) || "new";
      if ("adminNote" in body) patch.adminNote = sanitizeText(body.adminNote, 1000);
      const updated = await db.update(conciergeRequests).set(patch as Partial<typeof conciergeRequests.$inferInsert>).where(eq(conciergeRequests.id, id)).returning();
      if (!updated[0]) return { ok: false, error: "درخواست یافت نشد." };
      return { ok: true, item: updated[0] };
    }

    if (resource === "bookings") {
      const current = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
      const booking = current[0];
      if (!booking) return { ok: false, error: "رزرو یافت نشد." };
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      if ("adminNote" in body) patch.adminNote = str(body.adminNote) || null;
      if ("guestName" in body) patch.guestName = str(body.guestName);
      if ("phone" in body) patch.phone = str(body.phone);
      if ("markPaid" in body && bool(body.markPaid)) {
        patch.paidAmount = booking.prepaymentAmount;
        patch.paidAt = booking.paidAt ?? new Date();
        patch.paymentRef = booking.paymentRef ?? `ADM-${Date.now().toString().slice(-6)}`;
        if (booking.status === "pending_payment") patch.status = "awaiting_review";
      }
      if ("status" in body) {
        const status = str(body.status);
        patch.status = status;
        if (status === "confirmed") {
          patch.reservationCode = booking.reservationCode || generateRoomBookingCode();
          patch.reviewedAt = new Date();
          if (booking.paidAmount === 0) {
            patch.paidAmount = booking.prepaymentAmount;
            patch.paidAt = new Date();
            patch.paymentRef = booking.paymentRef ?? `ADM-${Date.now().toString().slice(-6)}`;
          }
        }
        if (status === "rejected" || status === "cancelled") {
          patch.reservationCode = null;
          patch.reviewedAt = new Date();
        }
      }
      const updated = await db
        .update(bookings)
        .set(patch as Partial<typeof bookings.$inferInsert>)
        .where(eq(bookings.id, id))
        .returning();
      const saved = updated[0];
      if (saved && "status" in body) {
        try {
          if (saved.status === "confirmed") {
            await postBookingRevenue(saved);
            await notifyGuestReservation(saved);
            await notifyGuestStatus(saved);
          } else if (saved.status === "rejected" || saved.status === "cancelled") {
            await notifyGuestStatus(saved);
          }
        } catch (error) {
          console.error("[admin-crud] booking side-effects failed", error);
        }
      }
      return { ok: true, item: saved };
    }

    return { ok: false, error: "منبع نامعتبر است." };
  } catch (error) {
    console.error("[admin-crud] update", resource, error);
    return { ok: false, error: "ویرایش اطلاعات انجام نشد." };
  }
}

export async function deleteResource(
  resource: AdminResource,
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    switch (resource) {
      case "rooms":
        await db.delete(rooms).where(eq(rooms.id, id));
        break;
      case "facilities":
        await db.delete(facilities).where(eq(facilities.id, id));
        break;
      case "attractions":
        await db.delete(attractions).where(eq(attractions.id, id));
        break;
      case "gallery":
        await db.delete(gallery).where(eq(gallery.id, id));
        break;
      case "messages":
        await db.delete(messages).where(eq(messages.id, id));
        break;
      case "bookings":
        await db.delete(bookings).where(eq(bookings.id, id));
        break;
      case "pool-slots":
        await db.delete(poolSlots).where(eq(poolSlots.id, id));
        break;
      case "menu-items":
        await db.delete(menuItems).where(eq(menuItems.id, id));
        break;
      case "offers":
        await db.delete(offers).where(eq(offers.id, id));
        break;
      case "events":
        await db.delete(events).where(eq(events.id, id));
        break;
      case "promo-codes":
        await db.delete(promoCodes).where(eq(promoCodes.id, id));
        break;
      case "reviews":
        await db.delete(reviews).where(eq(reviews.id, id));
        break;
      case "subscribers":
        await db.delete(subscribers).where(eq(subscribers.id, id));
        break;
      case "concierge":
        await db.delete(conciergeRequests).where(eq(conciergeRequests.id, id));
        break;
      default:
        return { ok: false, error: "منبع نامعتبر است." };
    }
    return { ok: true };
  } catch (error) {
    console.error("[admin-crud] delete", resource, error);
    return { ok: false, error: "حذف انجام نشد. ممکن است این مورد در رزروها استفاده شده باشد." };
  }
}

const SETTINGS_TEXT_FIELDS = [
  "hotelName",
  "tagline",
  "heroTitle",
  "heroSubtitle",
  "heroImage",
  "aboutTitle",
  "aboutText",
  "aboutImage",
  "storyText",
  "videoUrl",
  "phone",
  "mobile",
  "email",
  "address",
  "mapLat",
  "mapLng",
  "mapAddress",
  "instagram",
  "telegram",
  "whatsapp",
  "whatsappLink",
  "checkInTime",
  "checkOutTime",
  "poolTitle",
  "poolDescription",
  "poolImage",
  "cardNumber",
  "cardHolder",
  "city",
  "diningTitle",
  "diningSubtitle",
  "diningDescription",
  "diningHours",
  "diningPhone",
  "diningImage",
  "diningImage2",
  "diningVideoUrl",
  "diningNote",
  "heroMediaType",
  "heroVideoUrl",
  "poolMediaType",
  "poolVideoUrl",
  "poolVideoPoster",
  "roomsKicker",
  "roomsTitle",
  "roomsDescription",
  "facilitiesKicker",
  "facilitiesTitle",
  "facilitiesDescription",
  "attractionsKicker",
  "attractionsTitle",
  "attractionsDescription",
  "galleryKicker",
  "galleryTitle",
  "galleryDescription",
  "testimonialsTitle",
  "mapTitle",
  "mapDescription",
  "ctaTitle",
  "ctaDescription",
  "statYears",
  "statYearsLabel",
  "statGuests",
  "statGuestsLabel",
  "statRating",
  "statRatingCount",
] as const;

const SETTINGS_URL_FIELDS = new Set([
  "heroImage",
  "heroVideoUrl",
  "aboutImage",
  "videoUrl",
  "poolImage",
  "poolVideoUrl",
  "poolVideoPoster",
  "diningImage",
  "diningImage2",
  "diningVideoUrl",
]);

export async function updateSettings(body: Body) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  SETTINGS_TEXT_FIELDS.forEach((field) => {
    if (!(field in body)) return;
    patch[field] = SETTINGS_URL_FIELDS.has(field) ? safeUrl(body[field]) : sanitizeText(body[field], 4000);
  });
  if ("poolPrice" in body) patch.poolPrice = Math.max(0, num(body.poolPrice));
  if ("totalRooms" in body) patch.totalRooms = Math.max(1, num(body.totalRooms, 16));
  if ("extraGuestFee" in body) patch.extraGuestFee = Math.max(0, num(body.extraGuestFee));
  if ("starRating" in body) patch.starRating = Math.min(5, Math.max(1, num(body.starRating, 3)));
  if ("modulePool" in body) patch.modulePool = bool(body.modulePool);
  if ("moduleRestaurant" in body) patch.moduleRestaurant = bool(body.moduleRestaurant);
  if ("moduleCafe" in body) patch.moduleCafe = bool(body.moduleCafe);
  if ("moduleSpa" in body) patch.moduleSpa = bool(body.moduleSpa);
  if ("poolBaseCapacity" in body) patch.poolBaseCapacity = Math.max(1, num(body.poolBaseCapacity, 8));
  if ("poolMaxCapacity" in body)
    patch.poolMaxCapacity = Math.max(num(body.poolBaseCapacity, 8), num(body.poolMaxCapacity, 12));
  if ("roomRules" in body) patch.roomRules = list(body.roomRules).map((item) => sanitizeText(item, 400)).slice(0, 40);
  if ("poolRules" in body) patch.poolRules = list(body.poolRules).map((item) => sanitizeText(item, 400)).slice(0, 40);

  const updated = await db
    .update(settings)
    .set(patch as Partial<typeof settings.$inferInsert>)
    .where(eq(settings.id, 1))
    .returning();
  return updated[0] ?? null;
}
