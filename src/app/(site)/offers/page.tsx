import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading, EmptyState } from "@/components/site/ui";
import Reveal from "@/components/site/Reveal";
import { getActivePromos, getOffers, getSettings } from "@/lib/data";
import { formatJalali, formatMoney, toFa } from "@/lib/format";
import SmartImage from "@/components/site/SmartImage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "پیشنهادها و پکیج‌های اقامت",
  description: "بسته‌های ویژه اقامت، اسپا و کافه‑رستوران با کدهای تخفیف اختصاصی.",
};

export default async function OffersPage() {
  const [settings, offers, promos] = await Promise.all([getSettings(), getOffers(), getActivePromos()]);

  return (
    <>
      <PageHero
        kicker="پیشنهادهای کاج"
        title="بسته‌هایی که سفر را کامل می‌کنند"
        description="اقامت + شام سرآشپز، اسپا و تور؛ با قیمت‌های ویژه و کدهای تخفیف محدود. پیشنهادها به‌صورت مستقیم قابل رزرو هستند."
        image={settings.heroImage}
        breadcrumb={[{ label: "پیشنهادها" }]}
      />

      {promos.length ? (
        <section className="container-x pt-6">
          <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-3.5">
            <span className="glass-pill">🏷️ کدهای تخفیف فعال</span>
            {promos.map((promo) => (
              <span key={promo.id} className="glass-soft rounded-xl px-3 py-1.5 text-[10px] font-bold text-forest-900">
                <span dir="ltr" className="font-mono text-forest-800">{promo.code}</span>
                <span className="mx-1.5 text-forest-900/50">·</span>
                {promo.label || (promo.kind === "percent" ? `${toFa(promo.value)}٪ تخفیف` : `${formatMoney(promo.value)} تخفیف`)}
                {promo.minNights > 1 ? <span className="text-forest-900/50"> (حداقل {toFa(promo.minNights)} شب)</span> : null}
              </span>
            ))}
            <span className="text-[9px] text-forest-900/45">کد را در مرحله پرداخت فرم رزرو وارد کنید.</span>
          </div>
        </section>
      ) : null}

      <section className="container-x py-8">
        {offers.length === 0 ? (
          <EmptyState
            icon="🎁"
            title="فعلاً پیشنهاد ویژه‌ای ثبت نشده"
            description="برای اطلاع از بسته‌های فصلی با پذیرش تماس بگیرید."
            action={<Link href="/booking" className="btn btn-primary btn-sm">رزرو اتاق</Link>}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {offers.map((offer, index) => {
              const discount = offer.oldPrice > offer.price && offer.oldPrice > 0
                ? Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)
                : 0;
              return (
                <Reveal key={offer.id} delay={index * 60}>
                  <article className="glass glass-hover flex h-full flex-col overflow-hidden rounded-[1.6rem] p-3">
                    <div className="glass-img relative h-48">
                      <SmartImage src={offer.imageUrl || settings.heroImage} alt={offer.title} loading="lazy" className="h-full w-full object-cover" />
                      <span className="absolute right-3 top-3 rounded-full bg-forest-900/85 px-2.5 py-1 text-[9px] font-bold text-cream-50 backdrop-blur">
                        {offer.badge}
                      </span>
                      {discount > 0 ? (
                        <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-2.5 py-1 text-[9px] font-black text-forest-950">
                          {toFa(discount)}٪ تخفیف
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 px-1.5 pb-1 pt-3">
                      <h2 className="text-sm font-black text-forest-950">{offer.title}</h2>
                      {offer.subtitle ? <p className="text-[10px] font-semibold text-forest-700">{offer.subtitle}</p> : null}
                      <p className="line-clamp-2 text-[10px] leading-5 text-forest-900/55">{offer.description}</p>
                      {offer.includes.length ? (
                        <ul className="space-y-1">
                          {offer.includes.slice(0, 4).map((item) => (
                            <li key={item} className="flex items-center gap-1.5 text-[10px] text-forest-900/60">
                              <span className="text-forest-600">✓</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <div className="mt-auto flex items-end justify-between border-t border-white/60 pt-3">
                        <div>
                          {offer.oldPrice > offer.price ? (
                            <p className="text-[9px] text-forest-900/40 line-through">{formatMoney(offer.oldPrice)}</p>
                          ) : null}
                          <p className="text-[13px] font-black text-forest-950">{formatMoney(offer.price)}</p>
                          {offer.validUntil ? (
                            <p className="text-[8px] text-forest-900/45">اعتبار تا {formatJalali(offer.validUntil)}</p>
                          ) : null}
                        </div>
                        <Link
                          href={`/booking?service=room${offer.roomId ? `&roomId=${offer.roomId}` : ""}`}
                          className="btn btn-gold btn-sm"
                        >
                          رزرو این بسته
                        </Link>
                      </div>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      <section className="container-x pb-10">
        <div className="glass-dark flex flex-col items-center justify-between gap-3 rounded-[1.6rem] p-6 text-center sm:flex-row sm:text-start">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-300">پیشنهاد اختصاصی</p>
            <p className="mt-1 text-lg font-black text-cream-50">اقامت طولانی‌تر، تخفیف بیشتر</p>
            <p className="text-[10px] text-cream-100/60">برای اقامت ۳ شب و بیشتر با پذیرش هماهنگ کنید و از تخفیف پله‌ای بهره‌مند شوید.</p>
          </div>
          <div className="flex gap-2">
            <Link href="/concierge" className="btn btn-gold btn-sm">درخواست پیشنهاد سفارشی</Link>
            <Link href="/contact" className="btn btn-outline btn-sm">تماس با پذیرش</Link>
          </div>
        </div>
      </section>
    </>
  );
}
