import { Img } from "@/components/img";
import Link from "next/link";
import { ArrowLeft, Star, MapPin, Phone, Mail, Clock, Navigation, CalendarCheck, Sparkles, ArrowDown } from "lucide-react";
import { faNum, formatPrice } from "@/lib/utils";
import { minServicePrice } from "@/lib/booking";
import { venueKindLabel } from "@/lib/dining";
import { StaySearch } from "@/components/site/stay-search";
import { TrackSection } from "@/components/site/booking-sections";
import { OfferCard, FaqList } from "@/components/site/extras-sections";
import { GalleryGrid, WeatherWidget } from "@/components/site/extras-client";
import { CountUp, DiningHover, MobileDock, RevealRoot, ReviewCarousel, RoomAccordion, RotatingWords, ScrollProgress } from "@/components/site/opus-client";
import { DynIcon } from "@/components/dyn-icon";
import { MapView } from "@/components/map-view";
import { MediaPlaylist } from "@/components/media-playlist";
import { cn } from "@/lib/utils";
import { visibleSections, type HomeData } from "./data";

function Chapter({ n, eyebrow, title, desc, light, center, action }: { n?: number; eyebrow?: string; title: string; desc?: string; light?: boolean; center?: boolean; action?: React.ReactNode }) {
  return (
    <div data-reveal className={cn("mb-14 flex flex-wrap items-end justify-between gap-6", center && "flex-col items-center text-center")}>
      <div className={cn("max-w-3xl", center && "mx-auto")}>
        <div className={cn("flex items-center gap-3 text-xs font-bold uppercase tracking-[0.3em]", light ? "text-gold-300" : "text-gold-600", center && "justify-center")}>
          {n !== undefined && <span className={cn("text-outline text-3xl font-black tracking-normal", light ? "text-white/40" : "text-brand-300")}>{faNum(String(n).padStart(2, "0"))}</span>}
          {eyebrow}
        </div>
        <h2 className={cn("mt-4 text-4xl font-black leading-[1.3] md:text-6xl", light ? "text-white" : "text-brand-950")}>{title}</h2>
        {desc && <p className={cn("mt-5 max-w-2xl text-lg leading-9", light ? "text-white/60" : "text-base-content/60", center && "mx-auto")}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function OpusHome({ d }: { d: HomeData }) {
  const { s, h } = d;
  const vis = visibleSections(d);
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  const stars = Number(s.stars) || 0;
  const maxGuests = Math.max(2, ...d.allRooms.map((r) => r.capacity + r.extraBeds));
  const words = [h.heroHighlight, "آرامش", "شکوه", "خاطره", "مهمان‌نوازی"].filter((w, i, a) => w && a.indexOf(w) === i);
  let chapter = 0;
  const next = () => ++chapter;

  const sections: Record<string, () => React.ReactNode> = {
    features: () => (
      <section key="features" className="overflow-hidden border-y border-brand-900/10 bg-brand-950 py-5 text-white">
        <div className="flex w-max animate-marquee gap-10">
          {[...h.features, ...h.features, ...h.features, ...h.features].map((f, i) => (
            <span key={i} className="flex shrink-0 items-center gap-3 text-sm">
              <DynIcon name={f.icon} className="h-5 w-5 text-gold-300" />
              <b>{f.title}</b>
              <span className="text-white/50">{f.text}</span>
              <Sparkles className="mr-6 h-3.5 w-3.5 text-gold-400/60" />
            </span>
          ))}
        </div>
      </section>
    ),
    rooms: () => (
      <section key="rooms" className="mx-auto max-w-7xl px-6 py-28">
        <Chapter n={next()} eyebrow={h.roomsEyebrow} title={h.roomsTitle} desc={h.roomsText} action={<Link href="/rooms" className="btn rounded-full px-6">همه {faNum(d.allRooms.length)} اتاق <ArrowLeft className="h-4 w-4" /></Link>} />
        <div data-reveal="zoom">
          <RoomAccordion rooms={d.featured.slice(0, 6).map((r) => ({ id: r.id, slug: r.slug, name: r.name, type: r.type, image: r.images[0] ?? "", capacity: r.capacity, extraBeds: r.extraBeds, size: r.size, view: r.view, price: r.pricePerNight, short: r.shortDescription }))} />
        </div>
      </section>
    ),
    offers: () => (
      <section key="offers" className="relative overflow-hidden bg-brand-950 py-28 text-white">
        <div className="pointer-events-none absolute -left-40 top-0 h-[30rem] w-[30rem] rounded-full bg-gold-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-6">
          <Chapter n={next()} eyebrow={h.offersEyebrow} title={h.offersTitle} desc={h.offersText} light action={<Link href="/offers" className="btn btn-secondary rounded-full px-6">همه پیشنهادها</Link>} />
          <div className="grid gap-6 lg:grid-cols-2">
            {d.offers.slice(0, 4).map((p, i) => <div key={p.id} data-reveal style={{ transitionDelay: `${i * 90}ms` }}><OfferCard p={p} dark /></div>)}
          </div>
        </div>
      </section>
    ),
    spotlight: () => {
      const sp = d.spotlight!;
      return (
        <section key="spotlight" className="mx-auto max-w-7xl px-6 py-28">
          <div className="grid gap-14 lg:grid-cols-2">
            <div className="relative lg:sticky lg:top-28 lg:self-start" data-reveal="right">
              <div className="relative aspect-[4/5] overflow-hidden rounded-t-[16rem] rounded-b-[2rem] shadow-2xl">
                <MediaPlaylist items={h.poolMedia} fallback={sp.image || "/images/pool.jpg"} indicatorClassName="bottom-6 left-1/2 -translate-x-1/2" />
              </div>
              {minServicePrice(sp) > 0 && (
                <div className="absolute -bottom-6 left-6 rounded-2xl bg-brand-950 px-5 py-4 text-white shadow-2xl">
                  <div className="text-xs text-white/60">شروع قیمت</div>
                  <div className="text-xl font-black text-gold-300">{formatPrice(minServicePrice(sp))} <span className="text-xs font-normal text-white/60">تومان</span></div>
                </div>
              )}
            </div>
            <div>
              <Chapter n={next()} eyebrow={h.poolEyebrow} title={h.poolTitle || sp.name} desc={h.poolText || sp.shortDescription} />
              <ol className="relative space-y-8 border-r-2 border-brand-200 pr-8">
                {(h.poolFeatures.length ? h.poolFeatures : [sp.workingHours || sp.name]).map((f, i) => (
                  <li key={i} data-reveal className="relative">
                    <span className="absolute -right-[2.6rem] top-0 grid h-8 w-8 place-items-center rounded-full bg-brand-800 text-xs font-bold text-white ring-4 ring-base-200">{faNum(i + 1)}</span>
                    <div className="text-xl font-bold text-brand-950">{f}</div>
                  </li>
                ))}
              </ol>
              {sp.timeSlots.length > 0 && (
                <div data-reveal className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {sp.timeSlots.map((t) => (
                    <div key={t} className="rounded-2xl bg-base-100 p-3 text-center ring-1 ring-base-300">
                      <div dir="ltr" className="font-mono text-xs text-base-content/55">{faNum(t)}</div>
                      <div className="font-black text-brand-800">{formatPrice(sp.slotPrices[t] ?? sp.price)}</div>
                    </div>
                  ))}
                </div>
              )}
              <Link data-reveal href={`/services/${sp.slug}`} className="btn btn-primary btn-lg mt-10 rounded-full px-8"><CalendarCheck className="h-5 w-5" /> {h.poolCta}</Link>
            </div>
          </div>
        </section>
      );
    },
    dining: () => (
      <section key="dining" className="bg-brand-950 py-28 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <Chapter n={next()} eyebrow={h.diningEyebrow} title={h.diningTitle} desc={h.diningText} light />
          <div data-reveal>
            <DiningHover cta={h.diningCta} venues={d.venues.slice(0, 5).map((v) => ({ id: v.id, slug: v.slug, name: v.name, kind: venueKindLabel(v.kind), cuisine: v.cuisine, tagline: v.tagline, image: v.images[0] ?? "", hours: v.hours }))} />
          </div>
        </div>
      </section>
    ),
    amenities: () => (
      <section key="amenities" className="mx-auto max-w-7xl px-6 py-28">
        <Chapter n={next()} eyebrow={h.amenitiesEyebrow} title={h.amenitiesTitle} desc={h.amenitiesText} action={<Link href="/amenities" className="btn rounded-full px-6">همه امکانات</Link>} />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {d.amenityList.slice(0, 8).map((a, i) => (
            <div key={a.id} data-reveal style={{ transitionDelay: `${(i % 4) * 80}ms` }} className="group relative overflow-hidden rounded-[1.75rem] bg-base-100 p-6 ring-1 ring-base-300 transition duration-500 hover:-translate-y-1 hover:bg-brand-900 hover:text-white">
              <span className="absolute -left-4 -top-6 text-8xl font-black text-brand-100 transition group-hover:text-white/5">{faNum(i + 1)}</span>
              <DynIcon name={a.icon} className="relative h-9 w-9 text-brand-700 transition group-hover:text-gold-300" />
              <h3 className="relative mt-6 font-bold">{a.title}</h3>
              <p className="relative mt-1.5 text-sm leading-6 text-base-content/55 transition group-hover:text-white/60">{a.description}</p>
            </div>
          ))}
        </div>
      </section>
    ),
    gallery: () => (
      <section key="gallery" className="mx-auto max-w-7xl px-6 py-28">
        <Chapter n={next()} eyebrow={h.galleryEyebrow} title={h.galleryTitle} action={<Link href="/gallery" className="btn rounded-full px-6">گالری کامل</Link>} />
        <div data-reveal>
          <GalleryGrid filter={false} columns="columns-2 md:columns-3" items={d.gallery.slice(0, 9).map((i) => ({ id: i.id, url: i.url, caption: i.caption, category: i.category }))} />
        </div>
      </section>
    ),
    services: () => (
      <section key="services" className="mx-auto max-w-7xl px-6 py-28">
        <Chapter n={next()} eyebrow={h.servicesEyebrow} title={h.servicesTitle} />
        <div className="divide-y divide-base-300 border-y border-base-300">
          {d.svcList.slice(0, 6).map((sv, i) => (
            <Link key={sv.id} href={`/services/${sv.slug}`} data-reveal className="group grid items-center gap-6 py-7 md:grid-cols-[80px_1fr_220px_48px]">
              <span className="text-outline text-5xl font-black text-brand-300 transition group-hover:text-brand-700">{faNum(String(i + 1).padStart(2, "0"))}</span>
              <div>
                <h3 className="flex items-center gap-3 text-2xl font-black text-brand-950"><DynIcon name={sv.icon} className="h-6 w-6 text-gold-600" />{sv.name}</h3>
                <p className="mt-1.5 text-sm leading-7 text-base-content/60">{sv.shortDescription}</p>
              </div>
              <div className="hidden h-28 overflow-hidden rounded-2xl md:block">
                <Img src={sv.image || "/images/hero.jpg"} alt="" className="h-full w-full object-cover grayscale transition duration-700 group-hover:scale-110 group-hover:grayscale-0" />
              </div>
              <span className="hidden h-12 w-12 place-items-center rounded-full border border-base-300 transition group-hover:border-brand-700 group-hover:bg-brand-700 group-hover:text-white md:grid"><ArrowLeft className="h-5 w-5" /></span>
            </Link>
          ))}
        </div>
      </section>
    ),
    attractions: () => (
      <section key="attractions" className="bg-brand-950 py-28 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <Chapter n={next()} eyebrow={h.attractionsEyebrow} title={h.attractionsTitle} desc={h.attractionsText} light action={<Link href="/attractions" className="btn btn-secondary rounded-full px-6">نقشه جاذبه‌ها</Link>} />
          <div className="no-scrollbar -mx-6 flex snap-x gap-5 overflow-x-auto px-6 pb-2">
            {d.attractionList.slice(0, 8).map((a, i) => (
              <article key={a.id} data-reveal style={{ transitionDelay: `${i * 70}ms` }} className="group relative h-[440px] w-72 shrink-0 snap-start overflow-hidden rounded-[2rem]">
                <Img src={a.image || "/images/hero.jpg"} alt={a.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/20 to-transparent" />
                <span className="absolute right-4 top-4 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">{a.category}</span>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <h3 className="text-2xl font-black">{a.name}</h3>
                  <p className="mt-2 line-clamp-2 text-sm text-white/65">{a.description}</p>
                  <div className="mt-3 flex items-center gap-1.5 text-xs text-gold-300"><MapPin className="h-3.5 w-3.5" />{a.travelTime || `${faNum(a.distanceKm)} کیلومتر`}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    ),
    reviews: () => (
      <section key="reviews" className="relative overflow-hidden py-28">
        <span className="pointer-events-none absolute left-1/2 top-10 -translate-x-1/2 select-none text-[18vw] font-black leading-none text-brand-900/[0.04]">{s.hotelName}</span>
        <div className="relative mx-auto max-w-7xl px-6">
          <Chapter n={next()} eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} center />
          <div data-reveal><ReviewCarousel reviews={d.reviews.slice(0, 8).map((r) => ({ id: r.id, name: r.name, city: r.city, rating: r.rating, body: r.body }))} /></div>
          <div className="mt-10 text-center"><Link href="/reviews" className="btn btn-ghost rounded-full">همه نظرات و ثبت نظر <ArrowLeft className="h-4 w-4" /></Link></div>
        </div>
      </section>
    ),
    faq: () => (
      <section key="faq" className="mx-auto max-w-7xl px-6 py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.5fr]">
          <Chapter n={next()} eyebrow={h.faqEyebrow} title={h.faqTitle} action={<div className="flex gap-2"><Link href="/faq" className="btn btn-primary rounded-full">همه سوالات</Link><Link href="/contact" className="btn rounded-full">تماس</Link></div>} />
          <div data-reveal><FaqList faqs={d.faqList.slice(0, 6)} /></div>
        </div>
      </section>
    ),
    track: () => <div key="track" className="mx-auto max-w-7xl px-6 py-14" data-reveal><TrackSection title={h.trackTitle} text={h.trackText} /></div>,
    map: () => (
      <section key="map" className="mx-auto max-w-7xl px-6 py-28">
        <Chapter n={next()} eyebrow={h.mapEyebrow} title={h.mapTitle} />
        <div className="grid gap-6 lg:grid-cols-[1fr_1.6fr]">
          <div className="space-y-5" data-reveal="right">
            <div className="rounded-[2rem] bg-brand-950 p-7 text-white">
              <ul className="space-y-4 text-sm text-white/75">
                <li className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" />{s.address}</li>
                {s.phone && <li className="flex gap-3"><Phone className="h-5 w-5 shrink-0 text-gold-300" /><span dir="ltr">{faNum(s.phone)}</span></li>}
                {s.email && <li className="flex gap-3"><Mail className="h-5 w-5 shrink-0 text-gold-300" />{s.email}</li>}
                <li className="flex gap-3"><Clock className="h-5 w-5 shrink-0 text-gold-300" />ورود {faNum(s.checkInTime)} · خروج {faNum(s.checkOutTime)}</li>
              </ul>
              <div className="mt-7 flex flex-wrap gap-2">
                {h.mapCta && <Link href="/booking" className="btn btn-secondary rounded-full">{h.mapCta}</Link>}
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="btn rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10"><Navigation className="h-4 w-4" /> مسیریابی</a>
              </div>
            </div>
            <WeatherWidget lat={lat} lng={lng} city={s.city} />
          </div>
          <div data-reveal="left" className="overflow-hidden rounded-[2rem] ring-1 ring-base-300">
            <MapView center={{ lat, lng }} zoom={15} className="h-full min-h-[460px] !rounded-[2rem]" markers={[{ lat, lng, title: s.hotelName, subtitle: s.address, kind: "hotel" }]} />
          </div>
        </div>
      </section>
    ),
  };

  return (
    <RevealRoot>
      <ScrollProgress />
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-brand-950 text-white">
        <div className="pointer-events-none absolute -right-40 -top-40 -z-10 h-[40rem] w-[40rem] rounded-full bg-brand-600/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 -z-10 h-[30rem] w-[30rem] rounded-full bg-gold-400/10 blur-3xl" />
        <div className="mx-auto grid min-h-[100svh] max-w-7xl items-center gap-12 px-6 pb-40 pt-32 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="flex animate-fade-up items-center gap-3 text-sm text-white/70">
              {stars > 0 && <span className="flex gap-0.5">{Array.from({ length: stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-300 text-gold-300" />)}</span>}
              <span className="h-px w-10 bg-white/30" />
              {h.heroBadge}
            </div>
            <h1 className="mt-6 animate-fade-up text-6xl font-black leading-[1.1] md:text-8xl xl:text-[7.5rem]">{h.heroTitle}</h1>
            <p className="mt-6 animate-fade-up text-3xl font-light md:text-5xl">
              <span className="text-white/50">اینجا </span>
              <RotatingWords words={words} className="font-black text-gold-300" />
            </p>
            {h.heroText && <p className="mt-7 max-w-xl animate-fade-up text-lg leading-9 text-white/65">{h.heroText}</p>}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {h.heroPrimaryCta && <Link href="/booking" className="btn btn-secondary btn-lg rounded-full px-9"><CalendarCheck className="h-5 w-5" /> {h.heroPrimaryCta}</Link>}
              {h.heroSecondaryCta && <Link href="/rooms" className="btn btn-lg rounded-full border-white/25 bg-transparent px-8 text-white hover:bg-white/10">{h.heroSecondaryCta}</Link>}
            </div>
            {h.stats.length > 0 && (
              <dl className="mt-14 grid max-w-xl grid-cols-2 gap-6 border-t border-white/10 pt-8 sm:grid-cols-4">
                {h.stats.slice(0, 4).map((x, i) => (
                  <div key={i}>
                    <dt><CountUp value={x.value} className="text-3xl font-black text-white" /></dt>
                    <dd className="mt-1 text-xs text-white/50">{x.label}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
          <div className="relative hidden lg:block">
            <div className="relative mr-auto aspect-[3/4] w-[88%] overflow-hidden rounded-t-[20rem] rounded-b-[2.5rem] ring-1 ring-white/10">
              <MediaPlaylist items={h.heroMedia} fallback="/images/hero.jpg" indicatorClassName="bottom-6 left-1/2 -translate-x-1/2" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950/40 to-transparent" />
            </div>
            <div className="absolute -right-2 bottom-16 grid h-36 w-36 place-items-center rounded-full bg-gold-300 text-brand-950 shadow-2xl">
              <svg viewBox="0 0 100 100" className="animate-spin-text absolute inset-0 h-full w-full" aria-hidden>
                <defs><path id="opus-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" /></defs>
                <text fontSize="9.5" fontWeight="700" fill="currentColor"><textPath href="#opus-circle">رزرو مستقیم • بهترین قیمت • کد رزرو قطعی •</textPath></text>
              </svg>
              <Link href="/booking" aria-label="رزرو" className="relative grid h-14 w-14 place-items-center rounded-full bg-brand-950 text-gold-300"><ArrowLeft className="h-6 w-6" /></Link>
            </div>
          </div>
        </div>
        <a href="#opus-start" aria-label="ادامه" className="absolute bottom-48 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs text-white/50 md:flex">
          <span>اسکرول</span><ArrowDown className="h-4 w-4 animate-bounce" />
        </a>
      </section>
      <div className="relative z-20 mx-auto -mt-28 max-w-6xl px-4">
        <div className="rounded-[2rem] bg-base-100 p-2 shadow-2xl ring-1 ring-black/5">
          <div className="flex items-center justify-between px-4 pb-1 pt-3">
            <span className="text-sm font-black text-brand-950">برنامه سفرتان را بچینید</span>
            <span className="hidden text-xs text-base-content/50 sm:block">نمایش اتاق‌های خالی با قیمت کل اقامت</span>
          </div>
          <StaySearch maxGuests={maxGuests} variant="bar" />
        </div>
      </div>
      <div id="opus-start" className="scroll-mt-24 pt-10" />
      {vis.map((k) => sections[k]?.())}
      <MobileDock phone={s.phone} whatsapp={s.whatsapp} />
    </RevealRoot>
  );
}
