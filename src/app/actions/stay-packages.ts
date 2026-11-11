"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { reservations, stayPackages } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText, safeUrl } from "@/lib/security";
import { linesToArray, toEnDigits } from "@/lib/utils";

export type StayPackageState = { ok?: boolean; error?: string; message?: string } | null;
const number = (value: unknown) => Number(toEnDigits(String(value ?? "")).replace(/[,٬]/g, "")) || 0;
const refresh = () => {
  revalidatePath("/", "layout");
  revalidatePath("/admin/packages");
};

export async function saveStayPackage(_prev: StayPackageState, fd: FormData): Promise<StayPackageState> {
  await requireAdmin();
  const id = number(fd.get("id"));
  const slug = cleanText(fd.get("slug"), 80).toLowerCase();
  const title = cleanText(fd.get("title"), 120);
  const pricingMode = fd.get("pricingMode") === "fixed" ? "fixed" : "contact";
  const price = pricingMode === "fixed" ? number(fd.get("price")) : 0;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { error: "شناسهٔ انگلیسی باید فقط شامل حروف کوچک، عدد و خط تیره باشد." };
  if (title.length < 3) return { error: "عنوان بسته را کامل وارد کنید." };
  if (pricingMode === "fixed" && price < 1) return { error: "برای بستهٔ قیمت‌دار مبلغ معتبر وارد کنید." };
  const data = {
    slug,
    title,
    description: cleanText(fd.get("description"), 600),
    image: safeUrl(fd.get("image")),
    features: linesToArray(fd.get("features")).map((item) => cleanText(item, 160)).filter(Boolean).slice(0, 12),
    pricingMode: pricingMode as "fixed" | "contact",
    price,
    isActive: fd.get("isActive") === "on",
    sortOrder: number(fd.get("sortOrder")),
  };
  try {
    if (id) await db.update(stayPackages).set(data).where(eq(stayPackages.id, id));
    else await db.insert(stayPackages).values(data);
  } catch {
    return { error: "شناسهٔ این بسته قبلاً استفاده شده است." };
  }
  refresh();
  return { ok: true, message: id ? "بسته ویرایش شد." : "بستهٔ جدید ساخته شد." };
}

export async function deleteStayPackage(id: number) {
  await requireAdmin();
  await db.delete(stayPackages).where(eq(stayPackages.id, Number(id)));
  refresh();
}
