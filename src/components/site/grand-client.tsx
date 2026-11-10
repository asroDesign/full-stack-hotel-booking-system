"use client";

import { Img } from "@/components/img";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

/** Horizontal snap carousel (RTL aware) with prev / next buttons. */
export function Carousel({ header, children, dark = false }: { header: ReactNode; children: ReactNode; dark?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  // in RTL containers scrollLeft goes negative towards the end → "next" scrolls by a negative amount
  const go = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: -dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  const btn = cn("btn btn-circle", dark ? "border-white/20 bg-white/10 text-white hover:bg-white/20" : "btn-outline border-base-300");
  return (
    <div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-6">
        <div className="flex-1">{header}</div>
        <div className="mb-12 flex gap-2">
          <button type="button" aria-label="قبلی" onClick={() => go(-1)} className={btn}><ChevronRight className="h-5 w-5" /></button>
          <button type="button" aria-label="بعدی" onClick={() => go(1)} className={btn}><ChevronLeft className="h-5 w-5" /></button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-6 pb-4 [scroll-padding-inline:1.5rem] lg:px-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]">
        {children}
      </div>
    </div>
  );
}

export type DiningTab = {
  id: number;
  slug: string;
  name: string;
  kind: string;
  tagline: string;
  description: string;
  cuisine: string;
  hours: { label: string; time: string }[];
  images: string[];
  signatures: { id: number; name: string; description: string; price: number }[];
};

export function DiningTabs({ venues, cta }: { venues: DiningTab[]; cta: string }) {
  const [active, setActive] = useState(0);
  const v = venues[active] ?? venues[0];
  if (!v) return null;
  return (
    <div>
      {venues.length > 1 && (
        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {venues.map((x, i) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn("rounded-full border px-5 py-2 text-sm transition", i === active ? "border-gold-400 bg-gold-400 font-bold text-brand-950" : "border-white/20 text-white/75 hover:border-white/50")}
            >
              {x.name}
            </button>
          ))}
        </div>
      )}
      <div key={v.id} className="grid animate-fade-up items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden rounded-box">
            <Img src={v.images[0] || "/images/hero.jpg"} alt={v.name} className="h-full w-full object-cover" />
          </div>
          {v.images[1] && (
            <Img src={v.images[1]} alt="" className="absolute -bottom-8 -left-6 hidden h-44 w-44 rounded-box border-4 border-brand-950 object-cover shadow-2xl md:block" />
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-300">{v.kind}{v.cuisine && ` · ${v.cuisine}`}</div>
          <h3 className="mt-3 text-4xl font-extralight leading-tight">{v.name}</h3>
          {v.tagline && <p className="mt-3 text-lg text-white/70">{v.tagline}</p>}
          {v.description && <p className="mt-4 line-clamp-3 leading-8 text-white/55">{v.description.split("\n")[0]}</p>}
          {v.hours.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
              {v.hours.map((h, i) => (
                <span key={i} className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold-300" />{h.label}: {h.time}</span>
              ))}
            </div>
          )}
          {v.signatures.length > 0 && (
            <ul className="mt-8 space-y-4">
              {v.signatures.slice(0, 4).map((m) => (
                <li key={m.id}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-bold">{m.name}</span>
                    <span className="flex-1 border-b border-dashed border-white/20" />
                    <span className="font-bold text-gold-300">{formatPrice(m.price)}</span>
                  </div>
                  {m.description && <div className="mt-1 text-xs text-white/45">{m.description}</div>}
                </li>
              ))}
            </ul>
          )}
          <Link href={`/dining/${v.slug}`} className="btn btn-secondary mt-9">{cta} <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  );
}
