"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { imageFullUrl, imageThumbUrl } from "@/lib/images";

type SmartImageProps = {
  src: string;
  alt: string;
  className?: string;
  thumbSrc?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  fetchPriority?: "high" | "low" | "auto";
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
  title?: string;
  maxWidth?: number;
};

type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/**
 * Progressive, performance-first image:
 *  - paints a small thumbnail immediately
 *  - only starts downloading the full asset when the image approaches the viewport
 *  - skips the full download on save-data / very slow connections
 *  - caps remote image dimensions instead of pulling 1400px files
 */
export default function SmartImage({
  src,
  alt,
  className = "",
  thumbSrc,
  loading = "lazy",
  decoding = "async",
  fetchPriority = "auto",
  width,
  height,
  sizes,
  priority = false,
  style,
  title,
  maxWidth,
}: SmartImageProps) {
  const wrapperRef = useRef<HTMLImageElement | null>(null);
  const settled = useRef(false);
  const thumb = thumbSrc || imageThumbUrl(src);
  const [current, setCurrent] = useState(thumb || src);
  const [ready, setReady] = useState(!thumb || thumb === src);

  useEffect(() => {
    settled.current = false;
    if (!src) return;
    if (!thumb || thumb === src) {
      setCurrent(src);
      setReady(true);
      return;
    }

    setCurrent(thumb);
    setReady(false);

    const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    const slowNetwork = Boolean(connection?.saveData) || ["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
    if (slowNetwork) {
      // Keep the light thumbnail on constrained connections.
      setReady(true);
      return;
    }

    // Choose a single right-sized candidate for this viewport/DPR instead of
    // downloading a desktop asset on a phone (no duplicate downloads).
    const viewport = window.innerWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const base = priority
      ? viewport < 640
        ? 720
        : viewport < 1024
          ? 1000
          : 1400
      : viewport < 640
        ? 620
        : viewport < 1024
          ? 800
          : Math.min(maxWidth ?? 900, 1100);
    const chosenWidth = Math.round(Math.min(base * (dpr > 1.5 ? 1.15 : 1), maxWidth ?? 1400));
    const fullSrc = imageFullUrl(src, chosenWidth);
    let cancelled = false;
    let started = false;

    const preload = () => {
      if (started || cancelled) return;
      started = true;
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.src = fullSrc;
      const finish = () => {
        if (cancelled) return;
        settled.current = true;
        setCurrent(fullSrc);
        setReady(true);
      };
      preloader.onload = finish;
      preloader.onerror = finish;
      if (typeof preloader.decode === "function") preloader.decode().then(finish).catch(() => undefined);
    };

    if (priority) {
      preload();
      return () => {
        cancelled = true;
      };
    }

    const node = wrapperRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      preload();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
          observer.disconnect();
          const win = window as Window & {
            requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => void;
          };
          if (typeof win.requestIdleCallback === "function") {
            win.requestIdleCallback(preload, { timeout: 1200 });
          } else {
            window.setTimeout(preload, 120);
          }
        }
      },
      { rootMargin: "280px 0px", threshold: 0.01 },
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [src, thumb, priority, maxWidth]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={wrapperRef}
      src={current || src}
      alt={alt}
      className={className}
      loading={priority ? "eager" : loading}
      decoding={decoding}
      fetchPriority={priority ? "high" : fetchPriority}
      width={width}
      height={height}
      sizes={sizes}
      title={title}
      data-image-ready={ready ? "true" : "false"}
      style={{
        ...style,
        filter: ready ? undefined : "blur(10px)",
        transform: ready ? undefined : "scale(1.02)",
        transition: "filter .4s ease, transform .4s ease",
      }}
    />
  );
}
