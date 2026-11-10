"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ImgHTMLAttributes } from "react";
import { fullSrc, lowSrc } from "@/lib/img-src";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string;
  /** Load the full image immediately (above-the-fold / hero). */
  priority?: boolean;
};

/**
 * Progressive image: renders the small WebP preview first (blurred), then swaps in the full image
 * once it has been downloaded – only when the image is near the viewport.
 * A single <img> element is rendered, so existing classes / layouts keep working.
 */
export const Img = forwardRef<HTMLImageElement, Props>(function Img({ src = "", priority, loading, onError, alt = "", ...rest }, outer) {
  const ref = useRef<HTMLImageElement>(null);
  useImperativeHandle(outer, () => ref.current as HTMLImageElement);
  const low = lowSrc(src);
  const full = fullSrc(src);
  const progressive = !!src && low !== src;
  const [state, setState] = useState({ key: src, cur: progressive ? low : full, done: !progressive });
  const view = state.key === src ? state : { key: src, cur: progressive ? low : full, done: !progressive };

  useEffect(() => {
    setState({ key: src, cur: progressive ? low : full, done: !progressive });
    if (!src || (!progressive && full === src)) return;
    const el = ref.current;
    let cancelled = false;
    const load = (url: string, fallback?: string) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => !cancelled && setState({ key: src, cur: url, done: true });
      im.onerror = () => {
        if (fallback) load(fallback);
        else if (!cancelled) setState({ key: src, cur: src, done: true });
      };
      im.src = url;
    };
    const upgrade = () => load(full, full !== src ? src : undefined);
    if (priority || !el || typeof IntersectionObserver === "undefined") {
      upgrade();
      return () => {
        cancelled = true;
      };
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          io.disconnect();
          upgrade();
        }
      },
      { rootMargin: "500px 0px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      {...rest}
      alt={alt}
      src={view.cur || undefined}
      data-lq={view.done ? "0" : "1"}
      loading={priority ? "eager" : (loading ?? "lazy")}
      decoding="async"
      onError={(e) => {
        // preview missing (e.g. legacy upload) → show the original
        if (view.cur !== src && src) setState({ key: src, cur: src, done: true });
        onError?.(e);
      }}
    />
  );
});
