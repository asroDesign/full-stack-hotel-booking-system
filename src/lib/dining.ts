import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { diningVenues, menuItems, type VenueKind } from "@/db/schema";

export const VENUE_KINDS: { key: VenueKind; label: string; icon: string }[] = [
  { key: "restaurant", label: "رستوران", icon: "UtensilsCrossed" },
  { key: "cafe", label: "کافه", icon: "Coffee" },
  { key: "coffee_shop", label: "کافی‌شاپ", icon: "Coffee" },
  { key: "breakfast", label: "سالن صبحانه", icon: "Sun" },
  { key: "rooftop", label: "روف‌گاردن", icon: "Trees" },
  { key: "bar", label: "لانژ / آبمیوه‌بار", icon: "Droplets" },
];
export const venueKindLabel = (k: string) => VENUE_KINDS.find((v) => v.key === k)?.label ?? "رستوران";
export const venueKindIcon = (k: string) => VENUE_KINDS.find((v) => v.key === k)?.icon ?? "UtensilsCrossed";

export const MENU_TAGS: { key: string; label: string; cls: string }[] = [
  { key: "popular", label: "محبوب", cls: "badge-secondary" },
  { key: "new", label: "جدید", cls: "badge-info" },
  { key: "veg", label: "گیاهی", cls: "badge-success" },
  { key: "spicy", label: "تند", cls: "badge-error" },
  { key: "local", label: "محلی", cls: "badge-warning" },
  { key: "chef", label: "پیشنهاد سرآشپز", cls: "badge-primary" },
];
export const tagMeta = (k: string) => MENU_TAGS.find((t) => t.key === k);

export const priceLevelLabel = (n: number) => "﷼".repeat(Math.min(4, Math.max(1, n)));

export async function getActiveVenues() {
  return db.select().from(diningVenues).where(eq(diningVenues.isActive, true)).orderBy(asc(diningVenues.sortOrder), asc(diningVenues.id));
}

export async function getVenueMenu(venueId: number) {
  const items = await db.select().from(menuItems).where(eq(menuItems.venueId, venueId)).orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
  const cats: { name: string; items: typeof items }[] = [];
  for (const it of items) {
    let c = cats.find((x) => x.name === it.category);
    if (!c) cats.push((c = { name: it.category, items: [] }));
    c.items.push(it);
  }
  return cats;
}
