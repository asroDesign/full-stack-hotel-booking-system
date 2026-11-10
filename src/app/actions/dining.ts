"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { diningVenues, menuItems, type VenueKind } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText, safeUrl, safeUrlList } from "@/lib/security";
import { linesToArray, slugify, toEnDigits } from "@/lib/utils";

export type DiningState = { ok?: boolean; error?: string; message?: string } | null;
const KINDS: VenueKind[] = ["restaurant", "cafe", "coffee_shop", "bar", "rooftop", "breakfast"];
const TAGS = ["popular", "new", "veg", "spicy", "local", "chef"];
const num = (v: unknown) => Number(toEnDigits(String(v ?? "")).replace(/[,٬]/g, "")) || 0;

export async function saveVenue(_p: DiningState, fd: FormData): Promise<DiningState> {
  await requireAdmin();
  const id = num(fd.get("id"));
  const name = cleanText(fd.get("name"), 120);
  if (!name) return { error: "نام رستوران / کافه الزامی است." };
  let hours: { label: string; time: string }[] = [];
  try {
    hours = (JSON.parse(String(fd.get("hours") ?? "[]")) as { label: string; time: string }[])
      .map((h) => ({ label: cleanText(h.label, 40), time: cleanText(h.time, 60) }))
      .filter((h) => h.label || h.time)
      .slice(0, 10);
  } catch {
    /* ignore */
  }
  const kind = KINDS.includes(fd.get("kind") as VenueKind) ? (fd.get("kind") as VenueKind) : "restaurant";
  const data = {
    name,
    slug: slugify(cleanText(fd.get("slug"), 80) || name),
    kind,
    tagline: cleanText(fd.get("tagline"), 200),
    description: cleanText(fd.get("description"), 5000),
    cuisine: cleanText(fd.get("cuisine"), 120),
    hours,
    images: safeUrlList(linesToArray(fd.get("images"))).slice(0, 20),
    videoUrl: safeUrl(cleanText(fd.get("videoUrl"), 500)),
    capacity: Math.max(0, num(fd.get("capacity"))),
    priceLevel: Math.min(4, Math.max(1, num(fd.get("priceLevel")) || 2)),
    phone: cleanText(fd.get("phone"), 30),
    features: linesToArray(fd.get("features")).map((x) => cleanText(x, 120)).slice(0, 20),
    openToPublic: fd.get("openToPublic") === "on",
    showMenu: fd.get("showMenu") === "on",
    bookingEnabled: fd.get("bookingEnabled") === "on",
    isActive: fd.get("isActive") === "on",
    sortOrder: num(fd.get("sortOrder")),
  };
  let venueId = id;
  try {
    if (id) await db.update(diningVenues).set(data).where(eq(diningVenues.id, id));
    else venueId = (await db.insert(diningVenues).values(data).returning({ id: diningVenues.id }))[0].id;
  } catch {
    return { error: "نامک (slug) تکراری است. مقدار دیگری وارد کنید." };
  }
  revalidatePath("/", "layout");
  redirect(`/admin/dining/${venueId}?saved=1`);
}

export async function deleteVenue(id: number) {
  await requireAdmin();
  await db.delete(diningVenues).where(eq(diningVenues.id, id));
  revalidatePath("/", "layout");
}

export async function toggleVenue(id: number, isActive: boolean) {
  await requireAdmin();
  await db.update(diningVenues).set({ isActive }).where(eq(diningVenues.id, id));
  revalidatePath("/", "layout");
}

export type MenuItemInput = {
  id?: number;
  category: string;
  name: string;
  description: string;
  price: number;
  image: string;
  tags: string[];
  isAvailable: boolean;
  isSignature: boolean;
};

/** Replace the whole menu of a venue in one transaction (simple, consistent ordering). */
export async function saveMenu(venueId: number, items: MenuItemInput[]): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const [venue] = await db.select({ id: diningVenues.id }).from(diningVenues).where(eq(diningVenues.id, venueId));
  if (!venue) return { ok: false, message: "رستوران یافت نشد." };
  const clean = items
    .slice(0, 400)
    .map((i, idx) => ({
      id: Number(i.id) || undefined,
      venueId,
      category: cleanText(i.category, 60) || "سایر",
      name: cleanText(i.name, 120),
      description: cleanText(i.description, 400),
      price: Math.max(0, Math.round(Number(i.price) || 0)),
      image: safeUrl(i.image),
      tags: (i.tags ?? []).filter((t) => TAGS.includes(t)),
      isAvailable: !!i.isAvailable,
      isSignature: !!i.isSignature,
      sortOrder: idx,
    }))
    .filter((i) => i.name);
  await db.transaction(async (tx) => {
    const keepIds = clean.map((i) => i.id).filter(Boolean) as number[];
    const existing = await tx.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.venueId, venueId));
    const toDelete = existing.map((e) => e.id).filter((x) => !keepIds.includes(x));
    if (toDelete.length) await tx.delete(menuItems).where(and(eq(menuItems.venueId, venueId), inArray(menuItems.id, toDelete)));
    for (const { id, ...row } of clean) {
      if (id && existing.some((e) => e.id === id)) await tx.update(menuItems).set(row).where(eq(menuItems.id, id));
      else await tx.insert(menuItems).values(row);
    }
  });
  revalidatePath("/", "layout");
  return { ok: true, message: `منو با ${clean.length} آیتم ذخیره شد.` };
}
