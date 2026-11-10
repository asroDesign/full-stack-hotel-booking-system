/* Client-safe helpers that derive the low-quality preview and the optimised full image URL. */

const OWN = /^\/api\/files\/([a-zA-Z0-9]{8,64})$/;
const LOCAL = /^\/images\/([\w-]+)\.(jpe?g|png)$/i;

/** Small (≈480px) preview URL, or the same URL when no preview is available. */
export function lowSrc(src: string): string {
  if (!src) return src;
  if (OWN.test(src)) return `${src}?v=sm`;
  const local = src.match(LOCAL);
  if (local) return `/images/${local[1]}-sm.webp`;
  if (src.startsWith("https://images.pexels.com/")) {
    try {
      const u = new URL(src);
      const w = Number(u.searchParams.get("w")) || 1200;
      const h = Number(u.searchParams.get("h")) || 0;
      const k = Math.max(1, w / 360);
      u.searchParams.set("w", String(Math.round(w / k)));
      if (h) u.searchParams.set("h", String(Math.round(h / k)));
      u.searchParams.delete("dpr");
      return u.toString();
    } catch {
      return src;
    }
  }
  return src;
}

/** Optimised full-size URL (bundled WebP for local images); falls back to the original on error. */
export function fullSrc(src: string): string {
  const local = src.match(LOCAL);
  if (local) return `/images/${local[1]}.webp`;
  return src;
}
