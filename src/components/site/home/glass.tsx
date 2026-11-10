import { Img } from "@/components/img";
import Link from "next/link";
import { ArrowLeft, Star, MapPin, Phone, Mail, Clock, Navigation, Quote, CalendarCheck, SearchCheck, Sparkles } from "lucide-react";
import { faNum, formatPrice } from "@/lib/utils";
import { minServicePrice } from "@/lib/booking";
import { venueKindLabel } from "@/lib/dining";
import { StaySearch } from "@/components/site/stay-search";
import { TrackLookup } from "@/components/site/forms";
import { GlassRoomExplorer } from "@/components/site/glass-client";
import { DynIcon } from "@/components/dyn-icon";
import { MapView } from "@/components/map-view";
import { MediaPlaylist } from "@/components/media-playlist";
import { cn } from "@/lib/utils";
import { visibleSections, type HomeData } from "./data";
import { FaqSection, GallerySection, OffersSection } from "@/components/site/extras-sections";

function GlassTitle({ eyebrow, title, desc, center }: { eyebrow?: string; title: string; desc?: string; center?: boolean }) {
  return (
    <div className={cn("mb-10 max-w-2xl", center && "mx-auto text-center")}>
      {eyebrow && (
        <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-bold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
        </span>
      )}
      <h2 className="mt-4 text-3xl font-black leading-snug text-brand-950 md:text-[2.6rem]">{title}</h2>
      {desc && <p className="mt-4 leading-8 text-base-content/65">{desc}</p>}
    </div>
  );
}

/** Repeat items until the marquee row is long enough to loop smoothly. */
function fill<T>(items: T[], min = 8) {
  if (!items.length) return items;
  const out = [...items];
  while (out.length < min) out.push(...items);
  return out;
}

export function GlassHome({ d }: { d: HomeData }) {
  const { s, h } = d;
  const vis = visibleSections(d);
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  const stars = Number(s.stars) || 0;
  const maxGuests = Math.max(2, ...d.allRooms.map((r) => r.capacity + r.extraBeds));
  const avg = d.reviews.length ? d.reviews.reduce((a, r) => a + r.rating, 0) / d.reviews.length : 0;

  const sections: Record<string, () => React.ReactNode> = {
    offers: () => <OffersSection key="offers" offers={d.offers} eyebrow={h.offersEyebrow} title={h.offersTitle} text={h.offersText} />,
    gallery: () => <GallerySection key="gallery" items={d.gallery} eyebrow={h.galleryEyebrow} title={h.galleryTitle} />,
    faq: () => <FaqSection key="faq" faqs={d.faqList} eyebrow={h.faqEyebrow} title={h.faqTitle} />,
    rooms: () => (
      <section key="rooms" className="mx-auto max-w-7xl px-4 py-16">
        <GlassTitle eyebrow={h.roomsEyebrow} title={h.roomsTitle} desc={h.roomsText} />
        <GlassRoomExplorer
          limit={Math.max(3, h.roomsCount)}
          rooms={d.allRooms.map((r) => ({ id: r.id, slug: r.slug, name: r.name, type: r.type, image: r.images[0] ?? "", capacity: r.capacity, extraBeds: r.extraBeds, size: r.size, view: r.view, price: r.pricePerNight }))}
        />
      </section>
    ),
    spotlight: () => {
      const sp = d.spotlight!;
      return (
        <section key="spotlight" className="mx-auto max-w-7xl px-4 py-16">
          <div className="relative isolate overflow-hidden rounded-[2.25rem] ring-1 ring-white/70">
            <div className="absolute inset-0 -z-20"><MediaPlaylist items={h.poolMedia} fallback={sp.image || "/images/pool.jpg"} indicatorClassName="bottom-5 left-5" /></div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-l from-brand-950/55 via-brand-950/10 to-transparent" />
            <div className="flex min-h-[540px] items-end p-3 md:items-center md:p-8">
              <div className="glass-strong w-full max-w-lg rounded-[1.75rem] p-6 md:p-8">
                <span className="glass-chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-primary"><DynIcon name={sp.icon || "Waves"} className="h-3.5 w-3.5" />{h.poolEyebrow}</span>
                <h2 className="mt-3 text-3xl font-black text-brand-950 md:text-4xl">{h.poolTitle || sp.name}</h2>
                <p className="mt-3 leading-8 text-base-content/65">{h.poolText || sp.shortDescription}</p>
                {h.poolFeatures.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {h.poolFeatures.map((f, i) => <span key={i} className="glass-chip rounded-full px-3 py-1.5 text-xs text-base-content/75">{f}</span>)}
                  </div>
                )}
                {sp.timeSlots.length > 0 && (
                  <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1">
                    {sp.timeSlots.map((t) => (
                      <div key={t} className="glass-chip shrink-0 rounded-xl px-3 py-2 text-center">
                        <div dir="ltr" className="font-mono text-[11px] text-base-content/55">{faNum(t)}</div>
                        <div className="text-sm font-black text-primary">{formatPrice(sp.slotPrices[t] ?? sp.price)}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link href={`/services/${sp.slug}`} className="btn btn-primary rounded-full px-7"><CalendarCheck className="h-4 w-4" /> {h.poolCta}</Link>
                  {minServicePrice(sp) > 0 && <span className="text-sm text-base-content/60">از {formatPrice(minServicePrice(sp))} تومان</span>}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    },
    dining: () => {
      const list = d.venues.slice(0, 3);
      return (
        <section key="dining" className="mx-auto max-w-7xl px-4 py-16">
          <GlassTitle eyebrow={h.diningEyebrow} title={h.diningTitle} desc={h.diningText} center />
          <div className={cn("grid gap-5", list.length === 1 ? "mx-auto max-w-2xl" : list.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
            {list.map((v) => {
              const sig = d.signatures.filter((m) => m.venueId === v.id).slice(0, 3);
              return (
                <Link key={v.id} href={`/dining/${v.slug}`} className="glass-panel group flex flex-col overflow-hidden rounded-[2rem] p-3 transition hover:-translate-y-1">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[1.5rem]">
                    <Img src={v.images[0] || "/images/hero.jpg"} alt={v.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <span className="glass-dark absolute right-3 top-3 rounded-full px-3 py-1 text-xs">{venueKindLabel(v.kind)}</span>
                    {v.hours[0] && <span className="glass-dark absolute bottom-3 left-3 flex items-center gap-1 rounded-full px-3 py-1 text-[11px]"><Clock className="h-3 w-3" />{v.hours[0].time}</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="text-xs font-medium text-primary">{v.cuisine}</div>
                    <h3 className="mt-1 text-xl font-black text-brand-950">{v.name}</h3>
                    {v.tagline && <p className="mt-1 text-sm text-base-content/60">{v.tagline}</p>}
                    {sig.length > 0 && (
                      <ul className="mt-4 space-y-2 rounded-2xl bg-white/45 p-3">
                        {sig.map((m) => (
                          <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate font-medium text-brand-950">{m.name}</span>
                            <span className="shrink-0 font-bold text-primary">{formatPrice(m.price)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-bold text-primary">{h.diningCta} <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      );
    },
    services: () => {
      const list = d.svcList.slice(0, 4);
      const span = ["md:col-span-2 md:row-span-2", "", "", "md:col-span-2"];
      return (
        <section key="services" className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <GlassTitle eyebrow={h.servicesEyebrow} title={h.servicesTitle} />
            {d.svcList.length > list.length && <Link href="/services" className="btn mb-10 rounded-full px-6">همه خدمات <ArrowLeft className="h-4 w-4" /></Link>}
          </div>
          <div className="grid auto-rows-[210px] gap-4 md:grid-cols-4">
            {list.map((sv, i) => (
              <Link key={sv.id} href={`/services/${sv.slug}`} className={cn("group relative overflow-hidden rounded-[1.75rem] ring-1 ring-white/70", span[i])}>
                <Img src={sv.image || "/images/hero.jpg"} alt={sv.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/50 to-transparent" />
                {sv.isBookable && <span className="absolute left-3 top-3 rounded-full bg-gold-400 px-2.5 py-1 text-[11px] font-bold text-brand-950">رزرو آنلاین</span>}
                <div className="glass-dark absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-[1.25rem] p-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20"><DynIcon name={sv.icon} className="h-5 w-5" /></span>
                  <div className="min-w-0">
                    <h3 className="truncate font-bold">{sv.name}</h3>
                    {i === 0 && <p className="mt-0.5 line-clamp-2 text-xs text-white/75">{sv.shortDescription}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    },
    amenities: () => {
      const half = Math.ceil(d.amenityList.length / 2);
      const rows = [fill(d.amenityList.slice(0, half)), fill(d.amenityList.slice(half).length ? d.amenityList.slice(half) : d.amenityList.slice(0, half))];
      return (
        <section key="amenities" className="overflow-hidden py-16">
          <div className="mx-auto max-w-7xl px-4"><GlassTitle eyebrow={h.amenitiesEyebrow} title={h.amenitiesTitle} desc={h.amenitiesText} center /></div>
          {rows.map((row, ri) => (
            <div key={ri} className="group mt-4">
              <div className={cn("flex w-max animate-marquee gap-4 px-2 group-hover:[animation-play-state:paused]", ri === 1 && "[animation-direction:reverse]")}>
                {[...row, ...row].map((a, i) => (
                  <div key={`${a.id}-${i}`} className="glass-panel flex shrink-0 items-center gap-3 rounded-full py-2.5 pe-6 ps-2.5">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-gold-400 text-white"><DynIcon name={a.icon} className="h-5 w-5" /></span>
                    <span><span className="block text-sm font-bold text-brand-950">{a.title}</span><span className="block text-[11px] text-base-content/55">{a.description}</span></span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-8 text-center"><Link href="/amenities" className="btn rounded-full px-7">همه امکانات <ArrowLeft className="h-4 w-4" /></Link></div>
        </section>
      );
    },
    attractions: () => {
      const list = d.attractionList.slice(0, 8);
      const markers = [{ lat, lng, title: s.hotelName, kind: "hotel" as const }, ...list.filter((a) => a.lat && a.lng).map((a) => ({ lat: a.lat, lng: a.lng, title: a.name, subtitle: a.travelTime }))];
      return (
        <section key="attractions" className="mx-auto max-w-7xl px-4 py-16">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <GlassTitle eyebrow={h.attractionsEyebrow} title={h.attractionsTitle} desc={h.attractionsText} />
            <Link href="/attractions" className="btn mb-10 rounded-full px-6">همه جاذبه‌ها <ArrowLeft className="h-4 w-4" /></Link>
          </div>
          <div className="relative overflow-hidden rounded-[2.25rem] ring-1 ring-white/70">
            <MapView center={{ lat, lng }} fitBounds zoom={11} className="h-[560px] !rounded-[2.25rem]" markers={markers} />
            <div className="no-scrollbar absolute inset-y-4 right-4 z-[500] hidden w-[340px] flex-col gap-3 overflow-y-auto md:flex">
              {list.map((a) => (
                <div key={a.id} className="glass-strong flex gap-3 rounded-[1.25rem] p-2.5">
                  <Img src={a.image || "/images/hero.jpg"} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0">
                    <div className="text-[10px] font-bold text-primary">{a.category}</div>
                    <div className="truncate text-sm font-bold text-brand-950">{a.name}</div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-base-content/55"><MapPin className="h-3 w-3" />{a.travelTime || `${faNum(a.distanceKm)} کیلومتر`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 md:hidden">
            {list.map((a) => (
              <div key={a.id} className="glass-panel flex items-center gap-3 rounded-2xl p-2.5">
                <Img src={a.image || "/images/hero.jpg"} alt="" className="h-14 w-14 rounded-xl object-cover" />
                <div className="min-w-0"><div className="truncate text-sm font-bold text-brand-950">{a.name}</div><div className="text-[11px] text-base-content/55">{a.travelTime}</div></div>
              </div>
            ))}
          </div>
        </section>
      );
    },
    reviews: () => (
      <section key="reviews" className="mx-auto max-w-7xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <GlassTitle eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} />
          <div className="glass-panel mb-10 flex items-center gap-4 rounded-2xl px-5 py-3">
            <span className="text-aurora text-4xl font-black">{faNum(avg.toFixed(1))}</span>
            <span>
              <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < Math.round(avg) ? "fill-gold-400 text-gold-400" : "text-base-300")} />)}</span>
              <span className="text-xs text-base-content/55">{faNum(d.reviews.length)} نظر مهمانان</span>
            </span>
          </div>
        </div>
        <div className="columns-1 gap-5 md:columns-2 lg:columns-3">
          {d.reviews.slice(0, 6).map((t) => (
            <figure key={t.id} className="glass-panel mb-5 break-inside-avoid rounded-[1.75rem] p-6">
              <div className="flex items-center justify-between">
                <span className="flex">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-400 text-gold-400" />)}</span>
                <Quote className="h-6 w-6 text-brand-300" />
              </div>
              <blockquote className="mt-4 text-sm leading-7 text-base-content/75">{t.body}</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-gold-400 font-black text-white">{t.name[0]}</span>
                <span><span className="block text-sm font-bold text-brand-950">{t.name}</span><span className="text-xs text-base-content/50">{t.city}</span></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    ),
    track: () => (
      <section key="track" id="track" className="mx-auto max-w-7xl scroll-mt-28 px-4 py-16">
        <div className="glass-panel relative grid items-center gap-8 overflow-hidden rounded-[2.25rem] p-6 md:p-10 lg:grid-cols-2">
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-gold-300/40 blur-3xl" />
          <div className="relative">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30"><SearchCheck className="h-7 w-7" /></span>
            <h2 className="mt-5 text-3xl font-black text-brand-950">{h.trackTitle}</h2>
            <p className="mt-3 max-w-lg leading-8 text-base-content/65">{h.trackText}</p>
          </div>
          <div className="glass-strong relative rounded-[1.75rem] p-6"><TrackLookup /></div>
        </div>
      </section>
    ),
    map: () => (
      <section key="map" className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          <div className="glass-panel flex flex-col justify-center rounded-[2rem] p-7">
            <span className="glass-chip w-fit rounded-full px-4 py-1.5 text-xs font-bold text-primary">{h.mapEyebrow}</span>
            <h2 className="mt-4 text-3xl font-black text-brand-950">{h.mapTitle}</h2>
            <ul className="mt-6 space-y-3 text-sm text-base-content/70">
              <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s.address}</li>
              {s.phone && <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-primary" /><span dir="ltr">{faNum(s.phone)}</span></li>}
              {s.email && <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-primary" />{s.email}</li>}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              {h.mapCta && <Link href="/booking" className="btn btn-primary rounded-full px-6">{h.mapCta}</Link>}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="btn rounded-full px-6"><Navigation className="h-4 w-4" /> مسیریابی</a>
            </div>
          </div>
          <div className="glass-panel rounded-[2rem] p-2">
            <MapView center={{ lat, lng }} zoom={15} className="h-[420px] !rounded-[1.6rem]" markers={[{ lat, lng, title: s.hotelName, subtitle: s.address, kind: "hotel" }]} />
          </div>
        </div>
      </section>
    ),
  };

  return (
    <>
      {/* BENTO HERO */}
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-28">
        <div className="grid gap-4 lg:grid-cols-4">
          {/* main tile */}
          <div className="relative isolate min-h-[480px] overflow-hidden rounded-[2rem] ring-1 ring-white/70 lg:col-span-2 lg:row-span-2 lg:min-h-[580px]">
            <div className="absolute inset-0 -z-20"><MediaPlaylist items={h.heroMedia} fallback="/images/hero.jpg" indicatorClassName="top-5 left-5" /></div>
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-950/90 via-brand-950/35 to-transparent" />
            <div className="flex h-full min-h-[inherit] flex-col justify-end p-7 text-white md:p-9">
              {(h.heroBadge || stars > 0) && (
                <span className="glass-dark w-fit animate-fade-up rounded-full px-4 py-1.5 text-xs">
                  {stars > 0 && <span className="ml-1.5 inline-flex align-middle">{Array.from({ length: stars }).map((_, i) => <Star key={i} className="h-3 w-3 fill-gold-300 text-gold-300" />)}</span>}
                  {h.heroBadge}
                </span>
              )}
              <h1 className="mt-5 animate-fade-up text-4xl font-black leading-[1.25] md:text-6xl">{h.heroTitle}</h1>
              {h.heroHighlight && <p className="mt-2 animate-fade-up bg-gradient-to-l from-gold-300 to-white bg-clip-text text-2xl font-bold text-transparent md:text-3xl">{h.heroHighlight}</p>}
              {h.heroText && <p className="mt-4 max-w-xl animate-fade-up leading-8 text-white/80">{h.heroText}</p>}
              <div className="mt-7 flex flex-wrap gap-3">
                {h.heroPrimaryCta && <Link href="/booking" className="btn btn-primary rounded-full px-7"><CalendarCheck className="h-4 w-4" /> {h.heroPrimaryCta}</Link>}
                {h.heroSecondaryCta && <Link href="/rooms" className="btn btn-ghost glass-dark rounded-full border-white/30 px-7 text-white hover:bg-white/20">{h.heroSecondaryCta}</Link>}
              </div>
            </div>
          </div>

          {/* search tile */}
          <div className="glass-panel rounded-[2rem] p-5 md:p-6 lg:col-span-2">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-lg font-black text-brand-950"><CalendarCheck className="h-5 w-5 text-primary" /> رزرو اقامت</h2>
              <span className="glass-chip rounded-full px-3 py-1 text-[11px] text-base-content/65">بهترین قیمت با رزرو مستقیم</span>
            </div>
            <StaySearch variant="glass" maxGuests={maxGuests} />
          </div>

          {/* stats tile */}
          <div className="glass-panel grid grid-cols-2 gap-3 rounded-[2rem] p-4">
            {(h.stats.length ? h.stats.slice(0, 4) : [{ icon: "BedDouble", value: faNum(d.allRooms.length), label: "اتاق و سوئیت" }]).map((x, i) => (
              <div key={i} className="glass-chip flex flex-col justify-between rounded-2xl p-3">
                <DynIcon name={x.icon} className="h-5 w-5 text-primary" />
                <div className="mt-3 text-xl font-black text-brand-950">{x.value}</div>
                <div className="text-[11px] leading-4 text-base-content/55">{x.label}</div>
              </div>
            ))}
          </div>

          {/* rating / info tile */}
          <div className="glass-panel relative flex flex-col justify-between overflow-hidden rounded-[2rem] p-5">
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-gold-300/50 blur-2xl" />
            <div className="relative">
              {avg > 0 ? (
                <>
                  <div className="text-aurora text-6xl font-black">{faNum(avg.toFixed(1))}</div>
                  <div className="mt-1 flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < Math.round(avg) ? "fill-gold-400 text-gold-400" : "text-base-300")} />)}</div>
                  <div className="mt-1 text-xs text-base-content/55">امتیاز {faNum(d.reviews.length)} مهمان</div>
                </>
              ) : (
                <>
                  <div className="text-aurora text-6xl font-black">{faNum(stars)}</div>
                  <div className="text-xs text-base-content/55">ستاره</div>
                </>
              )}
            </div>
            <div className="relative mt-4 space-y-2 text-xs text-base-content/70">
              <div className="glass-chip flex items-center justify-between rounded-xl px-3 py-2"><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" />ورود</span><b>{faNum(s.checkInTime)}</b></div>
              <div className="glass-chip flex items-center justify-between rounded-xl px-3 py-2"><span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" />خروج</span><b>{faNum(s.checkOutTime)}</b></div>
            </div>
          </div>
        </div>

        {vis.includes("features") && (
          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            {h.features.slice(0, 4).map((f, i) => (
              <div key={i} className="glass-panel flex items-center gap-3 rounded-[1.5rem] p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-gold-400 text-white"><DynIcon name={f.icon} className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-brand-950">{f.title}</span><span className="block truncate text-xs text-base-content/55">{f.text}</span></span>
              </div>
            ))}
          </div>
        )}
      </section>

      {vis.filter((k) => k !== "features").map((k) => sections[k]?.())}
    </>
  );
}
