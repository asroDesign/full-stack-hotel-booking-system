import { Img } from "@/components/img";
import Link from "next/link";
import { ArrowLeft, Star, MapPin, Users, Maximize, Eye, Phone, Mail, Clock, ChevronDown, Navigation, Quote } from "lucide-react";
import { faNum, formatPrice } from "@/lib/utils";
import { minServicePrice } from "@/lib/booking";
import { venueKindLabel } from "@/lib/dining";
import { TrackSection } from "@/components/site/booking-sections";
import { StaySearch } from "@/components/site/stay-search";
import { Carousel, DiningTabs } from "@/components/site/grand-client";
import { DynIcon } from "@/components/dyn-icon";
import { MapView } from "@/components/map-view";
import { MediaPlaylist } from "@/components/media-playlist";
import { visibleSections, type HomeData } from "./data";
import { StayPackagesSection } from "@/components/site/stay-packages-section";
import { FaqSection, GallerySection, OffersSection } from "@/components/site/extras-sections";

function Eyebrow({ children, light, center }: { children: React.ReactNode; light?: boolean; center?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] ${light ? "text-gold-300" : "text-gold-600"} ${center ? "justify-center" : ""}`}>
      <span className={`h-px w-10 ${light ? "bg-gold-300/60" : "bg-gold-500/70"}`} />
      {children}
      {center && <span className={`h-px w-10 ${light ? "bg-gold-300/60" : "bg-gold-500/70"}`} />}
    </div>
  );
}

function Title({ eyebrow, title, desc, light, center }: { eyebrow?: string; title: string; desc?: string; light?: boolean; center?: boolean }) {
  return (
    <div className={`mb-12 max-w-2xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <Eyebrow light={light} center={center}>{eyebrow}</Eyebrow>}
      <h2 className={`mt-4 text-4xl font-extralight leading-[1.35] md:text-5xl ${light ? "text-white" : "text-brand-950"}`}>{title}</h2>
      {desc && <p className={`mt-5 leading-8 ${light ? "text-white/60" : "text-base-content/60"}`}>{desc}</p>}
    </div>
  );
}

export function GrandHome({ d }: { d: HomeData }) {
  const { s, h } = d;
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  const stars = Number(s.stars) || 0;
  const overlay = Math.min(90, Math.max(0, h.heroOverlay)) / 100;
  const maxGuests = Math.max(2, ...d.allRooms.map((r) => r.capacity + r.extraBeds));
  const heroImage = h.heroMedia.find((m) => m.type === "image")?.url || "/images/hero.jpg";
  const avgRating = d.reviews.length ? d.reviews.reduce((a, r) => a + r.rating, 0) / d.reviews.length : 0;

  const sections: Record<string, () => React.ReactNode> = {
    packages: () => <StayPackagesSection key="packages" packages={d.packages} />,
    offers: () => <OffersSection key="offers" offers={d.offers} eyebrow={h.offersEyebrow} title={h.offersTitle} text={h.offersText} />,
    gallery: () => <GallerySection key="gallery" items={d.gallery} eyebrow={h.galleryEyebrow} title={h.galleryTitle} />,
    faq: () => <FaqSection key="faq" faqs={d.faqList} eyebrow={h.faqEyebrow} title={h.faqTitle} />,
    features: () => (
      <section key="features" className="mx-auto max-w-6xl px-6 pt-12">
        <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-5">
          {h.features.slice(0, 4).map((f, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full border border-gold-500/40 text-gold-600"><DynIcon name={f.icon} className="h-5 w-5" /></span>
              <span><span className="block text-sm font-bold text-brand-950">{f.title}</span><span className="block text-xs text-base-content/55">{f.text}</span></span>
            </li>
          ))}
        </ul>
      </section>
    ),
    rooms: () => (
      <section key="rooms" className="py-24">
        <Carousel header={<Title eyebrow={h.roomsEyebrow} title={h.roomsTitle} desc={h.roomsText} />}>
          {d.featured.map((r, i) => (
            <Link key={r.id} href={`/rooms/${r.slug}`} className="group relative h-[520px] w-[82vw] shrink-0 snap-start overflow-hidden rounded-box sm:w-[400px]">
              <Img src={r.images[0] || "/images/hero.jpg"} alt={r.name} className="absolute inset-0 h-full w-full object-cover transition duration-[1.2s] group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/20 to-transparent" />
              <div className="absolute right-5 top-5 text-5xl font-extralight text-white/70">{faNum(String(i + 1).padStart(2, "0"))}</div>
              <span className="absolute left-5 top-5 rounded-field bg-white/15 px-3 py-1 text-xs text-white backdrop-blur">{r.type}</span>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <h3 className="text-2xl font-bold">{r.name}</h3>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/70">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{faNum(r.capacity)}{r.extraBeds ? `+${faNum(r.extraBeds)}` : ""} نفر</span>
                  <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{faNum(r.size)} متر</span>
                  {r.view && <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{r.view}</span>}
                </div>
                <div className="mt-5 flex items-end justify-between border-t border-white/15 pt-4">
                  <div><span className="text-xs text-white/60">هر شب از</span><div className="text-xl font-black text-gold-300">{formatPrice(r.pricePerNight)} <span className="text-xs font-normal text-white/60">تومان</span></div></div>
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-white/30 transition group-hover:border-gold-300 group-hover:bg-gold-300 group-hover:text-brand-950"><ArrowLeft className="h-5 w-5" /></span>
                </div>
              </div>
            </Link>
          ))}
          <Link href="/rooms" className="flex h-[520px] w-64 shrink-0 snap-start flex-col items-center justify-center gap-4 rounded-box border border-dashed border-brand-300 text-brand-800 transition hover:bg-brand-50">
            <span className="text-6xl font-extralight">{faNum(d.allRooms.length)}</span>
            <span className="text-sm">اتاق و سوئیت</span>
            <span className="btn btn-primary btn-sm">مشاهده همه <ArrowLeft className="h-4 w-4" /></span>
          </Link>
        </Carousel>
      </section>
    ),
    spotlight: () => {
      const sp = d.spotlight!;
      return (
        <section key="spotlight" className="relative isolate overflow-hidden py-28 md:py-36">
          <div className="absolute inset-0 -z-20"><MediaPlaylist items={h.poolMedia} fallback={sp.image || "/images/pool.jpg"} indicatorClassName="bottom-6 left-6" /></div>
          <div className="absolute inset-0 -z-10 bg-gradient-to-l from-brand-950/95 via-brand-950/60 to-transparent" />
          <div className="mx-auto max-w-7xl px-6">
            <div className="max-w-xl text-white">
              <Eyebrow light>{h.poolEyebrow}</Eyebrow>
              <h2 className="mt-4 text-4xl font-extralight leading-tight md:text-6xl">{h.poolTitle || sp.name}</h2>
              <p className="mt-5 text-lg leading-9 text-white/70">{h.poolText || sp.shortDescription}</p>
              {h.poolFeatures.length > 0 && (
                <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {h.poolFeatures.map((f, i) => <li key={i} className="flex items-center gap-2 border-b border-white/10 pb-3"><span className="h-1.5 w-1.5 rotate-45 bg-gold-300" />{f}</li>)}
                </ul>
              )}
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <Link href={`/services/${sp.slug}`} className="btn btn-secondary btn-lg">{h.poolCta}</Link>
                {minServicePrice(sp) > 0 && <span className="text-sm text-white/60">از <b className="text-lg text-white">{formatPrice(minServicePrice(sp))}</b> تومان · {sp.priceUnit}</span>}
              </div>
            </div>
          </div>
        </section>
      );
    },
    dining: () => (
      <section key="dining" className="bg-brand-950 py-24 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <Title eyebrow={h.diningEyebrow} title={h.diningTitle} desc={h.diningText} light center />
          <DiningTabs
            cta={h.diningCta}
            venues={d.venues.slice(0, 5).map((v) => ({
              id: v.id,
              slug: v.slug,
              name: v.name,
              kind: venueKindLabel(v.kind),
              tagline: v.tagline,
              description: v.description,
              cuisine: v.cuisine,
              hours: v.hours,
              images: v.images,
              signatures: d.signatures.filter((m) => m.venueId === v.id).map((m) => ({ id: m.id, name: m.name, description: m.description, price: m.price })),
            }))}
          />
        </div>
      </section>
    ),
    amenities: () => (
      <section key="amenities" className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <Title eyebrow={h.amenitiesEyebrow} title={h.amenitiesTitle} desc={h.amenitiesText} />
            <Link href="/amenities" className="btn btn-outline btn-primary -mt-4">همه امکانات <ArrowLeft className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-px overflow-hidden rounded-box bg-base-300 ring-1 ring-base-300 sm:grid-cols-2 xl:grid-cols-3">
            {d.amenityList.slice(0, 9).map((a) => (
              <div key={a.id} className="group bg-base-100 p-7 transition duration-300 hover:bg-brand-950">
                <DynIcon name={a.icon} className="h-8 w-8 text-gold-600 transition group-hover:text-gold-300" />
                <h3 className="mt-5 font-bold text-brand-950 transition group-hover:text-white">{a.title}</h3>
                <p className="mt-2 text-sm leading-6 text-base-content/55 transition group-hover:text-white/60">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    ),
    services: () => (
      <section key="services" className="bg-base-100 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <Title eyebrow={h.servicesEyebrow} title={h.servicesTitle} center />
          <div className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
            {d.svcList.slice(0, 6).map((sv, i) => (
              <Link key={sv.id} href={`/services/${sv.slug}`} className="group">
                <div className="relative aspect-[16/10] overflow-hidden rounded-box">
                  <Img src={sv.image || "/images/hero.jpg"} alt={sv.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  {sv.isBookable && <span className="absolute left-3 top-3 rounded-field bg-gold-400 px-2.5 py-1 text-[11px] font-bold text-brand-950">رزرو آنلاین</span>}
                </div>
                <div className="mt-5 flex gap-4">
                  <span className="text-4xl font-extralight leading-none text-gold-500">{faNum(String(i + 1).padStart(2, "0"))}</span>
                  <div>
                    <h3 className="text-lg font-bold text-brand-950 group-hover:text-brand-700">{sv.name}</h3>
                    <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-base-content/55">{sv.shortDescription}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    attractions: () => {
      const list = d.attractionList.slice(0, 5);
      return (
        <section key="attractions" className="mx-auto max-w-7xl px-6 py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Title eyebrow={h.attractionsEyebrow} title={h.attractionsTitle} desc={h.attractionsText} />
            <Link href="/attractions" className="btn btn-outline btn-primary mb-12">نقشه جاذبه‌ها <ArrowLeft className="h-4 w-4" /></Link>
          </div>
          <div className="grid auto-rows-[220px] gap-4 md:grid-cols-4">
            {list.map((a, i) => (
              <Link key={a.id} href="/attractions" className={`group relative overflow-hidden rounded-box ${i === 0 ? "md:col-span-2 md:row-span-2" : ""}`}>
                <Img src={a.image || "/images/hero.jpg"} alt={a.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 via-brand-950/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-gold-300">{a.category}</div>
                  <h3 className={`mt-1 font-bold ${i === 0 ? "text-3xl" : "text-lg"}`}>{a.name}</h3>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-white/70"><MapPin className="h-3.5 w-3.5" />{a.travelTime || `${faNum(a.distanceKm)} کیلومتر`}</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      );
    },
    reviews: () => {
      const loop = [...d.reviews, ...d.reviews];
      return (
        <section key="reviews" className="overflow-hidden bg-brand-50/60 py-24">
          <div className="mx-auto mb-12 flex max-w-7xl flex-wrap items-end justify-between gap-6 px-6">
            <Title eyebrow={h.reviewsEyebrow} title={h.reviewsTitle} />
            <div className="mb-12 flex items-center gap-4">
              <span className="text-7xl font-extralight text-brand-900">{faNum(avgRating.toFixed(1))}</span>
              <div>
                <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.round(avgRating) ? "fill-gold-500 text-gold-500" : "text-base-300"}`} />)}</div>
                <div className="mt-1 text-xs text-base-content/55">میانگین {faNum(d.reviews.length)} نظر مهمانان</div>
              </div>
            </div>
          </div>
          <div className="group">
            <div className="flex w-max animate-marquee gap-5 group-hover:[animation-play-state:paused]">
              {loop.map((t, i) => (
                <figure key={`${t.id}-${i}`} className="w-[340px] shrink-0 rounded-box bg-base-100 p-6 shadow-sm ring-1 ring-base-300">
                  <Quote className="h-7 w-7 text-gold-400" />
                  <blockquote className="mt-3 line-clamp-4 text-sm leading-7 text-base-content/70">{t.body}</blockquote>
                  <figcaption className="mt-5 flex items-center justify-between border-t border-base-200 pt-4">
                    <span><span className="block text-sm font-bold text-brand-950">{t.name}</span><span className="text-xs text-base-content/50">{t.city}</span></span>
                    <span className="flex">{Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-gold-500 text-gold-500" />)}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    },
    track: () => <div key="track" className="mx-auto max-w-7xl px-6 py-16"><TrackSection title={h.trackTitle} text={h.trackText} /></div>,
    map: () => (
      <section key="map" className="relative">
        <MapView center={{ lat, lng }} zoom={15} className="h-[560px] !rounded-none" markers={[{ lat, lng, title: s.hotelName, subtitle: s.address, kind: "hotel" }]} />
        <div className="pointer-events-none absolute inset-0 z-[500] mx-auto flex max-w-7xl items-center px-6">
          <div className="pointer-events-auto w-full max-w-sm bg-brand-950/95 p-8 text-white shadow-2xl backdrop-blur">
            <Eyebrow light>{h.mapEyebrow}</Eyebrow>
            <h3 className="mt-3 text-2xl font-extralight">{h.mapTitle}</h3>
            <ul className="mt-6 space-y-3 text-sm text-white/75">
              <li className="flex gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />{s.address}</li>
              {s.phone && <li className="flex gap-3"><Phone className="h-4 w-4 shrink-0 text-gold-300" /><span dir="ltr">{faNum(s.phone)}</span></li>}
              {s.email && <li className="flex gap-3"><Mail className="h-4 w-4 shrink-0 text-gold-300" />{s.email}</li>}
              <li className="flex gap-3"><Clock className="h-4 w-4 shrink-0 text-gold-300" />ورود {faNum(s.checkInTime)} · خروج {faNum(s.checkOutTime)}</li>
            </ul>
            <div className="mt-7 flex gap-2">
              {h.mapCta && <Link href="/booking" className="btn btn-secondary btn-sm">{h.mapCta}</Link>}
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="btn btn-sm border-white/20 bg-white/5 text-white hover:bg-white/10"><Navigation className="h-3.5 w-3.5" /> مسیریابی</a>
            </div>
          </div>
        </div>
      </section>
    ),
  };

  const collage = [heroImage, d.featured[0]?.images[0], d.venues[0]?.images[0] ?? d.featured[1]?.images[0]].filter(Boolean) as string[];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate flex min-h-[100svh] items-center overflow-hidden">
        <div className="absolute inset-0 -z-20"><MediaPlaylist items={h.heroMedia} fallback="/images/hero.jpg" indicatorClassName="bottom-24 left-6" /></div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-950/50 via-brand-950/30 to-brand-950/85" />
        <div className="absolute inset-0 -z-10 bg-brand-950" style={{ opacity: overlay * 0.5 }} />
        <div className="mx-auto w-full max-w-5xl px-6 pb-36 pt-36 text-center text-white">
          {stars > 0 && (
            <div className="flex animate-fade-up items-center justify-center gap-4 text-gold-300">
              <span className="h-px w-14 bg-gold-300/60" />
              <span className="flex gap-1">{Array.from({ length: stars }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</span>
              <span className="h-px w-14 bg-gold-300/60" />
            </div>
          )}
          {h.heroBadge && <div className="mt-5 animate-fade-up text-xs uppercase tracking-[0.4em] text-white/75">{h.heroBadge}</div>}
          <h1 className="mt-6 animate-fade-up text-5xl font-extralight leading-[1.2] md:text-8xl">{h.heroTitle}</h1>
          {h.heroHighlight && <p className="mt-4 animate-fade-up text-2xl font-black text-gold-300 md:text-4xl">{h.heroHighlight}</p>}
          {h.heroText && <p className="mx-auto mt-6 max-w-2xl animate-fade-up text-base leading-9 text-white/80 md:text-lg">{h.heroText}</p>}
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {h.heroPrimaryCta && <Link href="/booking" className="btn btn-secondary btn-lg px-10">{h.heroPrimaryCta}</Link>}
            {h.heroSecondaryCta && <Link href="/rooms" className="btn btn-lg border-white/40 bg-transparent px-10 text-white hover:bg-white/10">{h.heroSecondaryCta}</Link>}
          </div>
        </div>
        <a href="#welcome" aria-label="ادامه" className="absolute bottom-24 left-1/2 hidden -translate-x-1/2 animate-bounce text-white/70 md:block"><ChevronDown className="h-7 w-7" /></a>
      </section>

      {/* STAY SEARCH */}
      <div className="relative z-30 mx-auto -mt-16 max-w-5xl px-4">
        <StaySearch maxGuests={maxGuests} />
      </div>

      {/* WELCOME */}
      <section id="welcome" className="mx-auto grid max-w-7xl scroll-mt-24 items-center gap-16 px-6 py-24 lg:grid-cols-2">
        <div>
          <Eyebrow>{s.aboutTitle || "خوش آمدید"}</Eyebrow>
          <h2 className="mt-5 text-4xl font-extralight leading-[1.4] text-brand-950 md:text-5xl">
            {s.tagline}
            <span className="mt-2 block font-black text-brand-800">{s.hotelName}</span>
          </h2>
          <p className="mt-7 leading-9 text-base-content/65">{s.aboutText.split("\n")[0]}</p>
          {h.stats.length > 0 && (
            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-base-300 pt-8">
              {h.stats.slice(0, 4).map((x, i) => (
                <div key={i} className="flex items-center gap-4">
                  <dt className="text-4xl font-extralight text-brand-800">{x.value}</dt>
                  <dd className="text-xs leading-5 text-base-content/55">{x.label}</dd>
                </div>
              ))}
            </dl>
          )}
          <Link href="/about" className="btn btn-link mt-6 px-0 text-brand-800">داستان ما را بخوانید <ArrowLeft className="h-4 w-4" /></Link>
        </div>
        <div className="relative h-[480px] md:h-[560px]">
          {collage[0] && (
            <Img src={collage[0]} alt={s.hotelName} className="absolute right-0 top-0 h-[78%] w-[72%] rounded-box object-cover shadow-xl" />
          )}
          {collage[1] && (
            <Img src={collage[1]} alt="" className="absolute bottom-0 left-0 h-[55%] w-[52%] rounded-box border-8 border-base-100 object-cover shadow-2xl" />
          )}
          {collage[2] && (
            <Img src={collage[2]} alt="" className="absolute bottom-[8%] right-[8%] hidden h-28 w-40 rounded-box border-4 border-base-100 object-cover shadow-xl md:block" />
          )}
          {stars > 0 && (
            <div className="absolute left-[6%] top-[10%] grid h-32 w-32 place-items-center rounded-full bg-brand-950 text-center text-white shadow-2xl ring-8 ring-base-100">
              <div className="absolute inset-2 animate-spin-slow rounded-full border border-dashed border-gold-300/50" />
              <div>
                <div className="text-4xl font-extralight text-gold-300">{faNum(stars)}</div>
                <div className="text-[10px] tracking-widest text-white/70">ستاره</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {visibleSections(d).map((k) => sections[k]?.())}
    </>
  );
}
