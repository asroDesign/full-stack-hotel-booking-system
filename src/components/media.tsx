"use client";

import { Img } from "@/components/img";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Expand, X, PlayCircle } from "lucide-react";
import { cn, parseVideo } from "@/lib/utils";

export function VideoPlayer({ url, poster, className }: { url: string; poster?: string; className?: string }) {
  const v = parseVideo(url);
  if (!v) return null;
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-3xl bg-black shadow-xl", className)}>
      {v.kind === "iframe" ? (
        <iframe src={v.src} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen" allowFullScreen />
      ) : (
        <video src={v.src} poster={poster} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
      )}
    </div>
  );
}

export function Gallery({ images, alt, hasVideo }: { images: string[]; alt: string; hasVideo?: boolean }) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const list = images.length ? images : ["/images/hero.jpg"];

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft") setActive((a) => (a + 1) % list.length);
      if (e.key === "ArrowRight") setActive((a) => (a - 1 + list.length) % list.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, list.length]);

  return (
    <div>
      <div className="group relative aspect-[16/10] overflow-hidden rounded-3xl bg-slate-200">
        <Img key={list[active]} src={list[active]} alt={alt} priority={active === 0} className="h-full w-full animate-fade-up object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent" />
        <button onClick={() => setLightbox(true)} className="frost absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-xl text-white">
          <Expand className="h-4 w-4" />
        </button>
        {hasVideo && (
          <a href="#video" className="frost absolute bottom-4 right-4 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white">
            <PlayCircle className="h-4 w-4" /> مشاهده ویدیو
          </a>
        )}
        {list.length > 1 && (
          <>
            <button onClick={() => setActive((a) => (a - 1 + list.length) % list.length)} className="frost absolute right-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-white opacity-0 transition group-hover:opacity-100">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={() => setActive((a) => (a + 1) % list.length)} className="frost absolute left-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-white opacity-0 transition group-hover:opacity-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
      {list.length > 1 && (
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {list.map((src, i) => (
            <button key={src + i} onClick={() => setActive(i)} className={cn("h-20 w-28 shrink-0 overflow-hidden rounded-2xl ring-2 transition", i === active ? "ring-gold-400" : "opacity-60 ring-transparent hover:opacity-100")}>
              <Img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
      {lightbox && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-black/90 p-4 backdrop-blur" onClick={() => setLightbox(false)}>
          <button className="absolute left-5 top-5 grid h-11 w-11 place-items-center rounded-full bg-white/10 text-white"><X /></button>
          <Img src={list[active]} alt={alt} priority className="max-h-[85vh] max-w-full rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
