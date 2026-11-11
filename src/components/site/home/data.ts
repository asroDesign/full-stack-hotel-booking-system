import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { amenities, attractions, menuItems, rooms, services, testimonials } from "@/db/schema";
import { and, inArray } from "drizzle-orm";
import { getSettings, type SiteSettings } from "@/lib/data";
import { getContent, type HomeContent } from "@/lib/content";
import { getActiveVenues } from "@/lib/dining";
import { getPublicOffers } from "@/lib/promotions";
import { getFaqs, getGallery } from "@/lib/extras";
import { getActiveStayPackages } from "@/lib/stay-packages";

export async function loadHome() {
  const [s, { home }] = await Promise.all([getSettings(), getContent()]);
  const [allRooms, svcList, amenityList, attractionList, reviews, venues, packages] = await Promise.all([
    db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(asc(rooms.sortOrder)),
    db.select().from(services).where(eq(services.isActive, true)).orderBy(asc(services.sortOrder)),
    db.select().from(amenities).orderBy(asc(amenities.sortOrder)),
    s.moduleAttractions === "1" ? db.select().from(attractions).orderBy(asc(attractions.sortOrder)) : Promise.resolve([]),
    db.select().from(testimonials).where(eq(testimonials.isApproved, true)).orderBy(desc(testimonials.createdAt)).limit(8),
    s.moduleDining === "1" ? getActiveVenues() : Promise.resolve([]),
    getActiveStayPackages(),
  ]);
  const [offers, gallery, faqList] = await Promise.all([
    s.moduleOffers === "1" ? getPublicOffers(6) : Promise.resolve([]),
    s.moduleGallery === "1" ? getGallery(12) : Promise.resolve([]),
    s.moduleFaq === "1" ? getFaqs(8) : Promise.resolve([]),
  ]);
  const signatures = venues.length
    ? await db
        .select()
        .from(menuItems)
        .where(and(inArray(menuItems.venueId, venues.map((v) => v.id)), eq(menuItems.isSignature, true), eq(menuItems.isAvailable, true)))
        .orderBy(asc(menuItems.sortOrder))
    : [];
  const featuredList = allRooms.filter((r) => r.isFeatured);
  const featured = (featuredList.length ? featuredList : allRooms).slice(0, Math.max(1, home.roomsCount));
  const spotlight = home.spotlightServiceSlug
    ? svcList.find((x) => x.slug === home.spotlightServiceSlug)
    : svcList.find((x) => x.isBookable && /استخر|اسپا|pool|spa/i.test(x.name + x.slug));
  return { s, h: home, allRooms, featured, svcList, amenityList, attractionList, reviews, venues, signatures, spotlight, offers, gallery, faqList, packages };
}

export type HomeData = Awaited<ReturnType<typeof loadHome>>;

/** Which sections are visible, in admin-defined order. */
export function visibleSections(d: HomeData): string[] {
  const { h, s } = d;
  const on: Record<string, boolean> = {
    features: h.showFeatures && h.features.length > 0,
    rooms: h.showRooms && d.featured.length > 0,
    packages: h.showPackages && d.packages.length > 0,
    spotlight: h.showPool && !!d.spotlight,
    dining: h.showDining && s.moduleDining === "1" && d.venues.length > 0,
    amenities: h.showAmenities && s.moduleAmenities === "1" && d.amenityList.length > 0,
    services: h.showServices && s.moduleServices === "1" && d.svcList.length > 0,
    attractions: h.showAttractions && s.moduleAttractions === "1" && d.attractionList.length > 0,
    reviews: h.showReviews && d.reviews.length > 0,
    offers: h.showOffers && s.moduleOffers === "1" && d.offers.length > 0,
    gallery: h.showGallery && s.moduleGallery === "1" && d.gallery.length > 0,
    faq: h.showFaq && s.moduleFaq === "1" && d.faqList.length > 0,
    track: h.showTrack,
    map: h.showMap,
  };
  return h.sectionOrder.filter((k) => on[k]);
}

export type { HomeContent, SiteSettings };
