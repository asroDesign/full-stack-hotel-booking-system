"use client";

import { Img } from "@/components/img";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Maximize, Users, Eye, Quote, Star, CalendarCheck, Phone, MessageCircle } from "lucide-react";
import { cn, faNum, formatPrice } from "@/lib/utils";

/** Enables [data-reveal] scroll animations inside its subtree (progressive enhancement). */
export function RevealRoot({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const els = root.querySelectorAll("[data-reveal]");
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.95) el.classList.add("is-visible");
      else io.observe(el);
    });
    root.classList.add("reveal-ready");
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(1, window.scrollY / h) : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);
  return <div className="fixed inset-x-0 top-0 z-[60] h-[3px] origin-right bg-gradient-to-l from-gold-400 via-brand-400 to-brand-700" style={{ transform: `scaleX(${p})` }} />;
}

export function RotatingWords({ words, className }: { words: string[]; className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (words.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % words.length), 2600);
    return () => clearInterval(t);
  }, [words.length]);
  return (
    <span className={cn("inline-block [perspective:600px]", className)}>
      <span key={i} className="animate-word-in inline-block">{words[i]}</span>
    </span>
  );
}

/** Counts up from 0 when scrolled into view. Non-numeric values are shown as-is. */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const en = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/٫/g, ".");
  const m = en.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  const target = m ? parseFloat(m[2]) : NaN;
  const decimals = m && m[2].includes(".") ? m[2].split(".")[1].length : 0;
  const [n, setN] = useState(Number.isFinite(target) ? 0 : NaN);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!Number.isFinite(target) || !ref.current) return;
    const el = ref.current;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - start) / 1600);
        setN(target * (1 - Math.pow(1 - k, 3)));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [target]);
  if (!m || !Number.isFinite(target)) return <span className={className}>{value}</span>;
  return (
    <span ref={ref} className={className}>
      {faNum(m[1])}
      {faNum(n.toFixed(decimals))}
      {faNum(m[3])}
    </span>
  );
}

export type AccRoom = { id: number; slug: string; name: string; type: string; image: string; capacity: number; extraBeds: number; size: number; view: string; price: number; short: string };

export function RoomAccordion({ rooms }: { rooms: AccRoom[] }) {
  const [active, setActive] = useState(0);
  return (
    <>
      {/* desktop: expanding panels */}
      <div className="opus-acc hidden h-[560px] lg:flex">
        {rooms.map((r, i) => (
          <div
            key={r.id}
            onMouseEnter={() => setActive(i)}
            onFocus={() => setActive(i)}
            className={cn("group relative min-w-[84px] cursor-pointer overflow-hidden rounded-[1.75rem]", i === active && "is-active")}
          >
            <Img src={r.image || "/images/hero.jpg"} alt={r.name} className={cn("absolute inset-0 h-full w-full object-cover transition duration-[1.2s]", i === active ? "scale-100" : "scale-110 grayscale-[35%]")} />
            <div className={cn("absolute inset-0 transition duration-700", i === active ? "bg-gradient-to-t from-brand-950/90 via-brand-950/20 to-transparent" : "bg-brand-950/55")} />
            <div className={cn("absolute inset-x-0 bottom-8 flex justify-center transition duration-500", i === active ? "opacity-0" : "opacity-100")}>
              <span className="vertical-text text-lg font-bold tracking-wide text-white">{r.name}</span>
            </div>
            <span className={cn("absolute right-5 top-5 text-5xl font-black text-white/25 transition", i === active && "text-white/60")}>{faNum(String(i + 1).padStart(2, "0"))}</span>
            <div className={cn("absolute inset-x-0 bottom-0 p-8 text-white transition duration-700", i === active ? "translate-y-0 opacity-100 delay-200" : "pointer-events-none translate-y-8 opacity-0")}>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur">{r.type}</span>
              <h3 className="mt-3 text-3xl font-black">{r.name}</h3>
              <p className="mt-2 max-w-md text-sm leading-7 text-white/75">{r.short}</p>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/75">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" />{faNum(r.capacity)}{r.extraBeds ? `+${faNum(r.extraBeds)}` : ""} نفر</span>
                <span className="flex items-center gap-1"><Maximize className="h-4 w-4" />{faNum(r.size)} متر</span>
                {r.view && <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{r.view}</span>}
              </div>
              <div className="mt-6 flex items-center gap-5">
                <Link href={`/rooms/${r.slug}`} className="btn btn-secondary rounded-full px-6">مشاهده و رزرو <ArrowLeft className="h-4 w-4" /></Link>
                <span><span className="text-2xl font-black text-gold-300">{formatPrice(r.price)}</span> <span className="text-xs text-white/60">تومان / شب</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* mobile: swipe cards */}
      <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2 lg:hidden">
        {rooms.map((r) => (
          <Link key={r.id} href={`/rooms/${r.slug}`} className="relative h-[460px] w-[82vw] shrink-0 snap-center overflow-hidden rounded-[1.75rem]">
            <Img src={r.image || "/images/hero.jpg"} alt={r.name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <span className="text-xs text-white/70">{r.type}</span>
              <h3 className="text-2xl font-black">{r.name}</h3>
              <div className="mt-3 text-lg font-black text-gold-300">{formatPrice(r.price)} <span className="text-xs font-normal text-white/60">تومان / شب</span></div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

export type HoverVenue = { id: number; slug: string; name: string; kind: string; cuisine: string; tagline: string; image: string; hours: { label: string; time: string }[] };

export function DiningHover({ venues, cta }: { venues: HoverVenue[]; cta: string }) {
  const [active, setActive] = useState(0);
  const v = venues[active] ?? venues[0];
  if (!v) return null;
  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
      <ul className="divide-y divide-white/10 border-y border-white/10">
        {venues.map((x, i) => (
          <li key={x.id}>
            <Link
              href={`/dining/${x.slug}`}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              className={cn("group flex items-center gap-5 py-6 transition", i === active ? "text-white" : "text-white/40 hover:text-white/80")}
            >
              <span className="text-sm font-bold text-gold-300">{faNum(String(i + 1).padStart(2, "0"))}</span>
              <span className="flex-1">
                <span className="block text-3xl font-black md:text-4xl">{x.name}</span>
                <span className={cn("mt-1 block text-sm transition", i === active ? "text-white/60" : "text-transparent")}>{x.kind}{x.cuisine && ` · ${x.cuisine}`}</span>
              </span>
              <span className={cn("grid h-12 w-12 place-items-center rounded-full border transition", i === active ? "border-gold-300 bg-gold-300 text-brand-950" : "border-white/20")}><ArrowLeft className="h-5 w-5" /></span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="relative">
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-[14rem] rounded-b-[2rem] sm:aspect-[5/5]">
          {venues.map((x, i) => (
            <Img key={x.id} src={x.image || "/images/hero.jpg"} alt={x.name} className={cn("absolute inset-0 h-full w-full object-cover transition duration-1000", i === active ? "scale-100 opacity-100" : "scale-110 opacity-0")} />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-white">
            {v.tagline && <p className="text-lg">{v.tagline}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {v.hours.slice(0, 3).map((h, i) => <span key={i} className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs backdrop-blur"><Clock className="h-3 w-3" />{h.label} {h.time}</span>)}
            </div>
            <Link href={`/dining/${v.slug}`} className="btn btn-secondary btn-sm mt-5 rounded-full">{cta} <ArrowLeft className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export type CarouselReview = { id: number; name: string; city: string; rating: number; body: string };

export function ReviewCarousel({ reviews }: { reviews: CarouselReview[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || reviews.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % reviews.length), 6500);
    return () => clearInterval(t);
  }, [paused, reviews.length]);
  const r = reviews[i];
  if (!r) return null;
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} className="relative mx-auto max-w-4xl text-center">
      <Quote className="mx-auto h-14 w-14 text-gold-400" />
      <blockquote key={r.id} className="mt-6 animate-fade-up text-2xl font-light leading-[2] text-brand-950 md:text-3xl">«{r.body}»</blockquote>
      <div key={`a${r.id}`} className="mt-8 animate-fade-up">
        <div className="flex justify-center">{Array.from({ length: r.rating }).map((_, j) => <Star key={j} className="h-4 w-4 fill-gold-500 text-gold-500" />)}</div>
        <div className="mt-2 font-black text-brand-900">{r.name}</div>
        {r.city && <div className="text-sm text-base-content/55">{r.city}</div>}
      </div>
      {reviews.length > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <button type="button" aria-label="قبلی" onClick={() => setI((i - 1 + reviews.length) % reviews.length)} className="btn btn-circle btn-ghost border-base-300"><ChevronRight className="h-5 w-5" /></button>
          <div className="flex gap-2">
            {reviews.map((x, j) => <button key={x.id} type="button" aria-label={`نظر ${j + 1}`} onClick={() => setI(j)} className={cn("h-2 rounded-full transition-all", j === i ? "w-8 bg-brand-700" : "w-2 bg-base-300")} />)}
          </div>
          <button type="button" aria-label="بعدی" onClick={() => setI((i + 1) % reviews.length)} className="btn btn-circle btn-ghost border-base-300"><ChevronLeft className="h-5 w-5" /></button>
        </div>
      )}
    </div>
  );
}

/** Sticky booking dock for mobile (appears after the hero). */
export function MobileDock({ phone, whatsapp }: { phone: string; whatsapp: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const on = () => setShow(window.scrollY > 500);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className={cn("fixed inset-x-3 bottom-3 z-40 transition-all duration-500 md:hidden print:hidden", show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0")}>
      <div className="flex items-center gap-2 rounded-full bg-brand-950/95 p-2 shadow-2xl backdrop-blur">
        {phone && <a href={`tel:${phone}`} aria-label="تماس" className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"><Phone className="h-5 w-5" /></a>}
        {whatsapp && <a href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" aria-label="واتس‌اپ" className="grid h-11 w-11 place-items-center rounded-full bg-[#25d366] text-white"><MessageCircle className="h-5 w-5" /></a>}
        <Link href="/booking" className="btn btn-secondary h-11 flex-1 rounded-full"><CalendarCheck className="h-4 w-4" /> رزرو آنلاین</Link>
      </div>
    </div>
  );
}
