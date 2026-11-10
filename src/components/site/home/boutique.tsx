import { Img } from "@/components/img";
import Link from "next/link";
import { ArrowLeft, CalendarCheck, Star, MapPin, Clock, Users, Maximize, Quote, Navigation } from "lucide-react";
import { faNum, formatPrice } from "@/lib/utils";
import { minServicePrice } from "@/lib/booking";
import { venueKindLabel } from "@/lib/dining";
import { TrackSection } from "@/components/site/booking-sections";
import { DynIcon } from "@/components/dyn-icon";
import { MapView } from "@/components/map-view";
import { MediaPlaylist } from "@/components/media-playlist";
import { visibleSections, type HomeData } from "./data";
import { FaqSection, GallerySection, OffersSection } from "@/components/site/extras-sections";

function Heading({ eyebrow, title, desc, center }: { eyebrow?: string; title: string; desc?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto mb-12 max-w-2xl text-center" : "mb-10 max-w-2xl"}>
      {eyebrow && (
        <div className={`flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-600 ${center ? "justify-center" : ""}`}>
          <span className="h-px w-10 bg-gold-500" /> {eyebrow}
        </div>
      )}
      <h2 className="mt-3 text-3xl font-black leading-snug text-brand-900 md:text-[2.6rem]">{title}</h2>
      {desc && <p className="mt-4 leading-8 text-base-content/60">{desc}</p>}
    </div>
  );
}

export function BoutiqueHome({ d }: { d: HomeData }) {
  const { s, h } = d;
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  const stars = Number(s.stars) || 0;

  const sections: Record<string, () => React.ReactNode> = {
    offers: () => <OffersSection key="offers" offers={d.offers} eyebrow={h.offersEyebrow} title={h.offersTitle} text={h.offersText} />,
    gallery: () => <GallerySection key="gallery" items={d.gallery} eyebrow={h.galleryEyebrow} title={h.galleryTitle} />,
    faq: () => <FaqSection key="faq" faqs={d.faqList} eyebrow={h.faqEyebrow} title={h.faqTitle} />,
    features: () => (
      <section key="features" className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 border-y border-base-300 md:grid-cols-4">
          {h.features.slice(0, 4).map(({ title, text, icon }, i) => (
            <div key={i} className="flex flex-col items-center gap-3 border-base-300 px-4 py-8 text-center [&:not(:last-child)]:md:border-l">
              <DynIcon name={icon} className="h-7 w-7 text-gold-600" />
              <div className="font-bold text-brand-900">{title}</div>
              <div className="text-xs text-base-content/55">{text}</div>
            </div>
          ))}
        </div>
      </section>
    ),
    rooms: () => {
      const [first, ...rest] = d.featured;
      return (
        <section key="rooms" className="mx-auto max-w-7xl px-6 py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Heading eyebrow={h.roomsEyebrow} title={h.roomsTitle} desc={h.roomsText} />
            <Link href="/rooms" className="btn btn-outline btn-primary mb-10">همه {faNum(d.allRooms.length)} اتاق <ArrowLeft className="h-4 w-4" /></Link>
          </div>
          {first && (
            <Link href={`/rooms/${first.slug}`} className="group mb-10 grid overflow-hidden rounded-box bg-base-100 shadow-sm ring-1 ring-base-300 md:grid-cols-[1.4fr_1fr]">
              <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto">
                <Img src={first.images[0] || "/images/city-hotel.jpg"} alt={first.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
              </div>
              <div className="flex flex-col justify-center p-8 md:p-12">
                <span className="text-xs font-bold uppercase tracking-widest text-gold-600">{first.type}</span>
                <h3 className="mt-2 text-3xl font-black text-brand-900">{first.name}</h3>
                <p className="mt-4 leading-8 text-base-content/60">{first.shortDescription}</p>
                <div className="mt-6 flex gap-5 text-sm text-base-content/60">
                  <span className="flex items-center gap-1.5"><Users className="h-4 w-4" />{faNum(first.capacity)} نفر</span>
                  <span className="flex items-center gap-1.5"><Maximize className="h-4 w-4" />{faNum(first.size)} متر</span>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-base-300 pt-6">
                  <div><span className="text-2xl font-black text-brand-800">{formatPrice(first.pricePerNight)}</span> <span className="text-xs text-base-content/50">تومان / شب</span></div>
                  <span className="btn btn-primary btn-sm">مشاهده و رزرو</span>
                </div>
              </div>
            </Link>
          )}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((r) => (
              <Link key={r.id} href={`/rooms/${r.slug}`} className="group">
                <div className="relative aspect-[4/3] overflow-hidden rounded-box">
                  <Img src={r.images[0] || "/images/city-hotel.jpg"} alt={r.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <span className="absolute right-3 top-3 rounded-field bg-base-100/95 px-2.5 py-1 text-xs font-bold text-brand-800">{r.type}</span>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-brand-900 group-hover:text-brand-700">{r.name}</h3>
                    <p className="mt-1 text-xs text-base-content/50">{faNum(r.capacity)} نفر · {faNum(r.size)} متر · {r.view}</p>
                  </div>
                  <div className="shrink-0 text-left"><div className="font-black text-brand-800">{formatPrice(r.pricePerNight)}</div><div className="text-[10px] text-base-content/45">تومان / شب</div></div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    },
    dining: () => (
      <section key="dining" className="bg-brand-900 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 grid gap-6 md:grid-cols-2 md:items-end">
            <div>
              <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-300"><span className="h-px w-10 bg-gold-400" /> {h.diningEyebrow}</div>
              <h2 className="mt-3 text-3xl font-black leading-snug md:text-[2.6rem]">{h.diningTitle}</h2>
            </div>
            <p className="leading-8 text-white/65">{h.diningText}</p>
          </div>
          <div className="space-y-16">
            {d.venues.slice(0, 3).map((v, i) => {
              const sig = d.signatures.filter((m) => m.venueId === v.id).slice(0, 3);
              return (
                <div key={v.id} className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
                  <div className="grid grid-cols-3 grid-rows-2 gap-3">
                    <Img src={v.images[0] || "/images/city-hotel.jpg"} alt={v.name} className="col-span-2 row-span-2 h-full min-h-72 w-full rounded-box object-cover" />
                    <Img src={v.images[1] || v.images[0] || "/images/city-hotel.jpg"} alt="" className="h-full w-full rounded-box object-cover" />
                    <Img src={v.images[2] || v.images[0] || "/images/city-hotel.jpg"} alt="" className="h-full w-full rounded-box object-cover" />
                  </div>
                  <div>
                    <span className="text-sm text-gold-300">{venueKindLabel(v.kind)}{v.cuisine && ` · ${v.cuisine}`}</span>
                    <h3 className="mt-2 text-3xl font-black">{v.name}</h3>
                    {v.tagline && <p className="mt-2 text-lg text-white/70">{v.tagline}</p>}
                    {v.hours.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {v.hours.map((x, j) => <span key={j} className="flex items-center gap-1.5 rounded-field bg-white/10 px-3 py-1.5 text-xs"><Clock className="h-3.5 w-3.5 text-gold-300" />{x.label}: {x.time}</span>)}
                      </div>
                    )}
                    {sig.length > 0 && (
                      <ul className="mt-7 divide-y divide-white/10 border-y border-white/10">
                        {sig.map((m) => (
                          <li key={m.id} className="flex items-baseline gap-3 py-3">
                            <span className="font-bold">{m.name}</span>
                            <span className="min-w-0 flex-1 truncate border-b border-dotted border-white/25 text-xs text-white/50">{m.description}</span>
                            <span className="text-sm font-bold text-gold-300">{formatPrice(m.price)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Link href={`/dining/${v.slug}`} className="btn btn-secondary mt-7">{h.diningCta} <ArrowLeft className="h-4 w-4" /></Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    ),
    spotlight: () => {
      const sp = d.spotlight!;
      return (
        <section key="spotlight" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid overflow-hidden rounded-box bg-brand-50 ring-1 ring-brand-100 lg:grid-cols-2">
            <div className="relative min-h-80"><MediaPlaylist items={h.poolMedia} fallback={sp.image || "/images/city-hotel.jpg"} indicatorClassName="bottom-4 right-4" /></div>
            <div className="p-8 md:p-12">
              <Heading eyebrow={h.poolEyebrow} title={h.poolTitle || sp.name} desc={h.poolText || sp.shortDescription} />
              {h.poolFeatures.length > 0 && (
                <ul className="-mt-4 grid gap-2 sm:grid-cols-2">
                  {h.poolFeatures.map((f, i) => <li key={i} className="flex items-center gap-2 text-sm text-brand-900"><span className="h-1.5 w-1.5 rounded-full bg-gold-500" />{f}</li>)}
                </ul>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={`/services/${sp.slug}`} className="btn btn-primary"><CalendarCheck className="h-4 w-4" /> {h.poolCta}</Link>
                {minServicePrice(sp) > 0 && <span className="text-sm text-base-content/60">از {formatPrice(minServicePrice(sp))} تومان · {sp.priceUnit}</span>}
              </div>
            </div>
          </div>
        </section>
      );
    },
    amenities: () => (
      <section key="amenities" className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <Heading eyebrow={h.amenitiesEyebrow} title={h.amenitiesTitle} desc={h.amenitiesText} />
            <Link href="/amenities" className="btn btn-outline btn-primary">همه امکانات <ArrowLeft className="h-4 w-4" /></Link>
          </div>
          <ul className="grid gap-x-10 sm:grid-cols-2">
            {d.amenityList.slice(0, 10).map((a) => (
              <li key={a.id} className="flex items-start gap-4 border-b border-base-300 py-5">
                <DynIcon name={a.icon} className="mt-0.5 h-6 w-6 shrink-0 text-gold-600" />
                <div><div className="font-bold text-brand-900">{a.title}</div><div className="text-sm text-base-content/55">{a.description}</div></div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    ),
    services: () => (
      <section key="services" className="bg-base-100 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <Heading eyebrow={h.servicesEyebrow} title={h.servicesTitle} center />
          <div className="grid gap-px overflow-hidden rounded-box bg-base-300 ring-1 ring-base-300 sm:grid-cols-2 lg:grid-cols-4">
            {d.svcList.slice(0, 8).map((sv) => (
              <Link key={sv.id} href={`/services/${sv.slug}`} className="group bg-base-100 p-7 transition hover:bg-brand-50">
                <DynIcon name={sv.icon} className="h-8 w-8 text-brand-700" />
                <h3 className="mt-5 font-extrabold text-brand-900">{sv.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-base-content/55">{sv.shortDescription}</p>
                {sv.isBookable && <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-gold-600">رزرو آنلاین <ArrowLeft className="h-3 w-3 transition group-hover:-translate-x-1" /></span>}
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    attractions: () => (
      <section key="attractions" className="mx-auto max-w-7xl px-6 py-20">
        <Heading eyebrow={h.attractionsEyebrow} title={h.attractionsTitle} desc={h.attractionsText} />
        <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <ol className="divide-y divide-base-300 border-y border-base-300">
            {d.attractionList.slice(0, 6).map((a, i) => (
              <li key={a.id} className="flex items-center gap-5 py-4">
                <span className="w-10 text-3xl font-black text-gold-500/70">{faNum(String(i + 1).padStart(2, "0"))}</span>
                <Img src={a.image || "/images/city-hotel.jpg"} alt="" className="h-16 w-20 shrink-0 rounded-field object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-brand-900">{a.name}</div>
                  <div className="truncate text-xs text-base-content/55">{a.description}</div>
                </div>
                <span className="hidden shrink-0 text-xs text-base-content/60 sm:block">{a.travelTime || `${faNum(a.distanceKm)} کیلومتر`}</span>
              </li>
            ))}
          </ol>
          <div className="space-y-3">
            <MapView center={{ lat, lng }} fitBounds zoom={12} className="h-[420px] ring-1 ring-base-300" markers={[{ lat, lng, title: s.hotelName, kind: "hotel" }, ...d.attractionList.filter((a) => a.lat && a.lng).map((a) => ({ lat: a.lat, lng: a.lng, title: a.name, subtitle: a.travelTime }))]} />
            <Link href="/attractions" className="btn btn-block">همه جاذبه‌ها</Link>
          </div>
        </div>
      </section>
    ),
    reviews: () => {
      const [top, ...others] = d.reviews;
      return (
        <section key="reviews" className="bg-brand-50/70 py-20">
          <div className="mx-auto max-w-5xl px-6 text-center">
            <Heading eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} center />
            <Quote className="mx-auto h-10 w-10 text-gold-500" />
            <blockquote className="mx-auto mt-4 max-w-3xl text-xl font-medium leading-10 text-brand-900 md:text-2xl">«{top.body}»</blockquote>
            <div className="mt-5 text-sm text-base-content/60">{top.name} · {top.city}</div>
            {others.length > 0 && (
              <div className="mt-12 grid gap-5 text-right md:grid-cols-3">
                {others.slice(0, 3).map((t) => (
                  <figure key={t.id} className="rounded-box bg-base-100 p-5 ring-1 ring-base-300">
                    <div className="flex">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />)}</div>
                    <blockquote className="mt-3 text-sm leading-7 text-base-content/70">{t.body}</blockquote>
                    <figcaption className="mt-3 text-xs font-bold text-brand-900">{t.name} <span className="font-normal text-base-content/50">· {t.city}</span></figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    },
    track: () => <div key="track" className="mx-auto max-w-7xl px-6 py-14"><TrackSection title={h.trackTitle} text={h.trackText} /></div>,
    map: () => (
      <section key="map" className="relative mx-auto mt-6 max-w-7xl px-6">
        <MapView center={{ lat, lng }} zoom={15} className="h-[460px] ring-1 ring-base-300" markers={[{ lat, lng, title: s.hotelName, subtitle: s.address, kind: "hotel" }]} />
        <div className="absolute bottom-6 right-10 z-[400] max-w-sm rounded-box bg-base-100 p-6 shadow-2xl ring-1 ring-base-300">
          <span className="text-xs font-bold text-gold-600">{h.mapEyebrow}</span>
          <h3 className="mt-1 text-xl font-black text-brand-900">{h.mapTitle}</h3>
          <p className="mt-3 flex gap-2 text-sm leading-7 text-base-content/65"><MapPin className="mt-1 h-4 w-4 shrink-0 text-gold-600" />{s.address}</p>
          <div className="mt-4 flex gap-2">
            {h.mapCta && <Link href="/booking" className="btn btn-primary btn-sm">{h.mapCta}</Link>}
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="btn btn-sm"><Navigation className="h-3.5 w-3.5" /> مسیریابی</a>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <>
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-10 pt-10 md:pt-16 lg:grid-cols-[1.05fr_1fr]">
        <div className="animate-fade-up">
          <div className="flex items-center gap-3 text-sm text-base-content/60">
            {stars > 0 && <span className="flex">{Array.from({ length: stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-500 text-gold-500" />)}</span>}
            {h.heroBadge}
          </div>
          <h1 className="mt-5 text-5xl font-black leading-[1.3] text-brand-900 md:text-6xl">
            {h.heroTitle}
            {h.heroHighlight && (
              <span className="relative mt-2 block w-fit text-3xl font-bold text-brand-700 md:text-4xl">
                {h.heroHighlight}
                <span className="absolute -bottom-1 left-0 right-0 -z-10 h-3 bg-gold-300/50" />
              </span>
            )}
          </h1>
          {h.heroText && <p className="mt-7 max-w-xl text-lg leading-9 text-base-content/65">{h.heroText}</p>}
          <div className="mt-9 flex flex-wrap gap-3">
            {h.heroPrimaryCta && <Link href="/booking" className="btn btn-primary btn-lg"><CalendarCheck className="h-5 w-5" /> {h.heroPrimaryCta}</Link>}
            {h.heroSecondaryCta && <Link href="/rooms" className="btn btn-outline btn-primary btn-lg">{h.heroSecondaryCta}</Link>}
          </div>
          {h.stats.length > 0 && (
            <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-base-300 pt-8 sm:grid-cols-4">
              {h.stats.slice(0, 4).map((x, i) => (
                <div key={i}>
                  <dt className="text-2xl font-black text-brand-800">{x.value}</dt>
                  <dd className="mt-1 text-xs text-base-content/55">{x.label}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="relative">
          <div className="relative mx-auto aspect-[4/5] max-w-md overflow-hidden rounded-t-full rounded-b-box shadow-2xl ring-8 ring-base-100 lg:max-w-none">
            <MediaPlaylist items={h.heroMedia} fallback="/images/city-hotel.jpg" indicatorClassName="bottom-5 left-1/2 -translate-x-1/2" />
          </div>
          <div className="absolute -bottom-6 right-0 hidden rounded-box bg-base-100 p-4 shadow-xl ring-1 ring-base-300 sm:block">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-field bg-brand-700 text-white"><MapPin className="h-5 w-5" /></span>
              <div className="max-w-52"><div className="text-xs text-base-content/50">{s.city || "موقعیت"}</div><div className="truncate text-sm font-bold text-brand-900">{s.address}</div></div>
            </div>
          </div>
          <div className="absolute -left-4 top-10 -z-10 hidden h-64 w-64 rounded-full bg-gold-300/30 blur-3xl lg:block" />
        </div>
      </section>
      {visibleSections(d).map((k) => sections[k]?.())}
    </>
  );
}
