/* Client-safe sanitising helpers (no server-only imports). */

/** Escape text before inserting it into raw HTML strings (e.g. Leaflet popups). */
export function escapeHtml(input: unknown): string {
  return String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Allow only safe URLs: http(s) absolute URLs or same-site relative paths.
 * Blocks javascript:, data:, vbscript:, protocol-relative (//evil) etc.
 */
export function safeUrl(input: unknown): string {
  const u = String(input ?? "").trim();
  if (!u) return "";
  if (u.startsWith("/") && !u.startsWith("//") && !u.startsWith("/\\")) return u;
  try {
    const parsed = new URL(u);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") return parsed.toString();
  } catch {
    /* invalid */
  }
  return "";
}

export function safeUrlList(list: string[]): string[] {
  return list.map(safeUrl).filter(Boolean);
}

