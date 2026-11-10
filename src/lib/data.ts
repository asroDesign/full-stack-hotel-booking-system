import { and, asc, count, desc, eq, gte, inArray, ne, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { db } from "@/db";
import {
  attractions,
  bookings,
  facilities,
  gallery,
  conciergeRequests,
  events,
  menuItems,
  messages,
  offers,
  promoCodes,
  reviews,
  subscribers,
  poolSlots,
  rooms,
  settings,
  testimonials,
  type Booking,
  type PoolSlot,
  type Room,
  type Settings,
} from "@/db/schema";
import { ensureSeeded } from "@/db/seed";
import { todayISO } from "@/lib/format";

export type SettingsRecord = Settings;

async function loadSettings(): Promise<Settings> {
  await ensureSeeded();
  const rows = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (rows[0]) return rows[0];
  const created = await db.insert(settings).values({ id: 1 }).onConflictDoNothing().returning();
  if (created[0]) return created[0];
  const retry = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  return retry[0];
}

async function loadRooms(options?: {
  onlyActive?: boolean;
  featured?: boolean;
  limit?: number;
}): Promise<Room[]> {
  await ensureSeeded();
  const filters = [];
  if (options?.onlyActive !== false) filters.push(eq(rooms.active, true));
  if (options?.featured) filters.push(eq(rooms.featured, true));
  const query = db
    .select()
    .from(rooms)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(rooms.sortOrder), asc(rooms.id));
  if (options?.limit) return query.limit(options.limit);
  return query;
}

export async function getRoomBySlug(slug: string): Promise<Room | null> {
  await ensureSeeded();
  const rows = await db.select().from(rooms).where(eq(rooms.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getRoomById(id: number): Promise<Room | null> {
  const rows = await db.select().from(rooms).where(eq(rooms.id, id)).limit(1);
  return rows[0] ?? null;
}

async function loadOffers(options?: { onlyActive?: boolean; featured?: boolean; limit?: number }) {
  await ensureSeeded();
  const filters = [];
  if (options?.onlyActive !== false) filters.push(eq(offers.active, true));
  if (options?.featured) filters.push(eq(offers.featured, true));
  const query = db
    .select()
    .from(offers)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(asc(offers.sortOrder), desc(offers.id));
  return options?.limit ? query.limit(options.limit) : query;
}

export async function getOfferBySlug(slug: string) {
  await ensureSeeded();
  const rows = await db.select().from(offers).where(eq(offers.slug, slug)).limit(1);
  return rows[0] ?? null;
}

async function loadEvents(options?: { onlyActive?: boolean; limit?: number }) {
  await ensureSeeded();
  const filters = options?.onlyActive === false ? undefined : eq(events.active, true);
  const query = db.select().from(events).where(filters).orderBy(asc(events.startsAt));
  return options?.limit ? query.limit(options.limit) : query;
}

async function loadGuestReviews(options?: { limit?: number; featured?: boolean }) {
  await ensureSeeded();
  const filters = [eq(reviews.status, "approved")];
  if (options?.featured) filters.push(eq(reviews.featured, true));
  const query = db
    .select()
    .from(reviews)
    .where(and(...filters))
    .orderBy(desc(reviews.featured), desc(reviews.createdAt));
  return options?.limit ? query.limit(options.limit) : query;
}

async function loadReviewSummary() {
  const rows = await db
    .select({ rating: reviews.rating, total: count() })
    .from(reviews)
    .where(eq(reviews.status, "approved"))
    .groupBy(reviews.rating);
  const approved = rows.map((row) => ({ rating: row.rating, total: Number(row.total) }));
  const total = approved.reduce((sum, row) => sum + row.total, 0);
  const average = total ? approved.reduce((sum, row) => sum + row.rating * row.total, 0) / total : 0;
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: approved.find((row) => row.rating === stars)?.total ?? 0,
  }));
  return { total, average: Math.round(average * 10) / 10, distribution };
}

async function loadActivePromos() {
  await ensureSeeded();
  return db
    .select()
    .from(promoCodes)
    .where(and(eq(promoCodes.active, true), gte(promoCodes.expiresAt, todayISO())))
    .orderBy(desc(promoCodes.createdAt))
    .limit(4);
}

export async function getPromoByCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  const rows = await db.select().from(promoCodes).where(eq(promoCodes.code, normalized)).limit(1);
  return rows[0] ?? null;
}

async function loadMenuItems(options?: { onlyActive?: boolean }) {
  await ensureSeeded();
  const filters = options?.onlyActive === false ? undefined : eq(menuItems.active, true);
  return db
    .select()
    .from(menuItems)
    .where(filters)
    .orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
}

export async function getPoolSlots(options?: { onlyActive?: boolean }) {
  await ensureSeeded();
  const filters = options?.onlyActive === false ? undefined : eq(poolSlots.active, true);
  return db
    .select()
    .from(poolSlots)
    .where(filters)
    .orderBy(asc(poolSlots.sortOrder), asc(poolSlots.id));
}

async function loadFacilities(options?: { onlyActive?: boolean }): Promise<(typeof facilities.$inferSelect)[]> {
  await ensureSeeded();
  const filters = options?.onlyActive === false ? undefined : eq(facilities.active, true);
  return db
    .select()
    .from(facilities)
    .where(filters)
    .orderBy(asc(facilities.sortOrder), asc(facilities.id));
}

async function loadAttractions(options?: { onlyActive?: boolean }) {
  await ensureSeeded();
  const filters = options?.onlyActive === false ? undefined : eq(attractions.active, true);
  return db
    .select()
    .from(attractions)
    .where(filters)
    .orderBy(asc(attractions.sortOrder), asc(attractions.id));
}

async function loadGallery(options?: { onlyActive?: boolean }) {
  await ensureSeeded();
  const filters = options?.onlyActive === false ? undefined : eq(gallery.active, true);
  return db
    .select()
    .from(gallery)
    .where(filters)
    .orderBy(asc(gallery.sortOrder), asc(gallery.id));
}

async function loadTestimonials() {
  await ensureSeeded();
  return db
    .select()
    .from(testimonials)
    .where(eq(testimonials.active, true))
    .orderBy(asc(testimonials.id));
}

export type BookingWithRoom = Booking & { roomName: string | null; roomNumber: string | null };

export async function getBookings(options?: {
  status?: string;
  search?: string;
  limit?: number;
}): Promise<BookingWithRoom[]> {
  const filters = [];
  if (options?.status && options.status !== "all") filters.push(eq(bookings.status, options.status));
  if (options?.search) {
    const term = `%${options.search}%`;
    filters.push(
      or(
        sql`${bookings.guestName} ilike ${term}`,
        sql`${bookings.phone} ilike ${term}`,
        sql`${bookings.trackingCode} ilike ${term}`,
        sql`coalesce(${bookings.reservationCode}, '') ilike ${term}`,
      ),
    );
  }
  const query = db
    .select({
      booking: bookings,
      roomName: rooms.name,
      roomNumber: rooms.roomNumber,
    })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(bookings.createdAt));
  const rows = options?.limit ? await query.limit(options.limit) : await query;
  return rows.map((row) => ({ ...row.booking, roomName: row.roomName, roomNumber: row.roomNumber }));
}

export async function getBookingByTracking(trackingCode: string): Promise<BookingWithRoom | null> {
  const normalizedCode = trackingCode.trim().toUpperCase();
  // Reservation codes are intentionally excluded: they are shown at check-in
  // and must not grant access to a guest's booking or its actions.
  if (!/^TRK-[A-Z0-9]{6,32}$/.test(normalizedCode)) return null;
  await ensureSeeded();
  const rows = await db
    .select({ booking: bookings, roomName: rooms.name, roomNumber: rooms.roomNumber })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(sql`upper(${bookings.trackingCode}) = ${normalizedCode}`)
    .limit(1);
  if (!rows[0]) return null;
  return { ...rows[0].booking, roomName: rows[0].roomName, roomNumber: rows[0].roomNumber };
}

export async function getBookingById(id: number): Promise<BookingWithRoom | null> {
  const rows = await db
    .select({ booking: bookings, roomName: rooms.name, roomNumber: rooms.roomNumber })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(eq(bookings.id, id))
    .limit(1);
  if (!rows[0]) return null;
  return { ...rows[0].booking, roomName: rows[0].roomName, roomNumber: rows[0].roomNumber };
}

export async function getMessages(options?: { status?: string; limit?: number }) {
  await ensureSeeded();
  const filters = options?.status && options.status !== "all" ? eq(messages.status, options.status) : undefined;
  return db
    .select()
    .from(messages)
    .where(filters)
    .orderBy(desc(messages.createdAt))
    .limit(options?.limit ?? 200);
}

export type DashboardStats = {
  totalBookings: number;
  confirmedBookings: number;
  awaitingReview: number;
  pendingPayment: number;
  activeRooms: number;
  totalRooms: number;
  newMessages: number;
  paidRevenue: number;
  pendingRevenue: number;
  occupancyRate: number;
  upcomingCheckIns: number;
  monthBookings: number;
  monthly: { label: string; bookings: number; revenue: number }[];
  statusBreakdown: { status: string; value: number }[];
};

export async function getDashboardStats(): Promise<DashboardStats> {
  await ensureSeeded();
  const [allBookings, roomCounts, messageCount] = await Promise.all([
    db.select().from(bookings).orderBy(desc(bookings.createdAt)).limit(300),
    db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${rooms.active})`,
      })
      .from(rooms),
    db
      .select({ total: count() })
      .from(messages)
      .where(eq(messages.status, "new")),
  ]);

  const today = todayISO();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const confirmed = allBookings.filter((booking) => booking.status === "confirmed");
  const statusOrder = ["pending_payment", "awaiting_review", "confirmed", "rejected", "cancelled"];
  const monthlyMap = new Map<string, { bookings: number; revenue: number }>();
  const monthLabels = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyMap.set(`${d.getFullYear()}-${d.getMonth()}`, { bookings: 0, revenue: 0 });
  }
  allBookings.forEach((booking) => {
    const created = new Date(booking.createdAt);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    const bucket = monthlyMap.get(key);
    if (bucket) {
      bucket.bookings += 1;
      bucket.revenue += booking.paidAmount;
    }
  });

  const monthly = Array.from(monthlyMap.entries()).map(([key, value]) => {
    const monthIndex = Number(key.split("-")[1]);
    return { label: monthLabels[monthIndex], bookings: value.bookings, revenue: value.revenue };
  });

  const totalRooms = Number(roomCounts[0]?.total ?? 0);
  const confirmedRoomNights = confirmed
    .filter((booking) => booking.serviceType === "room")
    .reduce((sum, booking) => sum + booking.nights, 0);

  return {
    totalBookings: allBookings.length,
    confirmedBookings: confirmed.length,
    awaitingReview: allBookings.filter((b) => b.status === "awaiting_review").length,
    pendingPayment: allBookings.filter((b) => b.status === "pending_payment").length,
    activeRooms: Number(roomCounts[0]?.active ?? 0),
    totalRooms,
    newMessages: Number(messageCount[0]?.total ?? 0),
    paidRevenue: confirmed.reduce((sum, booking) => sum + booking.paidAmount, 0),
    pendingRevenue: allBookings
      .filter((b) => b.status === "awaiting_review" || b.status === "pending_payment")
      .reduce((sum, booking) => sum + booking.totalAmount, 0),
    occupancyRate: totalRooms ? Math.min(100, Math.round((confirmedRoomNights / (totalRooms * 30)) * 100)) : 0,
    upcomingCheckIns: confirmed.filter((booking) => booking.checkIn >= today).length,
    monthBookings: allBookings.filter((booking) => new Date(booking.createdAt) >= monthStart).length,
    monthly,
    statusBreakdown: statusOrder.map((status) => ({
      status,
      value: allBookings.filter((booking) => booking.status === status).length,
    })),
  };
}

export async function getRoomAvailability(roomId: number, excludeBookingId?: number) {
  const filters = [
    eq(bookings.roomId, roomId),
    inArray(bookings.status, ["awaiting_review", "confirmed"]),
  ];
  if (excludeBookingId) filters.push(ne(bookings.id, excludeBookingId));
  return db
    .select({ checkIn: bookings.checkIn, checkOut: bookings.checkOut })
    .from(bookings)
    .where(and(...filters));
}

export async function countPendingReviews(): Promise<number> {
  const rows = await db.select({ total: count() }).from(reviews).where(eq(reviews.status, "pending"));
  return Number(rows[0]?.total ?? 0);
}

export async function countNewConcierge(): Promise<number> {
  const rows = await db.select({ total: count() }).from(conciergeRequests).where(eq(conciergeRequests.status, "new"));
  return Number(rows[0]?.total ?? 0);
}

export async function countSubscribers(): Promise<number> {
  const rows = await db.select({ total: count() }).from(subscribers).where(eq(subscribers.active, true));
  return Number(rows[0]?.total ?? 0);
}

export async function countUnreadMessages(): Promise<number> {
  const rows = await db.select({ total: count() }).from(messages).where(eq(messages.status, "new"));
  return Number(rows[0]?.total ?? 0);
}

export async function countAwaitingBookings(): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(bookings)
    .where(inArray(bookings.status, ["awaiting_review", "pending_payment"]));
  return Number(rows[0]?.total ?? 0);
}

export async function getUpcomingBookings(limit = 6): Promise<BookingWithRoom[]> {
  await ensureSeeded();
  const rows = await db
    .select({ booking: bookings, roomName: rooms.name, roomNumber: rooms.roomNumber })
    .from(bookings)
    .leftJoin(rooms, eq(bookings.roomId, rooms.id))
    .where(and(eq(bookings.status, "confirmed"), gte(bookings.checkIn, todayISO())))
    .orderBy(asc(bookings.checkIn))
    .limit(limit);
  return rows.map((row) => ({ ...row.booking, roomName: row.roomName, roomNumber: row.roomNumber }));
}


/* ------------------------------------------------------------------------- *
 * Public content caching
 * Static hotel content is cached for 60s and revalidated on admin writes
 * (`revalidatePublicContent()` in the admin API routes). This removes repeat
 * database round-trips from every page view while staying fresh.
 * ------------------------------------------------------------------------- */
const PUBLIC_CACHE = { revalidate: 30, tags: ["hotel-public"] };

// Settings drive branding/hero copy; keep them request-fresh (the query is a
// single indexed row) while de-duplicating multiple calls inside one render.
export const getSettings = cache(loadSettings);
export const getRooms = unstable_cache(loadRooms, ["public:rooms"], PUBLIC_CACHE);
export const getFacilities = unstable_cache(loadFacilities, ["public:facilities"], PUBLIC_CACHE);
export const getAttractions = unstable_cache(loadAttractions, ["public:attractions"], PUBLIC_CACHE);
export const getGallery = unstable_cache(loadGallery, ["public:gallery"], PUBLIC_CACHE);
export const getMenuItems = unstable_cache(loadMenuItems, ["public:menu"], PUBLIC_CACHE);
export const getTestimonials = unstable_cache(loadTestimonials, ["public:testimonials"], PUBLIC_CACHE);
export const getOffers = unstable_cache(loadOffers, ["public:offers"], PUBLIC_CACHE);
export const getEvents = unstable_cache(loadEvents, ["public:events"], PUBLIC_CACHE);
export const getGuestReviews = unstable_cache(loadGuestReviews, ["public:reviews"], PUBLIC_CACHE);
export const getReviewSummary = unstable_cache(loadReviewSummary, ["public:review-summary"], PUBLIC_CACHE);
export const getActivePromos = unstable_cache(loadActivePromos, ["public:promos"], PUBLIC_CACHE);
