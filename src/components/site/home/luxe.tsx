import { Img } from "@/components/img";
import Link from "next/link";
import { ArrowLeft, BedDouble, CalendarCheck, Star, Quote, MapPin, Clock, UtensilsCrossed } from "lucide-react";
import { faNum, formatPrice } from "@/lib/utils";
import { minServicePrice } from "@/lib/booking";
import { venueKindLabel } from "@/lib/dining";
import { SectionTitle, RoomCard, AttractionCard } from "@/components/site/ui";
import { TrackSection } from "@/components/site/booking-sections";
import { DynIcon } from "@/components/dyn-icon";
import { MapView } from "@/components/map-view";
import { MediaPlaylist } from "@/components/media-playlist";
import { visibleSections, type HomeData } from "./data";
import { FaqSection, GallerySection, OffersSection } from "@/components/site/extras-sections";

export function LuxeHome({ d }: { d: HomeData }) {
  const { s, h } = d;
  const overlay = Math.min(90, Math.max(0, h.heroOverlay)) / 100;
  const lat = Number(s.lat);
  const lng = Number(s.lng);

  const sections: Record<string, () => React.ReactNode> = {
    offers: () => <OffersSection key="offers" offers={d.offers} eyebrow={h.offersEyebrow} title={h.offersTitle} text={h.offersText} />,
    gallery: () => <GallerySection key="gallery" items={d.gallery} eyebrow={h.galleryEyebrow} title={h.galleryTitle} />,
    faq: () => <FaqSection key="faq" faqs={d.faqList} eyebrow={h.faqEyebrow} title={h.faqTitle} />,
    features: () => (
      <section key="features" className="relative z-10 mx-auto -mt-8 max-w-6xl px-6">
        <div className="frost-light grid grid-cols-2 gap-4 rounded-3xl p-5 shadow-xl md:grid-cols-4">
          {h.features.slice(0, 4).map(({ title, text, icon }, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white"><DynIcon name={icon} className="h-5 w-5" /></span>
              <div>
                <div className="text-sm font-bold text-slate-900">{title}</div>
                <div className="text-xs text-slate-500">{text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    rooms: () => (
      <section key="rooms" className="mx-auto max-w-7xl px-6 py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionTitle eyebrow={h.roomsEyebrow} title={h.roomsTitle} desc={h.roomsText} center={false} />
          <Link href="/rooms" className="btn mb-12">همه {faNum(d.allRooms.length)} اتاق <ArrowLeft className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {d.featured.map((r) => <RoomCard key={r.id} room={r} />)}
        </div>
      </section>
    ),
    spotlight: () => {
      const sp = d.spotlight!;
      return (
        <section key="spotlight" className="relative overflow-hidden bg-brand-950 py-24 text-white">
          <div className="pointer-events-none absolute -right-40 top-0 h-[30rem] w-[30rem] rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
            <div className="relative">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] shadow-2xl ring-1 ring-white/10">
                <MediaPlaylist items={h.poolMedia} fallback={sp.image || "/images/pool.jpg"} indicatorClassName="bottom-4 right-4" />
              </div>
              {(h.poolBadgeTop || h.poolBadgeBottom) && (
                <div className="frost absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl p-4">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-gold-400 text-brand-950"><DynIcon name={sp.icon || "Waves"} className="h-6 w-6" /></span>
                  <div>
                    <div className="text-sm text-white/70">{h.poolBadgeTop}</div>
                    <div className="font-black">{h.poolBadgeBottom}</div>
                  </div>
                </div>
              )}
            </div>
            <div>
              <SectionTitle eyebrow={h.poolEyebrow} title={h.poolTitle || sp.name} desc={h.poolText || sp.shortDescription} center={false} light />
              {h.poolFeatures.length > 0 && (
                <div className="-mt-6 grid grid-cols-2 gap-3">
                  {h.poolFeatures.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-2xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/10"><span className="h-2 w-2 shrink-0 rounded-full bg-gold-400" /> {f}</div>
                  ))}
                </div>
              )}
              {sp.timeSlots.length > 0 && (
                <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
                  {sp.timeSlots.map((t) => (
                    <div key={t} className="shrink-0 rounded-xl bg-white/5 px-3 py-2 text-center ring-1 ring-white/10">
                      <div dir="ltr" className="font-mono text-xs text-white/70">{faNum(t)}</div>
                      <div className="text-sm font-bold text-gold-300">{formatPrice(sp.slotPrices[t] ?? sp.price)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={`/services/${sp.slug}`} className="btn btn-secondary px-6 h-12"><CalendarCheck className="h-4 w-4" /> {h.poolCta}</Link>
                {minServicePrice(sp) > 0 && <span className="text-white/70">از {formatPrice(minServicePrice(sp))} تومان · {sp.priceUnit}</span>}
              </div>
            </div>
          </div>
        </section>
      );
    },
    dining: () => (
      <section key="dining" className="relative py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle eyebrow={h.diningEyebrow} title={h.diningTitle} desc={h.diningText} />
          <div className={`grid gap-6 ${d.venues.length === 1 ? "" : "lg:grid-cols-2"}`}>
            {d.venues.slice(0, 4).map((v, i) => (
              <Link key={v.id} href={`/dining/${v.slug}`} className={`group relative overflow-hidden rounded-[2rem] shadow-xl ${i === 0 && d.venues.length % 2 === 1 ? "lg:col-span-2 aspect-[21/9]" : "aspect-[16/10]"}`}>
                <Img src={v.images[0] || "/images/hero.jpg"} alt={v.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-7 text-white">
                  <span className="frost inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"><UtensilsCrossed className="h-3.5 w-3.5 text-gold-300" />{venueKindLabel(v.kind)}{v.cuisine && ` · ${v.cuisine}`}</span>
                  <h3 className="mt-3 text-2xl font-black md:text-3xl">{v.name}</h3>
                  {v.tagline && <p className="mt-1 text-white/75">{v.tagline}</p>}
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                    {v.hours[0] && <span className="flex items-center gap-1.5 text-white/70"><Clock className="h-4 w-4" />{v.hours[0].label}: {v.hours[0].time}</span>}
                    <span className="btn btn-secondary btn-sm">{h.diningCta} <ArrowLeft className="h-3.5 w-3.5" /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    amenities: () => (
      <section key="amenities" className="pattern-dots py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle eyebrow={h.amenitiesEyebrow} title={h.amenitiesTitle} desc={h.amenitiesText} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {d.amenityList.slice(0, 8).map((a, i) => (
              <div key={a.id} className={`group rounded-3xl border border-slate-200/70 p-6 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl ${i === 0 ? "bg-gradient-to-br from-brand-700 to-brand-900 text-white md:col-span-2 md:row-span-2" : "bg-white"}`}>
                <span className={`grid h-12 w-12 place-items-center rounded-2xl transition group-hover:scale-110 ${i === 0 ? "bg-white/15 text-gold-300" : "bg-brand-50 text-brand-700"}`}><DynIcon name={a.icon} className="h-6 w-6" /></span>
                <h3 className={`mt-4 font-extrabold ${i === 0 ? "text-2xl" : "text-slate-900"}`}>{a.title}</h3>
                <p className={`mt-1.5 text-sm leading-6 ${i === 0 ? "text-white/75" : "text-slate-500"}`}>{a.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center"><Link href="/amenities" className="btn">مشاهده همه امکانات <ArrowLeft className="h-4 w-4" /></Link></div>
        </div>
      </section>
    ),
    services: () => (
      <section key="services" className="mx-auto max-w-7xl px-6 py-20">
        <SectionTitle eyebrow={h.servicesEyebrow} title={h.servicesTitle} />
        <div className="no-scrollbar -mx-6 flex snap-x gap-5 overflow-x-auto px-6 pb-4">
          {d.svcList.map((sv) => (
            <Link key={sv.id} href={`/services/${sv.slug}`} className="group relative h-80 w-72 shrink-0 snap-start overflow-hidden rounded-3xl">
              <Img src={sv.image || "/images/hero.jpg"} alt={sv.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950/95 via-brand-950/30" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <span className="frost mb-3 grid h-11 w-11 place-items-center rounded-xl"><DynIcon name={sv.icon} className="h-5 w-5 text-gold-300" /></span>
                <h3 className="text-lg font-extrabold">{sv.name}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-white/70">{sv.shortDescription}</p>
                {sv.isBookable && <span className="mt-3 inline-block rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-brand-950">قابل رزرو آنلاین</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),
    attractions: () => (
      <section key="attractions" className="bg-gradient-to-b from-white to-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle eyebrow={h.attractionsEyebrow} title={h.attractionsTitle} desc={h.attractionsText} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{d.attractionList.slice(0, 4).map((a) => <AttractionCard key={a.id} a={a} />)}</div>
          <div className="mt-8 text-center"><Link href="/attractions" className="btn btn-primary">نقشه و همه جاذبه‌ها <ArrowLeft className="h-4 w-4" /></Link></div>
        </div>
      </section>
    ),
    reviews: () => (
      <section key="reviews" className="mx-auto max-w-7xl px-6 py-20">
        <SectionTitle eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {d.reviews.slice(0, 4).map((t) => (
            <figure key={t.id} className="card card-border relative bg-base-100 p-6 shadow-sm">
              <Quote className="absolute left-5 top-5 h-8 w-8 text-brand-100" />
              <div className="flex">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-400 text-gold-400" />)}</div>
              <blockquote className="mt-4 text-sm leading-7 text-slate-600">{t.body}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{t.name[0]}</span>
                <div><div className="text-sm font-bold text-slate-900">{t.name}</div><div className="text-xs text-slate-500">{t.city}</div></div>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),
    track: () => (
      <div key="track" className="mx-auto max-w-7xl px-6 py-10"><TrackSection title={h.trackTitle} text={h.trackText} /></div>
    ),
    map: () => (
      <section key="map" className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid gap-6 overflow-hidden rounded-[2rem] bg-brand-900 p-3 lg:grid-cols-[1fr_1.4fr]">
          <div className="flex flex-col justify-center p-8 text-white">
            <span className="text-sm font-semibold text-gold-300">{h.mapEyebrow}</span>
            <h2 className="mt-3 text-3xl font-black">{h.mapTitle}</h2>
            <p className="mt-4 flex gap-2 leading-8 text-white/70"><MapPin className="mt-1.5 h-4 w-4 shrink-0 text-gold-300" />{s.address}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {h.mapCta && <Link href="/booking" className="btn btn-secondary">{h.mapCta}</Link>}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="btn frost text-white">مسیریابی</a>
            </div>
          </div>
          <MapView center={{ lat, lng }} zoom={14} className="h-[420px]" markers={[{ lat, lng, title: s.hotelName, subtitle: s.address, kind: "hotel" }]} />
        </div>
      </section>
    ),
  };

  return (
    <>
      <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden pb-16 pt-32">
        <div className="absolute inset-0 -z-20">
          <MediaPlaylist items={h.heroMedia} fallback="/images/hero.jpg" indicatorClassName="bottom-6 left-1/2 -translate-x-1/2 lg:left-6 lg:translate-x-0" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-950 via-brand-950/40 to-brand-950/20" />
        <div className="absolute inset-0 -z-10 bg-brand-950" style={{ opacity: overlay * 0.6 }} />
        <div className="mx-auto grid w-full max-w-7xl items-end gap-10 px-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="text-white">
            {h.heroBadge && (
              <div className="frost inline-flex animate-fade-up items-center gap-2 rounded-full px-4 py-1.5 text-sm">
                <span className="flex">{Array.from({ length: Number(s.stars) || 0 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />)}</span>
                {h.heroBadge}
              </div>
            )}
            <h1 className="mt-6 animate-fade-up text-5xl font-black leading-[1.25] md:text-7xl">
              {h.heroTitle}
              {h.heroHighlight && <span className="text-gradient mt-2 block text-3xl md:text-5xl">{h.heroHighlight}</span>}
            </h1>
            {h.heroText && <p className="mt-6 max-w-xl animate-fade-up text-lg leading-9 text-white/85">{h.heroText}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {h.heroPrimaryCta && <Link href="/booking" className="btn btn-secondary h-12 px-7 text-base"><CalendarCheck className="h-5 w-5" /> {h.heroPrimaryCta}</Link>}
              {h.heroSecondaryCta && <Link href="/rooms" className="btn frost h-12 px-7 text-base text-white hover:bg-white/20"><BedDouble className="h-5 w-5" /> {h.heroSecondaryCta}</Link>}
            </div>
          </div>
          {h.stats.length > 0 && (
            <div className="hidden gap-3 lg:grid lg:grid-cols-2">
              {h.stats.slice(0, 4).map(({ value, label, icon }, i) => (
                <div key={i} className="frost animate-float rounded-3xl p-5 text-white" style={{ animationDelay: `${i * 0.6}s` }}>
                  <DynIcon name={icon} className="h-6 w-6 text-gold-300" />
                  <div className="mt-3 text-3xl font-black">{value}</div>
                  <div className="text-sm text-white/70">{label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      {visibleSections(d).map((k) => sections[k]?.())}
    </>
  );
}
