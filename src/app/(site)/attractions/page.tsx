import type { Metadata } from "next";
import Link from "next/link";
import MapPanel from "@/components/site/MapPanel";
import Reveal from "@/components/site/Reveal";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { getAttractions, getSettings } from "@/lib/data";
import { toFa } from "@/lib/format";
import SmartImage from "@/components/site/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "جاذبه‌های گردشگری اطراف",
  description: "پارک ملی گلستان، آبشار لوه، برج قابوس، تالاب گمیشان و جزیره آشوراده؛ جاذبه‌های نزدیک هتل کاج.",
};

export default async function AttractionsPage() {
  const [attractions, settings] = await Promise.all([getAttractions(), getSettings()]);
  const categories = Array.from(new Set(attractions.map((item) => item.category)));

  return (
    <>
      <PageHero
        kicker="گلستان‌گردی"
        title="اطراف کاج پر از ماجراست"
        description="هتل کاج دروازه ورود به جاذبه‌های طبیعی و تاریخی گلستان است. تیم پذیرش می‌تواند تور یک‌روزه، راهنمای محلی و خودروی اختصاصی برای شما ترتیب دهد."
        image={attractions[0]?.imageUrl ?? settings.heroImage}
      >
        <div className="mt-2 flex flex-wrap gap-2">
          {categories.map((category) => (
            <span key={category} className="neu-pill">
              {category}
            </span>
          ))}
        </div>
      </PageHero>

      <section className="container-x py-14">
        <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div className="space-y-4">
            <SectionHeading
              align="start"
              kicker="نقشه گردشگری"
              title="موقعیت جاذبه‌ها نسبت به هتل"
              description="فاصله‌ها با خودروی شخصی محاسبه شده است. برای مسیریابی روی دکمه هر جاذبه بزنید."
            />
            <MapPanel settings={{ mapLat: settings.mapLat, mapLng: settings.mapLng, mapAddress: settings.mapAddress, address: settings.address }} compact />
            <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 text-[11px] leading-6 text-gold-700">
              <p className="font-bold">🚐 تور یک‌روزه کاج</p>
              <p className="mt-1">
                تور بازدید از پارک ملی گلستان و آبشار لوه، هر روز صبح با راهنمای محلی و ناهار محلی برگزار می‌شود. برای
                رزرو با پذیرش تماس بگیرید یا در فرم تماس درخواست خود را ثبت کنید.
              </p>
              <Link href="/contact" className="mt-2 inline-block font-bold underline underline-offset-4">
                درخواست تور
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {attractions.map((attraction, index) => (
              <Reveal key={attraction.id} delay={index * 40}>
                <article className="group flex gap-3 overflow-hidden glass rounded-2xl p-2.5 transition hover:border-white/90">
                  <SmartImage
                    src={attraction.imageUrl}
                    alt={attraction.title}
                    loading="lazy"
                    className="h-24 w-28 shrink-0 rounded-xl object-cover transition duration-500 group-hover:scale-[1.02]"
                  />
                  <div className="flex flex-1 flex-col gap-1 py-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-extrabold text-forest-950">{attraction.title}</h3>
                      <span className="badge-plain bg-cream-100 text-[10px] text-forest-800/70">{attraction.category}</span>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-5 text-forest-800/60">{attraction.description}</p>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-[10px]">
                      <span className="text-forest-800/55">📍 {attraction.location} · {toFa(attraction.distanceKm)} کیلومتر</span>
                      {attraction.mapUrl ? (
                        <a
                          href={attraction.mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold text-forest-900 underline-offset-4 hover:text-gold-600 hover:underline"
                        >
                          مسیریابی ←
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="container-x py-10">
        <div className="neu-raised flex flex-col items-center gap-3 rounded-3xl p-6 text-center sm:p-8">
          <span className="neu-pill neu-pill-accent">اقامت خود را به یک سفر کامل تبدیل کنید</span>
          <h2 className="text-xl font-black text-forest-950">دو شب اقامت، یک روز گشت شیراز</h2>
          <p className="max-w-xl text-[11px] leading-6 text-forest-800/60">
            با رزرو اتاق در کاج، امکان استفاده از تور یک‌روزه پارک ملی گلستان با ۱۵٪ تخفیف برای مهمانان هتل فراهم است.
          </p>
          <Link href="/booking" className="btn btn-gold btn-sm mt-1">
            رزرو اقامت
          </Link>
        </div>
      </section>
    </>
  );
}
