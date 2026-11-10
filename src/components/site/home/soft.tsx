import { Img } from "@/components/img";
import Link from "next/link";
import { ArrowLeft, Star, MapPin, Users, Maximize, Eye, Phone, Mail, Clock, Navigation, Quote, CalendarCheck, SearchCheck } from "lucide-react";
import { faNum, formatPrice } from "@/lib/utils";
import { minServicePrice } from "@/lib/booking";
import { venueKindLabel } from "@/lib/dining";
import { StaySearch } from "@/components/site/stay-search";
import { TrackLookup } from "@/components/site/forms";
import { SoftDiningTabs } from "@/components/site/soft-client";
import { DynIcon } from "@/components/dyn-icon";
import { MapView } from "@/components/map-view";
import { MediaPlaylist } from "@/components/media-playlist";
import { visibleSections, type HomeData } from "./data";
import { FaqSection, GallerySection, OffersSection } from "@/components/site/extras-sections";

function SoftTitle({ eyebrow, title, desc, center }: { eyebrow?: string; title: string; desc?: string; center?: boolean }) {
  return (
    <div className={`mb-12 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <span className="neu-inset-sm inline-flex rounded-full px-4 py-1.5 text-xs font-bold text-primary">{eyebrow}</span>}
      <h2 className="mt-4 text-3xl font-black leading-snug text-brand-900 md:text-4xl">{title}</h2>
      {desc && <p className="mt-4 leading-8 text-base-content/60">{desc}</p>}
    </div>
  );
}

export function SoftHome({ d }: { d: HomeData }) {
  const { s, h } = d;
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  const stars = Number(s.stars) || 0;
  const maxGuests = Math.max(2, ...d.allRooms.map((r) => r.capacity + r.extraBeds));

  const sections: Record<string, () => React.ReactNode> = {
    offers: () => <OffersSection key="offers" offers={d.offers} eyebrow={h.offersEyebrow} title={h.offersTitle} text={h.offersText} />,
    gallery: () => <GallerySection key="gallery" items={d.gallery} eyebrow={h.galleryEyebrow} title={h.galleryTitle} />,
    faq: () => <FaqSection key="faq" faqs={d.faqList} eyebrow={h.faqEyebrow} title={h.faqTitle} />,
    features: () => (
      <section key="features" className="mx-auto max-w-7xl px-5 py-10">
        <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
          {h.features.slice(0, 4).map((f, i) => (
            <div key={i} className="neu-sm flex items-center gap-4 rounded-[1.5rem] p-4 md:p-5">
              <span className="neu-inset-sm grid h-12 w-12 shrink-0 place-items-center rounded-full text-primary"><DynIcon name={f.icon} className="h-5 w-5" /></span>
              <span><span className="block text-sm font-bold text-brand-900">{f.title}</span><span className="block text-xs text-base-content/55">{f.text}</span></span>
            </div>
          ))}
        </div>
      </section>
    ),
    rooms: () => (
      <section key="rooms" className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SoftTitle eyebrow={h.roomsEyebrow} title={h.roomsTitle} desc={h.roomsText} />
          <Link href="/rooms" className="btn mb-12 rounded-full px-6">همه {faNum(d.allRooms.length)} اتاق <ArrowLeft className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {d.featured.map((r) => (
            <Link key={r.id} href={`/rooms/${r.slug}`} className="neu group rounded-[2rem] p-4 transition duration-300 hover:-translate-y-1">
              <div className="neu-inset rounded-[1.6rem] p-1.5">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.3rem]">
                  <Img src={r.images[0] || "/images/hero.jpg"} alt={r.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <span className="neu-sm absolute right-3 top-3 rounded-full px-3 py-1 text-[11px] font-bold text-primary">{r.type}</span>
                </div>
              </div>
              <div className="px-2 pb-1 pt-5">
                <h3 className="text-lg font-extrabold text-brand-900">{r.name}</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-base-content/60">
                  <span className="neu-inset-sm flex items-center gap-1 rounded-full px-2.5 py-1"><Users className="h-3 w-3" />{faNum(r.capacity)} نفر</span>
                  <span className="neu-inset-sm flex items-center gap-1 rounded-full px-2.5 py-1"><Maximize className="h-3 w-3" />{faNum(r.size)} متر</span>
                  {r.view && <span className="neu-inset-sm flex max-w-36 items-center gap-1 truncate rounded-full px-2.5 py-1"><Eye className="h-3 w-3 shrink-0" />{r.view}</span>}
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div><span className="text-xl font-black text-primary">{formatPrice(r.pricePerNight)}</span> <span className="text-xs text-base-content/50">تومان / شب</span></div>
                  <span className="neu-sm grid h-11 w-11 place-items-center rounded-full text-primary transition group-hover:neu-inset-sm"><ArrowLeft className="h-5 w-5" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),
    spotlight: () => {
      const sp = d.spotlight!;
      return (
        <section key="spotlight" className="mx-auto max-w-7xl px-5 py-16">
          <div className="neu-lg grid items-center gap-10 rounded-[2.5rem] p-5 md:p-10 lg:grid-cols-2">
            <div className="neu-inset rounded-[2rem] p-2">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.6rem]">
                <MediaPlaylist items={h.poolMedia} fallback={sp.image || "/images/pool.jpg"} indicatorClassName="bottom-4 right-4" />
              </div>
            </div>
            <div className="px-1">
              <SoftTitle eyebrow={h.poolEyebrow} title={h.poolTitle || sp.name} desc={h.poolText || sp.shortDescription} />
              {h.poolFeatures.length > 0 && (
                <div className="-mt-6 flex flex-wrap gap-2.5">
                  {h.poolFeatures.map((f, i) => <span key={i} className="neu-inset-sm rounded-full px-4 py-2 text-sm text-base-content/75">{f}</span>)}
                </div>
              )}
              {sp.timeSlots.length > 0 && (
                <div className="no-scrollbar -mx-1 mt-7 flex gap-3 overflow-x-auto px-1 py-2">
                  {sp.timeSlots.map((t) => (
                    <div key={t} className="neu-sm shrink-0 rounded-2xl px-4 py-2.5 text-center">
                      <div dir="ltr" className="font-mono text-xs text-base-content/55">{faNum(t)}</div>
                      <div className="text-sm font-black text-primary">{formatPrice(sp.slotPrices[t] ?? sp.price)}</div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={`/services/${sp.slug}`} className="btn btn-primary rounded-full px-7"><CalendarCheck className="h-4 w-4" /> {h.poolCta}</Link>
                {minServicePrice(sp) > 0 && <span className="text-sm text-base-content/60">از {formatPrice(minServicePrice(sp))} تومان · {sp.priceUnit}</span>}
              </div>
            </div>
          </div>
        </section>
      );
    },
    dining: () => (
      <section key="dining" className="mx-auto max-w-7xl px-5 py-16">
        <SoftTitle eyebrow={h.diningEyebrow} title={h.diningTitle} desc={h.diningText} center />
        <SoftDiningTabs
          cta={h.diningCta}
          venues={d.venues.slice(0, 5).map((v) => ({
            id: v.id,
            slug: v.slug,
            name: v.name,
            kind: venueKindLabel(v.kind),
            tagline: v.tagline,
            cuisine: v.cuisine,
            hours: v.hours,
            images: v.images,
            signatures: d.signatures.filter((m) => m.venueId === v.id).map((m) => ({ id: m.id, name: m.name, description: m.description, price: m.price })),
          }))}
        />
      </section>
    ),
    amenities: () => (
      <section key="amenities" className="mx-auto max-w-7xl px-5 py-16">
        <SoftTitle eyebrow={h.amenitiesEyebrow} title={h.amenitiesTitle} desc={h.amenitiesText} center />
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {d.amenityList.slice(0, 8).map((a) => (
            <div key={a.id} className="neu-sm group rounded-[1.75rem] p-6 text-center transition-shadow duration-300 hover:neu-inset-sm">
              <span className="neu-sm mx-auto grid h-16 w-16 place-items-center rounded-full text-primary transition group-hover:neu-inset-sm"><DynIcon name={a.icon} className="h-7 w-7" /></span>
              <h3 className="mt-5 font-bold text-brand-900">{a.title}</h3>
              <p className="mt-1.5 text-xs leading-6 text-base-content/55">{a.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center"><Link href="/amenities" className="btn rounded-full px-7">مشاهده همه امکانات <ArrowLeft className="h-4 w-4" /></Link></div>
      </section>
    ),
    services: () => (
      <section key="services" className="mx-auto max-w-7xl px-5 py-16">
        <SoftTitle eyebrow={h.servicesEyebrow} title={h.servicesTitle} />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {d.svcList.slice(0, 6).map((sv) => (
            <Link key={sv.id} href={`/services/${sv.slug}`} className="neu group flex items-center gap-4 rounded-[1.75rem] p-4 transition hover:-translate-y-0.5">
              <div className="neu-inset shrink-0 rounded-[1.25rem] p-1">
                <Img src={sv.image || "/images/hero.jpg"} alt={sv.name} className="h-20 w-20 rounded-2xl object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <DynIcon name={sv.icon} className="h-4 w-4 text-primary" />
                  <h3 className="truncate font-bold text-brand-900">{sv.name}</h3>
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-base-content/55">{sv.shortDescription}</p>
                {sv.isBookable && <span className="mt-2 inline-block rounded-full bg-secondary/20 px-2.5 py-0.5 text-[10px] font-bold text-secondary-content">رزرو آنلاین</span>}
              </div>
            </Link>
          ))}
        </div>
      </section>
    ),
    attractions: () => (
      <section key="attractions" className="mx-auto max-w-7xl px-5 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SoftTitle eyebrow={h.attractionsEyebrow} title={h.attractionsTitle} desc={h.attractionsText} />
          <Link href="/attractions" className="btn mb-12 rounded-full px-6">نقشه جاذبه‌ها <ArrowLeft className="h-4 w-4" /></Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {d.attractionList.slice(0, 4).map((a) => (
            <div key={a.id} className="neu rounded-[2rem] p-3">
              <div className="neu-inset rounded-[1.5rem] p-1">
                <Img src={a.image || "/images/hero.jpg"} alt={a.name} className="aspect-[4/3] w-full rounded-[1.25rem] object-cover" />
              </div>
              <div className="px-2 pb-2 pt-4">
                <div className="text-[11px] font-bold text-primary">{a.category}</div>
                <h3 className="mt-1 font-bold text-brand-900">{a.name}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-base-content/55">{a.description}</p>
                <span className="neu-inset-sm mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] text-base-content/65"><MapPin className="h-3 w-3" />{a.travelTime || `${faNum(a.distanceKm)} کیلومتر`}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    ),
    reviews: () => (
      <section key="reviews" className="mx-auto max-w-7xl px-5 py-16">
        <SoftTitle eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} center />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {d.reviews.slice(0, 3).map((t) => (
            <figure key={t.id} className="neu relative rounded-[2rem] p-7">
              <span className="neu-inset-sm absolute left-6 top-6 grid h-10 w-10 place-items-center rounded-full text-secondary"><Quote className="h-4 w-4" /></span>
              <div className="flex">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-400 text-gold-400" />)}</div>
              <blockquote className="mt-4 text-sm leading-7 text-base-content/70">{t.body}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className="neu-inset-sm grid h-11 w-11 place-items-center rounded-full font-black text-primary">{t.name[0]}</span>
                <span><span className="block text-sm font-bold text-brand-900">{t.name}</span><span className="text-xs text-base-content/50">{t.city}</span></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),
    track: () => (
      <section key="track" id="track" className="mx-auto max-w-7xl scroll-mt-28 px-5 py-16">
        <div className="neu-lg grid items-center gap-8 rounded-[2.5rem] p-6 md:p-10 lg:grid-cols-2">
          <div>
            <span className="neu-sm grid h-16 w-16 place-items-center rounded-full text-primary"><SearchCheck className="h-7 w-7" /></span>
            <h2 className="mt-6 text-3xl font-black text-brand-900">{h.trackTitle}</h2>
            <p className="mt-3 max-w-lg leading-8 text-base-content/60">{h.trackText}</p>
          </div>
          <div className="neu-inset rounded-[2rem] p-6">
            <TrackLookup />
          </div>
        </div>
      </section>
    ),
    map: () => (
      <section key="map" className="mx-auto max-w-7xl px-5 py-16">
        <div className="neu-lg grid gap-5 rounded-[2.5rem] p-4 lg:grid-cols-[1fr_1.5fr]">
          <div className="flex flex-col justify-center p-5 md:p-7">
            <span className="neu-inset-sm w-fit rounded-full px-4 py-1.5 text-xs font-bold text-primary">{h.mapEyebrow}</span>
            <h2 className="mt-4 text-3xl font-black text-brand-900">{h.mapTitle}</h2>
            <ul className="mt-6 space-y-3 text-sm text-base-content/70">
              <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s.address}</li>
              {s.phone && <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-primary" /><span dir="ltr">{faNum(s.phone)}</span></li>}
              {s.email && <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-primary" />{s.email}</li>}
              <li className="flex gap-3"><Clock className="h-4 w-4 shrink-0 text-primary" />ورود {faNum(s.checkInTime)} · خروج {faNum(s.checkOutTime)}</li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              {h.mapCta && <Link href="/booking" className="btn btn-primary rounded-full px-6">{h.mapCta}</Link>}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="btn rounded-full px-6"><Navigation className="h-4 w-4" /> مسیریابی</a>
            </div>
          </div>
          <div className="neu-inset rounded-[2rem] p-2">
            <MapView center={{ lat, lng }} zoom={15} className="h-[420px] !rounded-[1.6rem]" markers={[{ lat, lng, title: s.hotelName, subtitle: s.address, kind: "hotel" }]} />
          </div>
        </div>
      </section>
    ),
  };

  return (
    <>
      {/* HERO */}
      <section className="mx-auto max-w-7xl px-5 pb-6 pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
          <div className="animate-fade-up">
            {(h.heroBadge || stars > 0) && (
              <span className="neu-inset-sm inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-base-content/70">
                {stars > 0 && <span className="flex">{Array.from({ length: stars }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />)}</span>}
                {h.heroBadge}
              </span>
            )}
            <h1 className="mt-6 text-5xl font-black leading-[1.25] text-brand-900 md:text-6xl">
              {h.heroTitle}
              {h.heroHighlight && <span className="mt-2 block text-3xl font-bold text-primary md:text-4xl">{h.heroHighlight}</span>}
            </h1>
            {h.heroText && <p className="mt-6 max-w-xl text-lg leading-9 text-base-content/60">{h.heroText}</p>}
            <div className="mt-9 flex flex-wrap gap-4">
              {h.heroPrimaryCta && <Link href="/booking" className="btn btn-primary btn-lg rounded-full px-8"><CalendarCheck className="h-5 w-5" /> {h.heroPrimaryCta}</Link>}
              {h.heroSecondaryCta && <Link href="/rooms" className="btn btn-lg rounded-full px-8">{h.heroSecondaryCta}</Link>}
            </div>
          </div>
          <div className="relative">
            <div className="neu-lg rounded-[2.75rem] p-4">
              <div className="neu-inset rounded-[2.25rem] p-2">
                <div className="relative aspect-[4/3.3] overflow-hidden rounded-[1.9rem]">
                  <MediaPlaylist items={h.heroMedia} fallback="/images/hero.jpg" indicatorClassName="bottom-4 left-1/2 -translate-x-1/2" />
                </div>
              </div>
            </div>
            {s.address && (
              <div className="neu absolute -bottom-6 right-6 hidden max-w-64 items-center gap-3 rounded-2xl p-3 sm:flex">
                <span className="neu-inset-sm grid h-10 w-10 shrink-0 place-items-center rounded-full text-primary"><MapPin className="h-4 w-4" /></span>
                <span className="min-w-0"><span className="block text-[11px] text-base-content/50">{s.city || "موقعیت"}</span><span className="block truncate text-xs font-bold text-brand-900">{s.address}</span></span>
              </div>
            )}
          </div>
        </div>
        {h.stats.length > 0 && (
          <div className="mt-14 grid grid-cols-2 gap-5 md:grid-cols-4">
            {h.stats.slice(0, 4).map((x, i) => (
              <div key={i} className="neu-inset flex items-center gap-4 rounded-[1.5rem] p-4">
                <span className="neu-sm grid h-12 w-12 shrink-0 place-items-center rounded-full text-primary"><DynIcon name={x.icon} className="h-5 w-5" /></span>
                <span><span className="block text-2xl font-black text-brand-900">{x.value}</span><span className="block text-xs text-base-content/55">{x.label}</span></span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-10">
          <StaySearch variant="soft" maxGuests={maxGuests} />
        </div>
      </section>

      {visibleSections(d).map((k) => sections[k]?.())}
    </>
  );
}
