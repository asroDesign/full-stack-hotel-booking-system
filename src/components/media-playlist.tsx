"use client";

import { Img } from "@/components/img";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type PlaylistItem = { url: string; type: "video" | "image"; duration: number };

export function MediaPlaylist({
  items,
  fallback,
  className,
  showIndicators = true,
  indicatorClassName,
}: {
  items: PlaylistItem[];
  fallback: string;
  className?: string;
  showIndicators?: boolean;
  indicatorClassName?: string;
}) {
  const list = items.filter((m) => m.url).length
    ? items.filter((m) => m.url)
    : [{ url: fallback, type: "image" as const, duration: 6 }];
  const len = list.length;
  const [active, setActive] = useState(0);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);

  const next = useCallback(() => setActive((i) => (i + 1) % len), [len]);

  useEffect(() => {
    const cur = list[active];
    videos.current.forEach((v, idx) => {
      if (!v) return;
      if (idx === active) {
        try {
          v.currentTime = 0;
        } catch {}
        v.play().catch(() => {
          // autoplay blocked or failed – move on after a short delay
          if (len > 1) setTimeout(next, 4000);
        });
      } else {
        v.pause();
      }
    });
    if (len > 1 && cur.type === "image") {
      const t = setTimeout(next, Math.max(2, cur.duration || 6) * 1000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, len, next]);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {list.map((m, idx) => {
        const visible = idx === active;
        const near = visible || idx === (active + 1) % len;
        const cls = cn(
          "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000",
          visible ? "opacity-100" : "opacity-0",
        );
        return m.type === "video" ? (
          <video
            key={m.url + idx}
            ref={(el) => {
              videos.current[idx] = el;
            }}
            src={m.url}
            className={cls}
            muted
            playsInline
            autoPlay={idx === 0}
            loop={len === 1}
            preload={near ? "auto" : "metadata"}
            onEnded={() => visible && next()}
            onError={() => visible && len > 1 && next()}
          />
        ) : (
          <Img key={m.url + idx} src={m.url} alt="" priority={idx === 0} className={cn(cls, visible && "animate-[kenburns_12s_ease-out_both]")} />
        );
      })}
      {showIndicators && len > 1 && (
        <div className={cn("absolute z-10 flex gap-1.5", indicatorClassName ?? "bottom-6 left-6")}>
          {list.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`رسانه ${idx + 1}`}
              onClick={() => setActive(idx)}
              className={cn("h-1.5 rounded-full transition-all", idx === active ? "w-8 bg-gold-400" : "w-3 bg-white/50 hover:bg-white/80")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
