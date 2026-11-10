import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, EmptyState } from "@/components/site/ui";
import Reveal from "@/components/site/Reveal";
import { getEvents, getSettings } from "@/lib/data";
import { formatJalali, formatMoney, todayISO, toFa } from "@/lib/format";
import SmartImage from "@/components/site/SmartImage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "رویدادها و تجربه‌های هتل",
  description: "موسیقی زنده، شام سرآشپز، کارگاه و تورهای هتل کاج.",
};

export default async function EventsPage() {
  const [settings, allEvents] = await Promise.all([getSettings(), getEvents()]);
  const today = todayISO();
  const upcoming = allEvents.filter((event) => event.startsAt >= today);
  const past = allEvents.filter((event) => event.startsAt < today).slice(-4).reverse();

  return (
    <>
      <PageHero
        kicker="تقویم تجربه‌ها"
        title="رویدادهای هتل کاج"
        description="از موسیقی زنده در حیاط تا شام سرآشپز و تور بافت تاریخی؛ برنامه‌های هتل را از دست ندهید."
        image={settings.diningImage || settings.heroImage}
        breadcrumb={[{ label: "رویدادها" }]}
      />

      <section className="container-x py-8">
        {upcoming.length === 0 ? (
          <EmptyState
            icon="🎶"
            title="رویداد آینده‌ای ثبت نشده"
            description="به‌زودی برنامه‌های جدید اعلام می‌شود؛ در خبرنامه عضو شوید."
            action={<Link href="/concierge" className="btn btn-primary btn-sm">درخواست اطلاع‌رسانی</Link>}
          />
        ) : (
          <div className="space-y-4">
            {upcoming.map((event, index) => (
              <Reveal key={event.id} delay={index * 50}>
                <article className="glass grid gap-0 overflow-hidden rounded-[1.6rem] md:grid-cols-[240px_1fr]">
                  <div className="glass-img m-3 md:me-0">
                    <SmartImage src={event.imageUrl || settings.heroImage} alt={event.title} loading="lazy" className="h-40 w-full object-cover md:h-full" />
                  </div>
                  <div className="flex flex-col gap-2 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="glass-pill">{event.category}</span>
                      <span className="text-[10px] font-bold text-forest-800">
                        {formatJalali(event.startsAt, true)}
                        {event.endDate ? ` تا ${formatJalali(event.endDate)}` : ""}
                      </span>
                      {event.featured ? <span className="glass-pill !text-gold-700">⭐ شاخص</span> : null}
                    </div>
                    <h2 className="text-base font-black text-forest-950">{event.title}</h2>
                    <p className="line-clamp-2 text-[10px] leading-5 text-forest-900/55">{event.description}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-3 text-[10px] text-forest-900/60">
                      {event.timeLabel ? <span>🕒 {event.timeLabel}</span> : null}
                      {event.location ? <span>📍 {event.location}</span> : null}
                      {event.capacity ? <span>👥 ظرفیت {toFa(event.capacity)} نفر</span> : null}
                      <span className="font-bold text-forest-800">{event.price > 0 ? `ورودی ${formatMoney(event.price)}` : "رایگان برای مهمانان"}</span>
                      <Link href="/contact" className="ms-auto text-[10px] font-bold text-forest-800 underline-offset-4 hover:underline">
                        هماهنگی حضور ←
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      {past.length ? (
        <section className="container-x pb-10">
          <p className="glass-pill mb-3">برگزارشده‌های اخیر</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {past.map((event) => (
              <div key={event.id} className="glass-soft rounded-2xl p-3">
                <p className="text-[10px] font-bold text-forest-950">{event.title}</p>
                <p className="text-[9px] text-forest-900/50">{formatJalali(event.startsAt)}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
