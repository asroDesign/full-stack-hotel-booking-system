"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { faqs, galleryItems, promotions, testimonials } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText, safeUrl } from "@/lib/security";
import { normalizeCode } from "@/lib/promotions";
import { linesToArray, toEnDigits } from "@/lib/utils";

export type ExtrasState = { ok?: boolean; error?: string; message?: string } | null;
const num = (v: unknown) => Number(toEnDigits(String(v ?? "")).replace(/[,٬]/g, "")) || 0;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const done = () => revalidatePath("/", "layout");

/* ---------------- promotions ---------------- */
export async function savePromotion(_p: ExtrasState, fd: FormData): Promise<ExtrasState> {
  await requireAdmin();
  const id = num(fd.get("id"));
  const code = normalizeCode(fd.get("code"));
  if (code.length < 3) return { error: "کد تخفیف باید حداقل ۳ کاراکتر (حروف انگلیسی یا عدد) باشد." };
  const kind = fd.get("kind") === "fixed" ? "fixed" : "percent";
  const value = Math.max(0, num(fd.get("value")));
  if (!value) return { error: "مقدار تخفیف را وارد کنید." };
  if (kind === "percent" && value > 100) return { error: "درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد." };
  const validFrom = String(fd.get("validFrom") ?? "");
  const validTo = String(fd.get("validTo") ?? "");
  if (ISO.test(validFrom) && ISO.test(validTo) && validTo < validFrom) return { error: "تاریخ پایان باید بعد از تاریخ شروع باشد." };
  const applies = String(fd.get("appliesTo"));
  const data = {
    code,
    title: cleanText(fd.get("title"), 120),
    description: cleanText(fd.get("description"), 600),
    image: safeUrl(linesToArray(fd.get("image"))[0] ?? ""),
    kind: kind as "percent" | "fixed",
    value,
    maxDiscount: Math.max(0, num(fd.get("maxDiscount"))),
    minNights: Math.max(1, num(fd.get("minNights")) || 1),
    appliesTo: (["rooms", "services"].includes(applies) ? applies : "all") as "all" | "rooms" | "services",
    roomIds: fd.getAll("roomIds").map((x) => Number(x)).filter((x) => Number.isInteger(x) && x > 0).slice(0, 200),
    validFrom: ISO.test(validFrom) ? validFrom : null,
    validTo: ISO.test(validTo) ? validTo : null,
    maxUses: Math.max(0, num(fd.get("maxUses"))),
    isPublic: fd.get("isPublic") === "on",
    isActive: fd.get("isActive") === "on",
    sortOrder: num(fd.get("sortOrder")),
  };
  try {
    if (id) await db.update(promotions).set(data).where(eq(promotions.id, id));
    else await db.insert(promotions).values(data);
  } catch {
    return { error: "این کد تخفیف قبلاً تعریف شده است." };
  }
  done();
  return { ok: true, message: id ? "پیشنهاد ویرایش شد." : "کد تخفیف جدید ایجاد شد." };
}

export async function togglePromotion(id: number, isActive: boolean) {
  await requireAdmin();
  await db.update(promotions).set({ isActive }).where(eq(promotions.id, id));
  done();
}

export async function deletePromotion(id: number) {
  await requireAdmin();
  await db.delete(promotions).where(eq(promotions.id, id));
  done();
}

/* ---------------- FAQ ---------------- */
export async function saveFaq(_p: ExtrasState, fd: FormData): Promise<ExtrasState> {
  await requireAdmin();
  const id = num(fd.get("id"));
  const question = cleanText(fd.get("question"), 300);
  const answer = cleanText(fd.get("answer"), 3000);
  if (question.length < 4 || answer.length < 2) return { error: "پرسش و پاسخ را کامل وارد کنید." };
  const data = { question, answer, category: cleanText(fd.get("category"), 60) || "عمومی", sortOrder: num(fd.get("sortOrder")), isActive: fd.get("isActive") === "on" };
  if (id) await db.update(faqs).set(data).where(eq(faqs.id, id));
  else await db.insert(faqs).values(data);
  done();
  return { ok: true, message: "پرسش ذخیره شد." };
}

export async function deleteFaq(id: number) {
  await requireAdmin();
  await db.delete(faqs).where(eq(faqs.id, id));
  done();
}

/* ---------------- gallery ---------------- */
export async function addGalleryItems(urls: string[], category: string): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  const list = urls.map((u) => safeUrl(u)).filter(Boolean).slice(0, 50);
  if (!list.length) return { ok: false, message: "تصویری انتخاب نشده است." };
  const cat = cleanText(category, 60) || "هتل";
  const max = await db.select({ s: galleryItems.sortOrder }).from(galleryItems);
  const base = max.reduce((m, r) => Math.max(m, r.s), 0) + 1;
  await db.insert(galleryItems).values(list.map((url, i) => ({ url, category: cat, sortOrder: base + i })));
  done();
  return { ok: true, message: `${list.length} تصویر به گالری اضافه شد.` };
}

export async function saveGalleryItems(items: { id: number; caption: string; category: string; sortOrder: number; isActive: boolean }[]): Promise<{ ok: boolean; message: string }> {
  await requireAdmin();
  for (const it of items.slice(0, 500)) {
    await db
      .update(galleryItems)
      .set({ caption: cleanText(it.caption, 160), category: cleanText(it.category, 60) || "هتل", sortOrder: Math.round(Number(it.sortOrder) || 0), isActive: !!it.isActive })
      .where(eq(galleryItems.id, Number(it.id)));
  }
  done();
  return { ok: true, message: "گالری ذخیره شد." };
}

export async function deleteGalleryItems(ids: number[]) {
  await requireAdmin();
  const list = ids.map(Number).filter((x) => Number.isInteger(x));
  if (list.length) await db.delete(galleryItems).where(inArray(galleryItems.id, list));
  done();
}

/* ---------------- review moderation ---------------- */
export async function setTestimonialApproved(id: number, isApproved: boolean) {
  await requireAdmin();
  await db.update(testimonials).set({ isApproved }).where(eq(testimonials.id, id));
  revalidatePath("/admin", "layout");
  done();
}
