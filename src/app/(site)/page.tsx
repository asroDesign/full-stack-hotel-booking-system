import Link from "next/link";
import HeroMedia from "@/components/site/HeroMedia";
import SmartImage from "@/components/site/SmartImage";
import QuickSearch from "@/components/site/QuickSearch";
import MapPanel from "@/components/site/MapPanel";
import RoomCard from "@/components/site/RoomCard";
import { SectionHeading, Stars } from "@/components/site/ui";
import {
  getActivePromos,
  getEvents,
  getFacilities,
  getGuestReviews,
  getOffers,
  getReviewSummary,
  getRooms,
  getSettings,
} from "@/lib/data";
import { hasDining, modulesFromSettings, starWord } from "@/lib/modules";
import { formatJalali, formatMoney, toFa, todayISO } from "@/lib/format";

export const dynamic = "force-dynamic";

const BENEFITS = [
  { icon: "★", title: "خدمات چهارستاره", desc: "اتاق‌های آرام و تیم حرفه‌ای" },
  { icon: "🍽", title: "کافه‑رستوران کاج", desc: "صبحانه محلی و منوی شیرازی" },
  { icon: "🛎", title: "کانسیرژ ۲۴ ساعته", desc: "ترانسفر، تور و اسپا" },
  { icon: "🎁", title: "رزرو مستقیم", desc: "بدون کمیسیون و واسطه" },
];

const JUMP = [
  { href: "#rooms", label: "اتاق‌ها" },
  { href: "#offers", label: "پیشنهادهای ویژه" },
  { href: "#experience", label: "کافه و اسپا" },
  { href: "#reviews", label: "نظرات مهمانان" },
  { href: "#location", label: "موقعیت هتل" },
];

export default async function HomePage() {
  const [settings, allRooms, offers, events, reviewSummary, guestReviews, facilities, promos] = await Promise.all([
    getSettings(),
    getRooms(),
    getOffers({ limit: 3 }),
    getEvents({ limit: 3 }),
    getReviewSummary(),
    getGuestReviews({ limit: 3 }),
    getFacilities(),
    getActivePromos(),
  ]);

  const modules = modulesFromSettings(settings);
  const dining = hasDining(modules);
  const featured = allRooms.filter((room) => room.featured);
  const rooms = (featured.length >= 3 ? featured : allRooms).slice(0, 4);
  const minPrice = allRooms.length ? Math.min(...allRooms.map((room) => room.pricePerNight)) : 0;
  const restaurant = facilities.find((facility) => facility.slug === "restaurant");
  const spa = facilities.find((facility) => facility.slug.includes("spa") || facility.title.includes("اسپا"));
  const upcomingEvents = events.filter((event) => event.startsAt >= todayISO()).slice(0, 3);
  const reviews = guestReviews.slice(0, 2);

  return (
    <>
      {/* ================= IMMERSIVE HERO ================= */}
      <section className="container-x pt-3 sm:pt-5">
        <div className="relative isolate overflow-hidden rounded-[1.6rem] border border-gold-400/25 bg-[#0b3b33]">
          <HeroMedia
            mediaType={settings.heroMediaType}
            imageUrl={settings.heroImage}
            videoUrl={settings.heroVideoUrl}
            alt={settings.hotelName}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04120f]/95 via-[#04120f]/55 to-[#04120f]/25" aria-hidden="true" />

          <div className="relative z-10 flex min-h-[480px] flex-col justify-end px-5 pb-6 pt-24 sm:min-h-[560px] sm:px-8 sm:pb-8 lg:min-h-[600px]">
            <div className="max-w-2xl space-y-3 sm:space-y-4">
              <span className="eyebrow-light">{starWord(settings.starRating)} · {settings.city}</span>
              <h1 className="editorial-title text-[2rem] leading-[1.25] text-cream-50 sm:text-4xl lg:text-[3.2rem]">
                {settings.heroTitle}
              </h1>
              <p className="max-w-xl text-[12px] leading-7 text-cream-100/75 sm:text-[13px]">{settings.heroSubtitle}</p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Link href="/booking" className="btn btn-gold">
                  رزرو اقامت
                  <span aria-hidden="true">←</span>
                </Link>
                <Link href="/offers" className="btn btn-outline">
                  پیشنهادهای ویژه
                </Link>
                {dining ? (
                  <Link href="/dining" className="btn btn-outline hidden sm:inline-flex">
                    منوی کافه
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-[10px] text-cream-100/70">
                <span className="flex items-center gap-1.5">
                  <Stars rating={Math.round(Number(settings.statRating) || 5)} />
                  <b className="text-cream-50">{settings.statRating}</b> از {toFa(settings.statRatingCount)} نظر
                </span>
                <span className="hidden h-3 w-px bg-white/20 sm:block" />
                <span>{toFa(settings.totalRooms)} اتاق و سوئیت</span>
                <span className="hidden h-3 w-px bg-white/20 sm:block" />
                <span>شروع از <b className="text-gold-300">{formatMoney(minPrice)}</b></span>
              </div>
            </div>
          </div>

          {/* booking dock (in-flow so it never covers hero copy on small screens) */}
          <div className="relative z-10 px-3 pb-3 sm:px-6 sm:pb-5">
            <div className="rounded-xl border border-white/60 bg-[#fffdf8] p-3 shadow-card sm:p-4">
              <div className="grid gap-2.5 lg:grid-cols-[1fr_2.3fr] lg:items-center">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold-700">رزرو مستقیم</p>
                  <p className="text-[12px] font-black text-forest-950">تاریخ اقامت را انتخاب کنید</p>
                  <p className="hidden text-[9px] text-forest-800/50 sm:block">پیش‌پرداخت ۳۰٪ · تأیید پذیرش · کد رزرو</p>
                </div>
                <QuickSearch />
              </div>
            </div>
          </div>
        </div>

        {/* jump navigation */}
        <nav className="no-scrollbar -mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="دسترسی به بخش‌های صفحه">
          {JUMP.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-full border border-forest-800/15 bg-white/55 px-3 py-1.5 text-[10px] font-bold text-forest-800/75 transition hover:border-gold-400 hover:text-forest-950"
            >
              {item.label}
            </a>
          ))}
          <Link href="/reviews" className="whitespace-nowrap rounded-full border border-forest-800/15 bg-white/55 px-3 py-1.5 text-[10px] font-bold text-forest-800/75">
            نظر ثبت کنید
          </Link>
        </nav>
      </section>

      {/* ================= BENEFITS ================= */}
      <section className="container-x cv-auto-sm pt-5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BENEFITS.map((item) => (
            <div key={item.title} className="flex items-center gap-2.5 rounded-xl border border-white/70 bg-white/45 px-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0b3b33] text-sm text-gold-300">{item.icon}</span>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-black text-forest-950">{item.title}</p>
                <p className="truncate text-[8px] text-forest-800/50">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= ROOMS · HORIZONTAL ================= */}
      <section id="rooms" className="scroll-mt-24 py-8">
        <div className="container-x mb-4 flex flex-wrap items-end justify-between gap-2">
          <SectionHeading
            align="start"
            kicker="اتاق‌ها و سوئیت‌ها"
            title="اقامت خود را انتخاب کنید"
            description="نرخ شفاف هر شب، ظرفیت مشخص و امکان افزودن صبحانه یا وعده غذا."
          />
          <Link href="/rooms" className="btn btn-ghost btn-sm">
            همه {toFa(allRooms.length)} اتاق
          </Link>
        </div>
        <div className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
          {rooms.map((room) => (
            <div key={room.id} className="w-[86%] shrink-0 snap-start sm:w-[46%] lg:w-[31%] xl:w-[24%]">
              <RoomCard room={room} />
            </div>
          ))}
          <Link
            href="/rooms"
            className="flex w-[70%] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-3xl border border-gold-300/40 bg-[#0b3b33] p-6 text-center sm:w-[30%] lg:w-[20%]"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-gold-300/50 text-lg text-gold-300">←</span>
            <span className="text-[12px] font-black text-cream-50">همه اتاق‌ها</span>
            <span className="text-[9px] text-cream-200/60">مقایسه نرخ و امکانات</span>
          </Link>
        </div>
        <p className="container-x text-[9px] text-forest-900/45">برای دیدن اتاق‌های بیشتر، کارت‌ها را به چپ و راست بکشید ↔</p>
      </section>

      {/* ================= OFFERS ================= */}
      {offers.length ? (
        <section id="offers" className="container-x scroll-mt-24 py-6">
          <div className="rounded-2xl border border-gold-300/40 bg-[#0b3b33] p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold-300">پکیج‌های ویژه</span>
                <h2 className="mt-1 text-xl font-black text-cream-50 sm:text-2xl">اقامت + تجربه، با قیمت بهتر</h2>
              </div>
              <Link href="/offers" className="btn btn-outline btn-sm">
                همه پیشنهادها
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((offer) => {
                const discount =
                  offer.oldPrice > offer.price && offer.oldPrice > 0
                    ? Math.round(((offer.oldPrice - offer.price) / offer.oldPrice) * 100)
                    : 0;
                return (
                  <article key={offer.id} className="flex h-full flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded bg-gold-400 px-2 py-0.5 text-[8px] font-black text-[#1d1a10]">{offer.badge}</span>
                      {discount > 0 ? <span className="text-[9px] font-bold text-gold-300">{toFa(discount)}٪ تخفیف</span> : null}
                    </div>
                    <h3 className="text-[12px] font-black text-cream-50">{offer.title}</h3>
                    <p className="line-clamp-2 text-[9px] leading-5 text-cream-200/60">{offer.description}</p>
                    <div className="mt-auto flex items-end justify-between border-t border-white/10 pt-2.5">
                      <div>
                        {offer.oldPrice > offer.price ? <p className="text-[8px] text-cream-200/35 line-through">{formatMoney(offer.oldPrice)}</p> : null}
                        <p className="text-[12px] font-black text-gold-300">{formatMoney(offer.price)}</p>
                      </div>
                      <Link href={`/booking${offer.roomId ? `?service=room&roomId=${offer.roomId}` : ""}`} className="btn btn-gold btn-sm">
                        رزرو
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
            {promos.length ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                <span className="text-[9px] font-bold text-gold-300">کد تخفیف:</span>
                {promos.map((promo) => (
                  <span key={promo.id} className="rounded border border-gold-400/30 px-2 py-0.5 text-[9px] text-cream-100/80">
                    <span dir="ltr" className="font-mono font-bold text-gold-200">{promo.code}</span>
                    <span className="mx-1 text-cream-200/40">·</span>
                    {promo.label || (promo.kind === "percent" ? `${toFa(promo.value)}٪` : formatMoney(promo.value))}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ================= EXPERIENCE ================= */}
      <section id="experience" className="container-x scroll-mt-24 py-6">
        <div className="mb-4">
          <SectionHeading kicker="تجربه‌های اقامت" title="کافه، اسپا و کانسیرژ در یک مجموعه" description="هر بخش از هتل برای یک تجربه جداگانه طراحی شده است." />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {dining ? (
            <Link href="/dining" className="group relative flex min-h-[220px] flex-col justify-end overflow-hidden rounded-2xl border border-white/70">
              <SmartImage
                src={settings.diningImage || restaurant?.imageUrl || settings.heroImage}
                alt={settings.diningTitle}
                maxWidth={820}
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#04120f]/90 via-[#04120f]/25 to-transparent" />
              <div className="relative z-10 space-y-1 p-5">
                <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-gold-300">کافه و رستوران</span>
                <p className="text-base font-black text-cream-50">{settings.diningTitle}</p>
                <p className="text-[9px] text-cream-200/65">🕒 {settings.diningHours} · رزرو میز</p>
              </div>
            </Link>
          ) : null}

          <div className="grid gap-3">
            {spa ? (
              <Link href="/facilities" className="group relative flex min-h-[110px] items-end overflow-hidden rounded-2xl border border-white/70">
                <SmartImage src={spa.imageUrl || settings.aboutImage} alt={spa.title} maxWidth={720} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04120f]/85 to-transparent" />
                <div className="relative z-10 flex w-full items-center justify-between p-4">
                  <span className="text-[11px] font-black text-cream-50">اسپا و سلامتی</span>
                  <span className="text-[9px] text-gold-200">جزئیات ←</span>
                </div>
              </Link>
            ) : null}
            <Link href="/concierge" className="flex items-center justify-between gap-2 rounded-2xl border border-gold-300/40 bg-[#f2eadb] p-4">
              <div>
                <p className="text-[11px] font-black text-forest-950">کانسیرژ کاج</p>
                <p className="text-[9px] text-forest-800/55">ترانسفر فرودگاه، تور، رزرو میز و مناسبت‌ها</p>
              </div>
              <span className="text-gold-700">←</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= REVIEWS + EVENTS ================= */}
      <section id="reviews" className="container-x scroll-mt-24 py-6">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-white/70 bg-white/55 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold-700">تجربه مهمانان</span>
                <p className="mt-1 text-2xl font-black text-forest-950">
                  {toFa(reviewSummary.average)}<span className="text-sm text-forest-800/40"> / ۵</span>
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <Stars rating={Math.round(reviewSummary.average)} />
                  <span className="text-[9px] text-forest-800/50">{toFa(reviewSummary.total)} نظر تأییدشده</span>
                </div>
              </div>
              <Link href="/reviews" className="btn btn-ghost btn-sm">همه نظرات</Link>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {reviews.length ? (
                reviews.map((review) => (
                  <figure key={review.id} className="rounded-xl border border-white/70 bg-white/60 p-3">
                    <Stars rating={review.rating} />
                    <blockquote className="mt-1 line-clamp-3 text-[9px] leading-5 text-forest-800/70">«{review.comment}»</blockquote>
                    <figcaption className="mt-1.5 truncate text-[9px] font-bold text-forest-900">
                      {review.guestName}
                      {review.city ? <span className="font-normal text-forest-800/45"> · {review.city}</span> : null}
                    </figcaption>
                  </figure>
                ))
              ) : (
                <p className="text-[10px] text-forest-800/55">هنوز نظری ثبت نشده است؛ اولین نفر باشید.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/55 p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-[13px] font-black text-forest-950">رویدادهای پیش‌رو</h2>
              <Link href="/events" className="text-[10px] font-bold text-forest-800 underline-offset-4 hover:underline">همه ←</Link>
            </div>
            <div className="space-y-1.5">
              {upcomingEvents.length ? (
                upcomingEvents.map((event) => (
                  <Link key={event.id} href="/events" className="flex items-center justify-between gap-2 rounded-lg border border-white/70 px-2.5 py-2 transition hover:bg-white/70">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-forest-950">{event.title}</p>
                      <p className="text-[8px] text-forest-800/50">{event.timeLabel} · {event.location}</p>
                    </div>
                    <span className="whitespace-nowrap rounded bg-[#0b3b33] px-2 py-0.5 text-[8px] font-bold text-gold-200">{formatJalali(event.startsAt)}</span>
                  </Link>
                ))
              ) : (
                <p className="text-[10px] text-forest-800/55">رویداد جدیدی ثبت نشده است.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ================= LOCATION ================= */}
      <section id="location" className="container-x scroll-mt-24 py-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr] lg:items-start">
          <div className="space-y-3">
            <SectionHeading align="start" kicker="موقعیت و تماس" title="کجای شیراز هستیم؟" description={settings.mapDescription} />
            <div className="space-y-1.5 text-[10px]">
              <p className="rounded-lg border border-white/70 bg-white/55 px-3 py-2">📍 {settings.address}</p>
              <p dir="ltr" className="rounded-lg border border-white/70 bg-white/55 px-3 py-2">☎ {settings.phone}</p>
              <p className="rounded-lg border border-white/70 bg-white/55 px-3 py-2">🕒 ورود {settings.checkInTime} · تخلیه {settings.checkOutTime}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/booking" className="btn btn-gold btn-sm">رزرو اقامت</Link>
              <Link href="/concierge" className="btn btn-ghost btn-sm">کانسیرژ</Link>
              <Link href="/contact" className="btn btn-ghost btn-sm">تماس</Link>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/70">
            <MapPanel settings={{ mapLat: settings.mapLat, mapLng: settings.mapLng, mapAddress: settings.mapAddress, address: settings.address }} compact />
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="container-x cv-auto-sm pb-10">
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-gold-300/40 bg-[#0b3b33] p-5 text-center sm:flex-row sm:text-start">
          <div>
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold-300">{starWord(settings.starRating)} · {settings.city}</span>
            <p className="mt-1 text-lg font-black text-cream-50">{settings.ctaTitle}</p>
            <p className="mt-1 max-w-xl text-[10px] leading-5 text-cream-200/60">{settings.ctaDescription}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/booking" className="btn btn-gold">ثبت درخواست رزرو</Link>
            <a href={settings.whatsappLink || "#"} target="_blank" rel="noreferrer" className="btn btn-outline">واتس‌اپ</a>
          </div>
        </div>
      </section>
    </>
  );
}
