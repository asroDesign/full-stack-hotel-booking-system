"use client";

import { useState } from "react";
import type { Settings } from "@/db/schema";
import { toFa } from "@/lib/format";

/**
 * Map panel loads OpenStreetMap tiles only when the guest asks for them.
 * This keeps third-party requests and JS paint work out of the critical path.
 */
export default function MapPanel({ settings, compact = false }: { settings: Settings; compact?: boolean }) {
  const [visible, setVisible] = useState(false);
  const lat = Number(settings.mapLat) || 37.2719;
  const lng = Number(settings.mapLng) || 55.4323;
  const delta = compact ? 0.03 : 0.05;
  const bbox = [lng - delta, lat - delta / 1.6, lng + delta, lat + delta / 1.6].map((n) => n.toFixed(4)).join("%2C");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  return (
    <div className="panel overflow-hidden">
      <div className="relative">
        {visible ? (
          <iframe
            title="موقعیت هتل روی نقشه"
            src={src}
            className="h-[320px] w-full border-0 sm:h-[420px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <button
            type="button"
            onClick={() => setVisible(true)}
            className="relative flex h-[260px] w-full flex-col items-center justify-center gap-2 overflow-hidden bg-[#eef1ea] text-center sm:h-[320px]"
            aria-label="نمایش نقشه موقعیت هتل"
          >
            <span className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
              <span className="absolute left-1/4 top-0 h-full w-px bg-[#c9d3c6]" />
              <span className="absolute left-2/4 top-0 h-full w-px bg-[#c9d3c6]" />
              <span className="absolute left-3/4 top-0 h-full w-px bg-[#c9d3c6]" />
              <span className="absolute left-0 top-1/3 h-px w-full bg-[#c9d3c6]" />
              <span className="absolute left-0 top-2/3 h-px w-full bg-[#c9d3c6]" />
            </span>
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#0b3b33] text-lg text-gold-300 shadow-card">📍</span>
            <span className="relative text-[12px] font-black text-forest-950">نمایش نقشه و مسیریابی</span>
            <span className="relative max-w-xs px-4 text-[9px] leading-5 text-forest-800/55">{settings.mapAddress || settings.address}</span>
            <span className="relative mt-1 rounded-full border border-gold-400/50 bg-white/70 px-3 py-1 text-[9px] font-bold text-forest-800">
              برای کاهش مصرف داده، نقشه با کلیک بارگذاری می‌شود
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-forest-950">📍 {settings.mapAddress || settings.address}</p>
          <p className="text-[9px] text-forest-800/55">
            مختصات: <span dir="ltr">{toFa(lat.toFixed(4))} , {toFa(lng.toFixed(4))}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={directions} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            مسیریابی
          </a>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=13/${lat}/${lng}`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            نمای بزرگ‌تر
          </a>
        </div>
      </div>
    </div>
  );
}
