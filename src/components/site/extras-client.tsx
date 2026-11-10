"use client";

import { Img } from "@/components/img";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Copy, X, MessageCircle, Phone, ArrowUp, CloudSun, Sun, Cloud, CloudRain, CloudSnow, CloudFog, CloudLightning, Wind } from "lucide-react";
import { cn, faNum } from "@/lib/utils";

export function CopyCode({ code, className }: { code: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(code).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className={cn("inline-flex items-center gap-2 rounded-field border border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-primary transition hover:bg-primary/10", className)}
      title="کپی کد"
      dir="ltr"
    >
      {code}
      {done ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 opacity-70" />}
    </button>
  );
}

export type GalleryImage = { id: number; url: string; caption: string; category: string };

export function GalleryGrid({ items, filter = true, columns = "columns-2 md:columns-3 lg:columns-4" }: { items: GalleryImage[]; filter?: boolean; columns?: string }) {
  const cats = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const list = cat === "all" ? items : items.filter((i) => i.category === cat);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o + 1) % list.length));
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o - 1 + list.length) % list.length));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, list.length]);

  return (
    <div>
      {filter && cats.length > 1 && (
        <div role="tablist" className="tabs tabs-box no-scrollbar mx-auto mb-8 w-fit max-w-full flex-nowrap overflow-x-auto">
          {["all", ...cats].map((c) => (
            <button key={c} type="button" role="tab" onClick={() => setCat(c)} className={cn("tab whitespace-nowrap", cat === c && "tab-active !text-primary font-bold")}>
              {c === "all" ? "همه" : c}
            </button>
          ))}
        </div>
      )}
      <div className={cn("gap-4 [&>*]:mb-4", columns)}>
        {list.map((it, i) => (
          <button key={it.id} type="button" onClick={() => setOpen(i)} className="group relative block w-full break-inside-avoid overflow-hidden rounded-box">
            <Img src={it.url} alt={it.caption} loading="lazy" className="w-full object-cover transition duration-700 group-hover:scale-105" />
            {it.caption && (
              <span className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/70 to-transparent p-3 text-right text-sm text-white transition group-hover:translate-y-0">{it.caption}</span>
            )}
          </button>
        ))}
      </div>
      {open !== null && list[open] && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 backdrop-blur" onClick={() => setOpen(null)} role="dialog">
          <button type="button" className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white" aria-label="بستن"><X /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + list.length) % list.length); }} className="absolute right-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white" aria-label="قبلی"><ChevronRight /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % list.length); }} className="absolute left-4 top-1/2 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white" aria-label="بعدی"><ChevronLeft /></button>
          <figure className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Img src={list[open].url} alt={list[open].caption} priority className="max-h-[80vh] w-auto rounded-2xl object-contain" />
            <figcaption className="mt-3 flex justify-between text-sm text-white/80">
              <span>{list[open].caption}</span>
              <span>{faNum(open + 1)} / {faNum(list.length)}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  );
}

const WMO: Record<number, [string, typeof Sun]> = {
  0: ["صاف", Sun], 1: ["عمدتاً صاف", Sun], 2: ["نیمه‌ابری", CloudSun], 3: ["ابری", Cloud],
  45: ["مه", CloudFog], 48: ["مه", CloudFog], 51: ["نم‌نم باران", CloudRain], 53: ["نم‌نم باران", CloudRain], 55: ["نم‌نم باران", CloudRain],
  61: ["باران", CloudRain], 63: ["باران", CloudRain], 65: ["باران شدید", CloudRain], 71: ["برف", CloudSnow], 73: ["برف", CloudSnow], 75: ["برف شدید", CloudSnow],
  80: ["رگبار", CloudRain], 81: ["رگبار", CloudRain], 82: ["رگبار شدید", CloudRain], 85: ["بارش برف", CloudSnow], 86: ["بارش برف", CloudSnow], 95: ["رعد و برق", CloudLightning], 96: ["رعد و برق", CloudLightning], 99: ["رعد و برق", CloudLightning],
};
const wmo = (c: number) => WMO[c] ?? ["—", Cloud];
const DAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

type Weather = { t: number; code: number; wind: number; days: { date: string; max: number; min: number; code: number }[] };

/** Live weather (Open-Meteo, no API key). Hides itself silently on any error. */
export function WeatherWidget({ lat, lng, city, className, dark }: { lat: number; lng: number; city?: string; className?: string; dark?: boolean }) {
  const [w, setW] = useState<Weather | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const ctl = new AbortController();
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=4`, { signal: ctl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) =>
        setW({
          t: Math.round(d.current.temperature_2m),
          code: d.current.weather_code,
          wind: Math.round(d.current.wind_speed_10m),
          days: d.daily.time.slice(1, 4).map((date: string, i: number) => ({ date, max: Math.round(d.daily.temperature_2m_max[i + 1]), min: Math.round(d.daily.temperature_2m_min[i + 1]), code: d.daily.weather_code[i + 1] })),
        }),
      )
      .catch(() => setFailed(true));
    return () => ctl.abort();
  }, [lat, lng]);
  if (failed) return null;
  if (!w) return <div className={cn("skeleton h-36 rounded-box", className)} />;
  const [label, Icon] = wmo(w.code);
  return (
    <div className={cn("rounded-box p-5", dark ? "bg-white/5 text-white ring-1 ring-white/10" : "tpl-card bg-base-100 ring-1 ring-base-300", className)}>
      <div className="flex items-center justify-between">
        <div>
          <div className={cn("text-xs", dark ? "text-white/60" : "text-base-content/55")}>هوای اکنون {city}</div>
          <div className="mt-1 flex items-baseline gap-2"><span className="text-4xl font-black">{faNum(w.t)}°</span><span className="text-sm">{label}</span></div>
          <div className={cn("mt-1 flex items-center gap-1 text-xs", dark ? "text-white/60" : "text-base-content/55")}><Wind className="h-3.5 w-3.5" />باد {faNum(w.wind)} کیلومتر</div>
        </div>
        <Icon className={cn("h-14 w-14", dark ? "text-gold-300" : "text-warning")} />
      </div>
      <div className={cn("mt-4 grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs", dark ? "border-white/10" : "border-base-300")}>
        {w.days.map((d) => {
          const [, DI] = wmo(d.code);
          return (
            <div key={d.date}>
              <div className={dark ? "text-white/60" : "text-base-content/55"}>{DAYS[new Date(d.date + "T12:00:00").getDay()]}</div>
              <DI className="mx-auto my-1 h-5 w-5 opacity-80" />
              <div className="font-bold">{faNum(d.max)}° <span className="font-normal opacity-60">{faNum(d.min)}°</span></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function FloatingContact({ phone, whatsapp }: { phone: string; whatsapp: string }) {
  const [top, setTop] = useState(false);
  useEffect(() => {
    const on = () => setTop(window.scrollY > 700);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col gap-2 print:hidden">
      {top && (
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="grid h-11 w-11 animate-fade-up place-items-center rounded-full bg-base-100 text-base-content shadow-lg ring-1 ring-base-300" aria-label="بالای صفحه">
          <ArrowUp className="h-5 w-5" />
        </button>
      )}
      {phone && <a href={`tel:${phone}`} className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-content shadow-xl transition hover:scale-110" aria-label="تماس"><Phone className="h-5 w-5" /></a>}
      {whatsapp && <a href={`https://wa.me/${whatsapp.replace(/[^\d]/g, "")}`} target="_blank" rel="noreferrer" className="grid h-12 w-12 place-items-center rounded-full bg-[#25d366] text-white shadow-xl transition hover:scale-110" aria-label="واتس‌اپ"><MessageCircle className="h-6 w-6" /></a>}
    </div>
  );
}
