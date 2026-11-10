/**
 * Image URL helpers for the progressive (low-res → full) loading pipeline.
 * Uploaded images are stored as `<name>-thumb.webp` + `<name>-full.webp`.
 */
export function imageThumbUrl(src: string | null | undefined): string {
  if (!src) return "";
  if (/-full\.(webp|jpe?g|png)$/i.test(src)) {
    return src.replace(/-full\.(webp|jpe?g|png)$/i, "-thumb.webp");
  }
  try {
    const url = new URL(src);
    if (url.hostname === "images.pexels.com") {
      const width = Number(url.searchParams.get("w") ?? 1200) || 1200;
      const height = Number(url.searchParams.get("h") ?? 900) || 900;
      const thumbWidth = Math.min(480, width);
      url.searchParams.set("w", String(thumbWidth));
      url.searchParams.set("h", String(Math.max(240, Math.round((height / width) * thumbWidth))));
      url.searchParams.set("q", "40");
      return url.toString();
    }
  } catch {
    // relative or invalid URL: fall through
  }
  return src;
}

/**
 * Caps remote (Pexels) image dimensions so cards never download 1400px assets.
 * Local uploads are already optimized by the upload pipeline.
 */
export function imageFullUrl(src: string | null | undefined, maxWidth = 900): string {
  if (!src) return "";
  try {
    const url = new URL(src);
    if (url.hostname === "images.pexels.com") {
      const width = Number(url.searchParams.get("w") ?? 1200) || 1200;
      const height = Number(url.searchParams.get("h") ?? 900) || 900;
      const target = Math.min(width, maxWidth);
      url.searchParams.set("w", String(target));
      url.searchParams.set("h", String(Math.max(240, Math.round((height / width) * target))));
      url.searchParams.set("q", "70");
      return url.toString();
    }
  } catch {
    // relative/invalid URL: keep as-is
  }
  return src;
}

export function isConvertedUpload(src: string | null | undefined): boolean {
  return Boolean(src && /-full\.webp$/i.test(src));
}
