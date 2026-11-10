import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { getFacilities, getGallery, getPoolSlots, getSettings } from "@/lib/data";
import { formatMoney, toFa } from "@/lib/format";
import { FAQ_ITEMS } from "@/lib/page-content";
import { POOL_RULES } from "@/lib/constants";
import { hasDining } from "@/lib/modules";
import SmartImage from "@/components/site/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "استخر خانوادگی",
  description: "رزرو سانس خصوصی استخر سرپوشیده خانوادگی هتل کاج با آب گرم، جکوزی و سونای خشک.",
};

export default async function PoolPage() {
  const [settings, facilities, gallery, slots] = await Promise.all([
    getSettings(),
    getFacilities(),
    getGallery(),
    getPoolSlots(),
  ]);
  if (!settings.modulePool) {
    const dining = hasDining({
      pool: false,
      restaurant: settings.moduleRestaurant,
      cafe: settings.moduleCafe,
      spa: settings.moduleSpa,
    });
    return (
      <section className="container-x py-16">
        <div className="glass mx-auto max-w-xl rounded-2xl p-6 text-center">
          <span className="text-3xl">🏊</span>
          <h1 className="mt-3 text-xl font-black text-forest-950">این هتل استخر ندارد</h1>
          <p className="mt-2 text-[12px] leading-7 text-forest-800/65">
            {settings.hotelName} بدون استخر طراحی شده است؛ به‌جای آن می‌توانید از کافه‑‑رستوران و فضاهای رفاهی هتل
            استفاده کنید. برای دیدن امکانات موجود به صفحه‌های زیر سر بزنید.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href="/facilities" className="btn btn-primary btn-sm">
              امکانات هتل
            </Link>
            {dining ? (
              <Link href="/dining" className="btn btn-gold btn-sm">
                کافه و رستوران
              </Link>
            ) : null}
            <Link href="/contact" className="btn btn-ghost btn-sm">
              تماس با پذیرش
            </Link>
          </div>
        </div>
      </section>
    );
  }
  const pool = facilities.find((facility) => facility.slug === "family-pool");
  const poolImages = gallery.filter((item) => item.category === "استخر").slice(0, 3);
  const poolRules = settings.poolRules?.length ? settings.poolRules : POOL_RULES;
  const minPrice = slots.length ? Math.min(...slots.map((slot) => slot.price)) : settings.poolPrice;

  return (
    <>
      <PageHero
        kicker="فقط برای خانواده شما"
        title={settings.poolTitle}
        description={settings.poolDescription}
        image={settings.poolImage}
      >
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/booking?service=pool" className="btn btn-gold btn-sm">
            رزرو سانس استخر
          </Link>
          <span className="neu-pill">
            سانس‌ها از {formatMoney(minPrice)}
          </span>
        </div>
      </PageHero>

      <section className="container-x py-14">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
          <div className="space-y-5">
            <SectionHeading
              align="start"
              kicker="تجربه استخر کاج"
              title="آب گرم، محیط خصوصی، خیالی آسوده"
              description="استخر سرپوشیده کاج با عمق متغیر از ۴۰ سانتی‌متر تا ۱۶۰ سانتی‌متر، بخش کم‌عمق اختصاصی کودکان، جکوزی و سونای خشک طراحی شده است. هر سانس سه ساعته و کاملاً خصوصی برای یک خانواده رزرو می‌شود."
            />
            <div className="overflow-hidden rounded-[2rem] shadow-card">
              {settings.poolMediaType === "video" && settings.poolVideoUrl ? (
                <video
                  key={settings.poolVideoUrl}
                  className="aspect-video w-full object-cover"
                  src={settings.poolVideoUrl}
                  poster={settings.poolVideoPoster || settings.poolImage}
                  controls
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
              ) : settings.poolMediaType === "gif" && settings.poolVideoUrl ? (
                <SmartImage src={settings.poolVideoUrl} alt={settings.poolTitle} className="aspect-video w-full object-cover" />
              ) : (
                <SmartImage src={settings.poolImage} alt={settings.poolTitle} className="aspect-video w-full object-cover" />
              )}
            </div>
            {pool ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {pool.features.map((feature) => (
                  <div key={feature} className="glass-soft flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs text-forest-800/80">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-50 text-[10px] text-forest-700">✓</span>
                    {feature}
                  </div>
                ))}
              </div>
            ) : null}
            {poolImages.length ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {poolImages.map((image) => (
                  <SmartImage
                    key={image.id}
                    src={image.imageUrl}
                    alt={image.title}
                    loading="lazy"
                    className="aspect-[4/3] w-full rounded-2xl object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="panel space-y-4 p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-forest-950">سانس‌ها و قیمت‌ها</h2>
                <span className="badge-plain bg-forest-50 text-[10px] text-forest-700">۳ ساعته</span>
              </div>
              <div className="space-y-2">
                {slots.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-cream-300 p-4 text-center text-[11px] text-forest-800/55">
                    سانس فعالی ثبت نشده است؛ لطفاً با پذیرش تماس بگیرید.
                  </p>
                ) : (
                  slots.map((slot) => (
                    <div key={slot.id} className="rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-forest-950">{slot.label}</span>
                        <span className="text-[11px] font-black text-gold-600">{formatMoney(slot.price)}</span>
                      </div>
                      <p className="mt-1 text-[10px] leading-5 text-forest-800/55">
                        ظرفیت پایه {toFa(slot.capacity)} نفر · هر نفر اضافه {formatMoney(slot.extraGuestFee)}
                      </p>
                      {slot.description ? (
                        <p className="text-[10px] leading-5 text-forest-800/40">{slot.description}</p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
              <div className="neu-inset rounded-2xl p-4">
                <p className="text-[10px] text-forest-800/55">هزینه سانس‌ها از</p>
                <p className="text-xl font-black text-forest-800">{formatMoney(minPrice)}</p>
                <p className="mt-1 text-[10px] leading-5 text-forest-800/55">
                  پیش‌پرداخت ۳۰٪ · ظرفیت پایه {toFa(settings.poolBaseCapacity)} نفر و حداکثر {toFa(settings.poolMaxCapacity)} نفر
                  · هزینه هر نفر اضافه {formatMoney(settings.extraGuestFee)}
                </p>
              </div>
              <Link href="/booking?service=pool" className="btn btn-primary w-full">
                درخواست رزرو استخر
              </Link>
              <p className="text-center text-[10px] leading-5 text-forest-800/45">
                کد رزرو پس از تأیید پذیرش صادر می‌شود؛ تا آن زمان سانس شما قطعی نیست.
              </p>
            </div>
            <div className="panel space-y-2 p-5">
              <h3 className="text-sm font-extrabold text-forest-950">قوانین استفاده</h3>
              <ul className="space-y-1.5">
                {poolRules.map((rule) => (
                  <li key={rule} className="flex gap-2 text-[11px] leading-5 text-forest-800/70">
                    <span className="text-gold-600">•</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      <section className="py-14">
        <div className="container-x space-y-5">
          <SectionHeading kicker="پرسش‌های متداول" title="سوالات رایج درباره استخر و رزرو" />
          <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="collapse collapse-arrow rounded-2xl border border-cream-200 bg-cream-50">
                <summary className="collapse-title min-h-0 py-3.5 text-xs font-bold text-forest-950">{item.question}</summary>
                <div className="collapse-content">
                  <p className="text-[11px] leading-6 text-forest-800/65">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
