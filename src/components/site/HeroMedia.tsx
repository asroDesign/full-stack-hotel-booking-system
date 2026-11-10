"use client";

import { useEffect, useRef, useState } from "react";
import SmartImage from "@/components/site/SmartImage";

/**
 * Hero media optimized for first paint:
 * the poster image is loaded eagerly (single priority asset) and an optional
 * admin-provided video is only fetched after the guest explicitly taps play.
 */
export default function HeroMedia({
  mediaType,
  imageUrl,
  videoUrl,
  alt,
}: {
  mediaType: string;
  imageUrl: string;
  videoUrl?: string | null;
  alt: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.play().catch(() => undefined);
  }, [playing]);

  return (
    <>
      <SmartImage
        src={imageUrl}
        alt={alt}
        priority
        maxWidth={1300}
        fetchPriority="high"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${playing ? "opacity-0" : "opacity-100"}`}
      />
      {playing && videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={imageUrl}
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setPlaying(false)}
          className="absolute inset-0 h-full w-full object-cover"
          aria-label={alt}
        />
      ) : null}
      {mediaType === "video" && videoUrl && !playing ? (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="glass-pill absolute left-3 top-3 z-10 gap-1.5 !bg-white/85 !text-forest-900 shadow-soft"
          aria-label="پخش ویدیوی معرفی هتل"
        >
          ▶ پخش ویدیو
        </button>
      ) : null}
    </>
  );
}
