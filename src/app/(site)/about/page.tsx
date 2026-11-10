import type { Metadata } from "next";
import Link from "next/link";
import MapPanel from "@/components/site/MapPanel";
import Reveal from "@/components/site/Reveal";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { getRooms, getSettings, getTestimonials } from "@/lib/data";
import { ABOUT_TIMELINE, ABOUT_VALUES } from "@/lib/page-content";
import { toFa } from "@/lib/format";
import { Stars } from "@/components/site/ui";
import SmartImage from "@/components/site/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "درباره ما",
  description: "داستان هتل کاج، ارزش‌های ما و کافه‑رستورانی که میزبان مهمانان است.",
};

export default async function AboutPage() {
  const [settings, rooms, testimonials] = await Promise.all([getSettings(), getRooms(), getTestimonials()]);
  const averageRating =
    testimonials.length > 0
      ? (testimonials.reduce((sum, item) => sum + item.rating, 0) / testimonials.length).toFixed(1)
      : "۵";

  return (
    <>
      <PageHero
        kicker="درباره ما"
        title={settings.aboutTitle}
        description={settings.tagline}
        image={settings.aboutImage}
      />

      <section className="container-x py-14">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <Reveal className="relative">
            <SmartImage
              src={settings.aboutImage}
              alt="فضای داخلی هتل کاج"
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-card"
              loading="lazy"
            />
            <div className="glass-strong absolute -bottom-5 left-4 grid grid-cols-3 gap-2 rounded-2xl p-3 sm:left-8">
              {[
                { value: toFa(rooms.length), label: "اتاق" },
                { value: "۴٫۸", label: "امتیاز" },
                { value: "۸", label: "سال تجربه" },
              ].map((stat) => (
                <div key={stat.label} className="px-2 text-center">
                  <p className="text-base font-black text-forest-900">{stat.value}</p>
                  <p className="text-[9px] text-forest-800/55">{stat.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={100} className="space-y-4">
            <SectionHeading align="start" kicker="داستان کاج" title="از یک خانه باغ تا هتل خانواده‌ها" />
            <p className="text-sm leading-8 text-forest-800/70">{settings.aboutText}</p>
            <p className="text-sm leading-8 text-forest-800/70">{settings.storyText}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href="/rooms" className="btn btn-primary">
                مشاهده اتاق‌ها
              </Link>
              <Link href="/contact" className="btn btn-ghost">
                گفتگو با پذیرش
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-14">
        <div className="container-x space-y-8">
          <SectionHeading kicker="مسیر ما" title="کاج در گذر زمان" description="هر سال یک قدم به تجربه‌ای بهتر برای مهمانان نزدیک‌تر شدیم." />
          <div className="relative mx-auto max-w-3xl">
            <span className="absolute right-[11px] top-2 h-[calc(100%-1rem)] w-px bg-cream-300" aria-hidden="true" />
            <div className="space-y-4">
              {ABOUT_TIMELINE.map((item, index) => (
                <Reveal key={item.year} delay={index * 70}>
                  <div className="relative pr-11">
                    <span className="absolute right-0 top-4 flex h-6 w-6 items-center justify-center rounded-full border-2 border-gold-400 bg-white">
                      <span className="h-2 w-2 rounded-full bg-gold-400" />
                    </span>
                    <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4 transition hover:border-gold-200 hover:bg-gold-50/40">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-gold-600">{item.year}</p>
                        <span className="text-[10px] text-forest-800/45">مرحله {toFa(index + 1)}</span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-forest-950">{item.title}</p>
                      <p className="mt-1 text-[11px] leading-6 text-forest-800/65">{item.text}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-14">
        <SectionHeading kicker="ارزش‌های ما" title="چرا مهمانان کاج را انتخاب می‌کنند" />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ABOUT_VALUES.map((value, index) => (
            <Reveal key={value.title} delay={index * 60}>
              <div className="glass h-full rounded-2xl p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-50 text-xl">{value.icon}</span>
                <p className="mt-3 text-sm font-extrabold text-forest-950">{value.title}</p>
                <p className="mt-1.5 text-[11px] leading-6 text-forest-800/65">{value.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="py-12">
        <div className="container-x grid gap-4 sm:grid-cols-3">
          {[
            { label: "میانگین رضایت مهمانان", value: `${toFa(averageRating)} از ۵`, icon: "⭐" },
            { label: "بیش از ۱٬۲۰۰ مهمان", value: "از ۱۸ استان", icon: "👨‍👩‍👧" },
            { label: "تیم میزبانی", value: "۲۸ نفر", icon: "🤝" },
          ].map((item) => (
            <div key={item.label} className="glass flex items-center gap-3 rounded-2xl p-4">
              <span className="text-2xl">{item.icon}</span>
              <div>
                <p className="text-sm font-black text-forest-950">{item.value}</p>
                <p className="text-[10px] text-forest-800/55">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="container-x py-14">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div className="space-y-4">
            <SectionHeading align="start" kicker="ما را پیدا کنید" title="آدرس و مسیر دسترسی" description={settings.address} />
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="glass-soft rounded-xl p-3">
                <p className="text-[10px] text-forest-800/50">تلفن پذیرش</p>
                <p dir="ltr" className="text-xs font-bold text-forest-950">{settings.phone}</p>
              </div>
              <div className="glass-soft rounded-xl p-3">
                <p className="text-[10px] text-forest-800/50">ایمیل</p>
                <p dir="ltr" className="text-xs font-bold text-forest-950">{settings.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-gold-200 bg-gold-50 p-4">
              <Stars rating={5} />
              <p className="text-[11px] text-gold-700">
                امتیاز {toFa(averageRating)} از ۵ بر اساس نظرات ثبت‌شده مهمانان
              </p>
            </div>
          </div>
          <MapPanel settings={settings} compact />
        </div>
      </section>
    </>
  );
}
