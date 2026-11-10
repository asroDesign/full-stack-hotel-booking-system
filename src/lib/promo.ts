import { todayISO } from "@/lib/format";
import { getPromoByCode } from "@/lib/data";
import type { PromoCode } from "@/db/schema";

export type PromoValidation = {
  ok: boolean;
  error?: string;
  promo?: PromoCode;
  discount: number;
};

export async function validatePromo(
  code: string | null | undefined,
  options: { subtotal: number; nights: number },
): Promise<PromoValidation> {
  const cleaned = (code ?? "").trim().toUpperCase();
  if (!cleaned) return { ok: false, discount: 0 };
  {
    const promo = await getPromoByCode(cleaned);
    if (!promo || !promo.active) return { ok: false, error: "کد تخفیف معتبر نیست.", discount: 0 };
    if (promo.expiresAt && promo.expiresAt < todayISO())
      return { ok: false, error: "مهلت این کد تخفیف به پایان رسیده است.", discount: 0 };
    if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses)
      return { ok: false, error: "ظرفیت استفاده از این کد تکمیل شده است.", discount: 0 };
    if (options.nights < promo.minNights)
      return { ok: false, error: `این کد برای اقامت ${promo.minNights} شب و بیشتر فعال است.`, discount: 0 };

    const rawDiscount = promo.kind === "percent" ? Math.round((options.subtotal * promo.value) / 100) : promo.value;
    const discount = Math.max(0, Math.min(rawDiscount, options.subtotal));
    if (discount <= 0) return { ok: false, error: "این کد برای این رزرو قابل استفاده نیست.", discount: 0 };
    return { ok: true, promo, discount };
  }
}
