import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { faqs, galleryItems, testimonials } from "@/db/schema";

export async function getFaqs(limit = 200) {
  return db.select().from(faqs).where(eq(faqs.isActive, true)).orderBy(asc(faqs.sortOrder), asc(faqs.id)).limit(limit);
}

export async function getGallery(limit = 300) {
  return db.select().from(galleryItems).where(eq(galleryItems.isActive, true)).orderBy(asc(galleryItems.sortOrder), asc(galleryItems.id)).limit(limit);
}

export async function getApprovedReviews(limit = 100) {
  return db.select().from(testimonials).where(eq(testimonials.isApproved, true)).orderBy(desc(testimonials.createdAt)).limit(limit);
}

export function groupBy<T>(list: T[], key: (t: T) => string) {
  const out: { name: string; items: T[] }[] = [];
  for (const it of list) {
    const k = key(it) || "سایر";
    let g = out.find((x) => x.name === k);
    if (!g) out.push((g = { name: k, items: [] }));
    g.items.push(it);
  }
  return out;
}
