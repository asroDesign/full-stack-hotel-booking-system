import { headers } from "next/headers";

export { escapeHtml, safeUrl, safeUrlList } from "./sanitize";

/** Strip control characters and clamp length for free-text inputs. */
export function cleanText(input: unknown, max = 2000): string {
  return String(input ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim().slice(0, 64);
  return (h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? "local").slice(0, 64);
}

/** Is the current request served over HTTPS (directly or via a reverse proxy)? */
export async function isHttpsRequest(): Promise<boolean> {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  const h = await headers();
  const proto = (h.get("x-forwarded-proto") ?? "").split(",")[0].trim().toLowerCase();
  if (proto) return proto === "https";
  const origin = h.get("origin") ?? h.get("referer") ?? "";
  return origin.startsWith("https://");
}

/** CSRF protection for route handlers: the Origin (or Referer) must match the host. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic", "image/heif"];
const VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime", "video/ogg"];

export function allowedMime(mime: string): "image" | "video" | null {
  if (IMAGE_MIMES.includes(mime)) return "image";
  if (VIDEO_MIMES.includes(mime)) return "video";
  return null; // SVG, HTML, etc. are rejected (stored-XSS risk)
}

/** Verify the file signature (magic bytes) matches the declared MIME type. */
export function magicMatches(mime: string, head: Uint8Array): boolean {
  const b = head;
  const at = (i: number, bytes: number[]) => bytes.every((x, j) => b[i + j] === x);
  switch (mime) {
    case "image/jpeg":
      return at(0, [0xff, 0xd8, 0xff]);
    case "image/png":
      return at(0, [0x89, 0x50, 0x4e, 0x47]);
    case "image/gif":
      return at(0, [0x47, 0x49, 0x46, 0x38]);
    case "image/webp":
      return at(0, [0x52, 0x49, 0x46, 0x46]) && at(8, [0x57, 0x45, 0x42, 0x50]);
    case "image/heic":
    case "image/heif":
    case "image/avif":
    case "video/mp4":
    case "video/quicktime":
      return at(4, [0x66, 0x74, 0x79, 0x70]); // ....ftyp
    case "video/webm":
      return at(0, [0x1a, 0x45, 0xdf, 0xa3]);
    case "video/ogg":
      return at(0, [0x4f, 0x67, 0x67, 0x53]);
    default:
      return false;
  }
}
