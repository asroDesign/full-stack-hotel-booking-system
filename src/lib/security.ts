/** Input sanitisation & CSRF helpers shared by API routes. */

const ALLOWED_URL = /^(https?:\/\/[^\s]+|\/[^\s]*)$/i;

/**
 * Only absolute http(s) URLs and in-app relative paths are accepted for
 * image/video/iframe sources. This blocks `javascript:` and `data:` payloads
 * coming from admin forms (stored XSS vector).
 */
export function safeUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!ALLOWED_URL.test(trimmed)) return "";
  if (trimmed.startsWith("/") && (trimmed.startsWith("//") || trimmed.includes("\\"))) return "";
  return trimmed.slice(0, 2048);
}

/** Removes control characters, HTML tags and trims overly long values. */
export function sanitizeText(value: unknown, maxLength = 5000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<\s*\/?\s*(script|iframe|object|embed|link|meta|style)[^>]*>/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim()
    .slice(0, maxLength);
}

export function sanitizeMultiline(value: unknown, maxLength = 8000): string {
  return sanitizeText(value, maxLength);
}

/** Protects CSV exports from spreadsheet formula injection. */
export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const trimmed = raw.replace(/\r?\n/g, " ").trim();
  const escaped = /^[=+\-@\t]/.test(trimmed) ? `'${trimmed}` : trimmed;
  return `"${escaped.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number | null | undefined)[][]): string {
  return "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/**
 * CSRF protection for mutating requests.
 * Browsers always send `Origin` for cross-site POSTs; if it does not match the
 * request host we reject the call. Non-browser clients without Origin are
 * allowed so the API stays usable from mobile/curl clients.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") return false;
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get("host") ?? new URL(request.url).host;
    return originHost === requestHost;
  } catch {
    return false;
  }
}

export function forbiddenOrigin() {
  return new Response(JSON.stringify({ error: "درخواست غیرمجاز (Origin نامعتبر)." }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-XSS-Protection": "1; mode=block",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "connect-src 'self' https:",
      "frame-src 'self' https://www.openstreetmap.org https://www.google.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self' https://sep.shaparak.ir",
    ].join("; "),
  };
}
