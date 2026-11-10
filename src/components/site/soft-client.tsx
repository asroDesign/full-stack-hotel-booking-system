"use client";

import { Img } from "@/components/img";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Clock, Sparkles } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

export type SoftVenue = {
  id: number;
  slug: string;
  name: string;
  kind: string;
  tagline: string;
  cuisine: string;
  hours: { label: string; time: string }[];
  images: string[];
  signatures: { id: number; name: string; description: string; price: number }[];
};

/** Neumorphic segmented control: inset track, raised active pill. */
export function SoftDiningTabs({ venues, cta }: { venues: SoftVenue[]; cta: string }) {
  const [active, setActive] = useState(0);
  const v = venues[active] ?? venues[0];
  if (!v) return null;
  return (
    <div>
      {venues.length > 1 && (
        <div className="mb-10 flex justify-center">
          <div role="tablist" className="neu-inset no-scrollbar flex max-w-full gap-1 overflow-x-auto rounded-full p-1.5">
            {venues.map((x, i) => (
              <button
                key={x.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cn("whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-all", i === active ? "neu-sm text-primary" : "text-base-content/60 hover:text-primary")}
              >
                {x.name}
              </button>
            ))}
          </div>
        </div>
      )}
      <div key={v.id} className="neu-lg grid animate-fade-up items-center gap-8 rounded-[2.5rem] p-5 md:p-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="neu-inset rounded-[2rem] p-2">
          <div className="grid grid-cols-3 gap-2">
            <Img src={v.images[0] || "/images/hero.jpg"} alt={v.name} className="col-span-3 aspect-[16/10] w-full rounded-[1.6rem] object-cover" />
            {v.images.slice(1, 4).map((src, i) => (
              <Img key={i} src={src} alt="" className="aspect-square w-full rounded-2xl object-cover" />
            ))}
          </div>
        </div>
        <div className="px-1">
          <span className="neu-inset-sm inline-flex rounded-full px-4 py-1.5 text-xs font-bold text-primary">{v.kind}{v.cuisine && ` · ${v.cuisine}`}</span>
          <h3 className="mt-4 text-3xl font-black text-brand-900">{v.name}</h3>
          {v.tagline && <p className="mt-2 text-base-content/60">{v.tagline}</p>}
          {v.hours.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {v.hours.map((h, i) => (
                <span key={i} className="neu-sm flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-base-content/70"><Clock className="h-3.5 w-3.5 text-primary" />{h.label}: {h.time}</span>
              ))}
            </div>
          )}
          {v.signatures.length > 0 && (
            <ul className="neu-inset mt-6 space-y-3 rounded-[1.5rem] p-5">
              {v.signatures.slice(0, 4).map((m) => (
                <li key={m.id} className="flex items-start justify-between gap-3">
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-bold text-brand-900"><Sparkles className="h-3.5 w-3.5 text-secondary" />{m.name}</span>
                    {m.description && <span className="mt-0.5 block text-xs text-base-content/50">{m.description}</span>}
                  </span>
                  <span className="shrink-0 text-sm font-black text-primary">{formatPrice(m.price)}</span>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/dining/${v.slug}`} className="btn btn-primary mt-7 rounded-full px-7">{cta} <ArrowLeft className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  );
}
