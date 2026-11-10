"use client";

import { useEffect, useMemo, useState } from "react";
import type { GalleryItem } from "@/db/schema";
import { toFa } from "@/lib/format";
import SmartImage from "@/components/site/SmartImage";

export default function GalleryGrid({ items }: { items: GalleryItem[] }) {
  const categories = useMemo(() => ["همه", ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const [active, setActive] = useState("همه");
  const [lightbox, setLightbox] = useState<number | null>(null);

  const filtered = active === "همه" ? items : items.filter((item) => item.category === active);

  useEffect(() => {
    if (lightbox === null) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
      if (event.key === "ArrowLeft") setLightbox((index) => (index === null ? null : (index + 1) % filtered.length));
      if (event.key === "ArrowRight")
        setLightbox((index) => (index === null ? null : (index - 1 + filtered.length) % filtered.length));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, filtered.length]);

  return (
    <div className="space-y-6">
      <div className="neu-inset tabs tabs-box flex w-fit max-w-full justify-start gap-1 overflow-x-auto rounded-full border-0 bg-transparent p-1.5">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActive(category)}
            className={`tab whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${
              active === category ? "tab-active neu-raised-sm text-forest-800" : "text-forest-800/60 hover:text-forest-950"
            }`}
          >
            {category}
            <span className="mr-1.5 text-[10px] opacity-60">
              {toFa(category === "همه" ? items.length : items.filter((item) => item.category === category).length)}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-cream-300 p-12 text-center text-sm text-forest-800/60">
          تصویری در این دسته ثبت نشده است.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setLightbox(index)}
              className={`group relative overflow-hidden rounded-2xl ${
                index % 7 === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-[4/3]"
              }`}
            >
              <SmartImage
                src={item.imageUrl}
                alt={item.title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-forest-950/75 via-forest-950/10 to-transparent opacity-0 transition group-hover:opacity-100" />
              <span className="absolute inset-x-3 bottom-3 translate-y-2 text-start text-[11px] font-semibold text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                {item.title}
              </span>
            </button>
          ))}
        </div>
      )}

      {lightbox !== null && filtered[lightbox] ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#2c332f]/85 p-4 backdrop-blur"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-h-full w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <SmartImage
              src={filtered[lightbox].imageUrl}
              alt={filtered[lightbox].title}
              className="max-h-[80vh] w-full rounded-2xl object-contain"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-white">
              <span>{filtered[lightbox].title}</span>
              <span className="text-cream-200/60">
                {toFa(lightbox + 1)} از {toFa(filtered.length)}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -top-11 left-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="بستن"
            >
              ✕
            </button>
            <button
              type="button"
              onClick={() => setLightbox((index) => (index === null ? null : (index + 1) % filtered.length))}
              className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="بعدی"
            >
              ›
            </button>
            <button
              type="button"
              onClick={() =>
                setLightbox((index) => (index === null ? null : (index - 1 + filtered.length) % filtered.length))
              }
              className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
              aria-label="قبلی"
            >
              ‹
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
