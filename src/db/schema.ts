import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type RoomAddon = { name: string; price: number; description?: string };
export type BookingAddon = { name: string; price: number };
export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type AccountLevel = "general" | "subsidiary" | "detail";

/* ---------------------------------- auth --------------------------------- */

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------------- rooms -------------------------------- */

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  roomNumber: text("room_number").notNull(),
  roomType: text("room_type").notNull(),
  floor: integer("floor").notNull().default(1),
  capacity: integer("capacity").notNull().default(2),
  maxCapacity: integer("max_capacity").notNull().default(4),
  extraGuestFee: integer("extra_guest_fee").notNull().default(0),
  addons: jsonb("addons").$type<RoomAddon[]>().notNull().default([]),
  size: integer("size").notNull().default(28),
  bedType: text("bed_type").notNull().default("تخت دو نفره"),
  view: text("view").notNull().default("منظره جنگل"),
  description: text("description").notNull(),
  longDescription: text("long_description").notNull().default(""),
  pricePerNight: integer("price_per_night").notNull(),
  prepaymentPercent: integer("prepayment_percent").notNull().default(30),
  coverImage: text("cover_image").notNull(),
  gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
  amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
  videoUrl: text("video_url"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------- facilities ------------------------------ */

export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("✨"),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull().default("رفاهی"),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  highlight: boolean("highlight").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------- attractions ----------------------------- */

export const attractions = pgTable("attractions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("طبیعت‌گردی"),
  distanceKm: integer("distance_km").notNull().default(10),
  location: text("location").notNull().default(""),
  imageUrl: text("image_url").notNull(),
  mapUrl: text("map_url"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------- bookings ------------------------------- */

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  trackingCode: text("tracking_code").notNull().unique(),
  reservationCode: text("reservation_code").unique(),
  guestName: text("guest_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  serviceType: text("service_type").notNull().default("room"),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  serviceLabel: text("service_label").notNull().default(""),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out").notNull(),
  timeSlot: text("time_slot"),
  nights: integer("nights").notNull().default(1),
  adults: integer("adults").notNull().default(2),
  children: integer("children").notNull().default(0),
  extraGuests: integer("extra_guests").notNull().default(0),
  extraGuestFee: integer("extra_guest_fee").notNull().default(0),
  addons: jsonb("addons").$type<BookingAddon[]>().notNull().default([]),
  addonsTotal: integer("addons_total").notNull().default(0),
  promoCode: text("promo_code"),
  discountAmount: integer("discount_amount").notNull().default(0),
  rateBreakdown: jsonb("rate_breakdown").$type<{ date: string; price: number; label: string }[]>()
    .notNull()
    .default([]),
  poolSlotId: integer("pool_slot_id").references(() => poolSlots.id, { onDelete: "set null" }),
  basePrice: integer("base_price").notNull().default(0),
  unitPrice: integer("unit_price").notNull().default(0),
  totalAmount: integer("total_amount").notNull().default(0),
  prepaymentAmount: integer("prepayment_amount").notNull().default(0),
  paidAmount: integer("paid_amount").notNull().default(0),
  paymentRef: text("payment_ref"),
  status: text("status").notNull().default("pending_payment"),
  notes: text("notes"),
  adminNote: text("admin_note"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------- messages ------------------------------- */

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  subject: text("subject").notNull().default("پیام عمومی"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  replyNote: text("reply_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------- gallery ------------------------------- */

export const gallery = pgTable("gallery", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull(),
  category: text("category").notNull().default("هتل"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------ testimonials ----------------------------- */

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  guestName: text("guest_name").notNull(),
  city: text("city").notNull().default(""),
  rating: integer("rating").notNull().default(5),
  comment: text("comment").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------ room pricing ----------------------------- */

export const roomDailyPrices = pgTable(
  "room_daily_prices",
  {
    id: serial("id").primaryKey(),
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    price: integer("price").notNull(),
    label: text("label").notNull().default("custom"),
    note: text("note").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("room_daily_prices_room_date_idx").on(table.roomId, table.date)],
);

export const specialDays = pgTable(
  "special_days",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    title: text("title").notNull().default(""),
    kind: text("kind").notNull().default("holiday"),
    percent: integer("percent").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("special_days_date_idx").on(table.date)],
);

/* ---------------------------------- sms ---------------------------------- */

export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().default("kavenegar"),
  pattern: text("pattern").notNull().default(""),
  receptor: text("receptor").notNull().default(""),
  status: text("status").notNull().default("pending"),
  context: text("context").notNull().default("general"),
  params: jsonb("params").$type<Record<string, string>>().notNull().default({}),
  response: text("response").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------- accounting ------------------------------ */

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  type: text("type").notNull().default("asset"),
  level: text("level").notNull().default("general"),
  parentCode: text("parent_code"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalEntries = pgTable("journal_entries", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull(),
  date: date("date").notNull(),
  description: text("description").notNull().default(""),
  reference: text("reference").notNull().default(""),
  source: text("source").notNull().default("manual"),
  createdBy: text("created_by").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const journalLines = pgTable("journal_lines", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id")
    .notNull()
    .references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: integer("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "restrict" }),
  debit: integer("debit").notNull().default(0),
  credit: integer("credit").notNull().default(0),
  description: text("description").notNull().default(""),
});

/* -------------------------------- menu ----------------------------------- */

export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  price: integer("price").notNull().default(0),
  category: text("category").notNull().default("غذای اصلی"),
  imageUrl: text("image_url").notNull().default(""),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------- offers --------------------------------- */

export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull().default(""),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  badge: text("badge").notNull().default("پیشنهاد ویژه"),
  price: integer("price").notNull().default(0),
  oldPrice: integer("old_price").notNull().default(0),
  includes: jsonb("includes").$type<string[]>().notNull().default([]),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  validUntil: date("valid_until"),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------- events -------------------------------- */

export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  imageUrl: text("image_url").notNull().default(""),
  category: text("category").notNull().default("رویداد"),
  startsAt: date("starts_at").notNull(),
  endDate: date("end_date"),
  timeLabel: text("time_label").notNull().default(""),
  location: text("location").notNull().default(""),
  price: integer("price").notNull().default(0),
  capacity: integer("capacity").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------- promo codes ----------------------------- */

export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  label: text("label").notNull().default(""),
  kind: text("kind").notNull().default("percent"),
  value: integer("value").notNull().default(0),
  minNights: integer("min_nights").notNull().default(1),
  maxUses: integer("max_uses").notNull().default(0),
  usedCount: integer("used_count").notNull().default(0),
  expiresAt: date("expires_at"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* --------------------------------- reviews ------------------------------- */

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  guestName: text("guest_name").notNull(),
  city: text("city").notNull().default(""),
  rating: integer("rating").notNull().default(5),
  title: text("title").notNull().default(""),
  comment: text("comment").notNull(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  stayDate: date("stay_date"),
  status: text("status").notNull().default("pending"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------ subscribers ------------------------------ */

export const subscribers = pgTable("subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  source: text("source").notNull().default("website"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ---------------------------- concierge requests ------------------------- */

export const conciergeRequests = pgTable("concierge_requests", {
  id: serial("id").primaryKey(),
  bookingCode: text("booking_code").notNull().default(""),
  guestName: text("guest_name").notNull(),
  phone: text("phone").notNull(),
  serviceType: text("service_type").notNull().default("airport_transfer"),
  details: text("details").notNull().default(""),
  preferredDate: date("preferred_date"),
  status: text("status").notNull().default("new"),
  adminNote: text("admin_note").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* -------------------------------- settings ------------------------------- */

export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  hotelName: text("hotel_name").notNull().default("هتل کاج"),
  tagline: text("tagline").notNull().default(""),
  heroTitle: text("hero_title").notNull().default(""),
  heroSubtitle: text("hero_subtitle").notNull().default(""),
  heroImage: text("hero_image").notNull().default(""),
  aboutTitle: text("about_title").notNull().default(""),
  aboutText: text("about_text").notNull().default(""),
  aboutImage: text("about_image").notNull().default(""),
  storyText: text("story_text").notNull().default(""),
  videoUrl: text("video_url"),
  phone: text("phone").notNull().default(""),
  mobile: text("mobile").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  mapLat: text("map_lat").notNull().default("37.2719"),
  mapLng: text("map_lng").notNull().default("55.4323"),
  mapAddress: text("map_address").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  telegram: text("telegram").notNull().default(""),
  whatsapp: text("whatsapp").notNull().default(""),
  whatsappLink: text("whatsapp_link").notNull().default(""),
  checkInTime: text("check_in_time").notNull().default("۱۴:۰۰"),
  checkOutTime: text("check_out_time").notNull().default("۱۲:۰۰"),
  poolPrice: integer("pool_price").notNull().default(2500000),
  poolTitle: text("pool_title").notNull().default("استخر خانوادگی کاج"),
  poolDescription: text("pool_description").notNull().default(""),
  poolImage: text("pool_image").notNull().default(""),
  starRating: integer("star_rating").notNull().default(3),
  city: text("city").notNull().default("شیراز"),
  modulePool: boolean("module_pool").notNull().default(false),
  moduleRestaurant: boolean("module_restaurant").notNull().default(true),
  moduleCafe: boolean("module_cafe").notNull().default(true),
  moduleSpa: boolean("module_spa").notNull().default(false),
  diningTitle: text("dining_title").notNull().default("کافه‌‑رستوران کاج"),
  diningSubtitle: text("dining_subtitle").notNull().default("طعم‌های اصیل شیراز در فضایی آرام"),
  diningDescription: text("dining_description").notNull().default(""),
  diningHours: text("dining_hours").notNull().default("۰۸:۰۰ تا ۲۳:۰۰"),
  diningPhone: text("dining_phone").notNull().default(""),
  diningImage: text("dining_image").notNull().default(""),
  diningImage2: text("dining_image2").notNull().default(""),
  diningVideoUrl: text("dining_video_url"),
  diningNote: text("dining_note").notNull().default(""),
  cardNumber: text("card_number").notNull().default(""),
  cardHolder: text("card_holder").notNull().default(""),
  totalRooms: integer("total_rooms").notNull().default(16),
  heroMediaType: text("hero_media_type").notNull().default("image"),
  heroVideoUrl: text("hero_video_url"),
  poolMediaType: text("pool_media_type").notNull().default("video"),
  poolVideoUrl: text("pool_video_url"),
  poolVideoPoster: text("pool_video_poster").notNull().default(""),
  extraGuestFee: integer("extra_guest_fee").notNull().default(350000),
  poolBaseCapacity: integer("pool_base_capacity").notNull().default(8),
  poolMaxCapacity: integer("pool_max_capacity").notNull().default(12),
  roomsKicker: text("rooms_kicker").notNull().default("اقامتگاه"),
  roomsTitle: text("rooms_title").notNull().default("اتاق‌ها و سوئیت‌های کاج"),
  roomsDescription: text("rooms_description")
    .notNull()
    .default("۱۶ اتاق و سوئیت با منظره جنگل، امکانات کامل و چیدمانی گرم. اتاق مناسب خود را انتخاب کنید و درخواست رزرو ثبت نمایید."),
  facilitiesKicker: text("facilities_kicker").notNull().default("امکانات هتل"),
  facilitiesTitle: text("facilities_title").notNull().default("هر آنچه برای یک اقامت راحت نیاز دارید"),
  facilitiesDescription: text("facilities_description")
    .notNull()
    .default("از استخر و اسپا تا رستوران محلی، ترانسفر فرودگاهی و پارکینگ سرپوشیده؛ همه در یک مجموعه."),
  attractionsKicker: text("attractions_kicker").notNull().default("اطراف کاج"),
  attractionsTitle: text("attractions_title").notNull().default("جاذبه‌های گردشگری نزدیک هتل"),
  attractionsDescription: text("attractions_description")
    .notNull()
    .default("جنگل، آبشار، برج تاریخی و دریای خزر؛ هر روز اقامت خود را به یک ماجرای تازه تبدیل کنید."),
  galleryKicker: text("gallery_kicker").notNull().default("گالری تصاویر"),
  galleryTitle: text("gallery_title").notNull().default("نگاهی به دنیای کاج"),
  galleryDescription: text("gallery_description").notNull().default("تصاویری واقعی از اتاق‌ها، استخر، رستوران و طبیعت اطراف هتل."),
  testimonialsTitle: text("testimonials_title").notNull().default("خاطره‌هایی که مهمانان ما ساخته‌اند"),
  mapTitle: text("map_title").notNull().default("ما را روی نقشه پیدا کنید"),
  mapDescription: text("map_description")
    .notNull()
    .default("هتل کاج در کیلومتر ۸ جاده گالیکش به پارک ملی گلستان قرار دارد؛ دسترسی آسان از گرگان، گنبد کاووس و مشهد."),
  ctaTitle: text("cta_title").notNull().default("اقامت بعدی خود را در کاج ثبت کنید"),
  ctaDescription: text("cta_description")
    .notNull()
    .default("درخواست رزرو را آنلاین ثبت کنید، پیش‌پرداخت را پرداخت کنید و پس از تأیید پذیرش، کد رزرو خود را دریافت کنید."),
  statYears: text("stat_years").notNull().default("از سال ۱۳۹۶"),
  statYearsLabel: text("stat_years_label").notNull().default("میزبان خانواده‌ها"),
  statGuests: text("stat_guests").notNull().default("+۱٬۲۰۰"),
  statGuestsLabel: text("stat_guests_label").notNull().default("میزبانی از مهمانان"),
  statRating: text("stat_rating").notNull().default("۴٫۸"),
  statRatingCount: text("stat_rating_count").notNull().default("۳۱۲"),
  roomRules: jsonb("room_rules").$type<string[]>().notNull().default([]),
  poolRules: jsonb("pool_rules").$type<string[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------- pool slots ------------------------------ */

export const poolSlots = pgTable("pool_slots", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  price: integer("price").notNull(),
  capacity: integer("capacity").notNull().default(8),
  extraGuestFee: integer("extra_guest_fee").notNull().default(350000),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Room = typeof rooms.$inferSelect;
export type Facility = typeof facilities.$inferSelect;
export type Attraction = typeof attractions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type GalleryItem = typeof gallery.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type PoolSlot = typeof poolSlots.$inferSelect;
export type RoomDailyPrice = typeof roomDailyPrices.$inferSelect;
export type SpecialDay = typeof specialDays.$inferSelect;
export type SmsLog = typeof smsLogs.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type JournalEntry = typeof journalEntries.$inferSelect;
export type JournalLine = typeof journalLines.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type EventItem = typeof events.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type GuestReview = typeof reviews.$inferSelect;
export type Subscriber = typeof subscribers.$inferSelect;
export type ConciergeRequest = typeof conciergeRequests.$inferSelect;
