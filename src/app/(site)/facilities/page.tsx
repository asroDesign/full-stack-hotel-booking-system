import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/site/ui";
import Reveal from "@/components/site/Reveal";
import { getFacilities, getSettings } from "@/lib/data";
import { hasDining } from "@/lib/modules";
import { formatMoney, toFa } from "@/lib/format";
import { POOL_RULES } from "@/lib/constants";
import SmartImage from "@/components/site/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "امکانات و خدمات هتل",
  description: "کافه‑رستوران، صبحانه محلی، پارکینگ، روم‌سرویس و راهنمای گردشگری؛ امکانات هتل کاج.",
};

export default async function FacilitiesPage() {
  const [facilities, settings] = await Promise.all([getFacilities(), getSettings()]);
  const groups = Array.from(new Set(facilities.map((facility) => facility.category)));

  return (
    <>
      <PageHero
        kicker="امکانات و خدمات"
        title="امکاناتی که اقامت شما را آسان و دلپذیر می‌کند"
        description="از کافه‑رستوران و صبحانه محلی تا پارکینگ و روم‌سرویس؛ هر آنچه برای یک اقامت راحت در شیراز لازم دارید."
        image={settings.aboutImage}
      >
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/booking" className="btn btn-gold btn-sm">
            رزرو اتاق
          </Link>
          <Link href={settings.modulePool ? "/pool" : "/dining"} className="btn btn-outline btn-sm">
            {settings.modulePool ? "جزئیات استخر" : hasDining({ pool: false, restaurant: settings.moduleRestaurant, cafe: settings.moduleCafe, spa: settings.moduleSpa }) ? "کافه و رستوران" : "امکانات"}
          </Link>
        </div>
      </PageHero>

      <section className="container-x py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility, index) => (
            <Reveal key={facility.id} delay={index * 50}>
              <article
                id={facility.slug}
                className={`glass glass-hover group flex h-full flex-col overflow-hidden rounded-3xl transition ${
                  facility.highlight ? "border-gold-300" : "border-cream-200"
                }`}
              >
                <div className="relative h-44 overflow-hidden">
                  <SmartImage
                    src={facility.imageUrl}
                    alt={facility.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-forest-950/75 via-transparent to-transparent" />
                  <div className="absolute inset-x-3 top-3 flex items-center justify-between">
                    <span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-forest-900 backdrop-blur">
                      {facility.category}
                    </span>
                    {facility.highlight ? (
                      <span className="rounded-full bg-gold-400 px-2.5 py-1 text-[10px] font-bold text-forest-950">
                        ویژه
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute inset-x-3 bottom-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-lg">{facility.icon}</span>
                    <div>
                      <p className="text-sm font-extrabold text-white">{facility.title}</p>
                      <p className="text-[10px] text-cream-200/80">{facility.subtitle}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <p className="text-[11px] leading-6 text-forest-800/65">{facility.description}</p>
                  <ul className="mt-auto grid gap-1.5">
                    {facility.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-[11px] text-forest-800/75">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-forest-50 text-[9px] text-forest-700">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {settings.modulePool ? (
      <section id="pool" className="py-14">
        <div className="container-x grid items-center gap-8 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-[2rem] shadow-card">
            <SmartImage src={settings.poolImage} alt={settings.poolTitle} className="aspect-[4/3] w-full object-cover" loading="lazy" />
            <div className="absolute bottom-4 right-4 rounded-2xl bg-white/95 px-4 py-3 backdrop-blur">
              <p className="text-[10px] text-forest-800/60">هر سانس خصوصی</p>
              <p className="text-sm font-black text-forest-950">{formatMoney(settings.poolPrice)}</p>
            </div>
          </div>
          <div className="space-y-4">
            <SectionHeading
              align="start"
              kicker="امکان ویژه کاج"
              title={settings.poolTitle}
              description={settings.poolDescription}
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {(settings.poolRules?.length ? settings.poolRules : POOL_RULES).map((rule) => (
                <div key={rule} className="flex items-start gap-2 rounded-xl bg-cream-100 px-3 py-2 text-[11px] leading-5 text-forest-800/75">
                  <span className="text-gold-600">•</span>
                  {rule}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/booking?service=pool" className="btn btn-primary">
                رزرو سانس استخر
              </Link>
              <Link href="/pool" className="btn btn-ghost">
                قوانین و سانس‌ها
              </Link>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      <section className="container-x py-14">
        <div className="rounded-3xl border border-cream-200 bg-cream-100 p-6 sm:p-8">
          <h2 className="text-lg font-extrabold text-forest-950">دسته‌بندی خدمات</h2>
          <p className="mt-1 text-xs text-forest-800/60">{toFa(facilities.length)} خدمت فعال در {toFa(groups.length)} دسته</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {groups.map((group) => (
              <span key={group} className="glass-pill text-[11px] text-forest-800/75">
                {group}
                <b className="text-forest-900">{toFa(facilities.filter((f) => f.category === group).length)}</b>
              </span>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
