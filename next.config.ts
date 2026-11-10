import type { NextConfig } from "next";

const SCRIPT_SRC = process.env.NODE_ENV === "development"
  ? "'self' 'unsafe-inline' 'unsafe-eval'"
  : "'self' 'unsafe-inline'";

const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      `script-src ${SCRIPT_SRC}`,
      "object-src 'none'",
      "connect-src 'self' https:",
      "frame-src 'self' https://www.openstreetmap.org https://www.google.com",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Native image processing is executed only in the upload route (Node runtime).
  serverExternalPackages: ["sharp", "heic-convert"],
  reactStrictMode: true,
  compress: true,
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/feed.xml",
        headers: [{ key: "Cache-Control", value: "public, max-age=600, s-maxage=600" }],
      },
      // Content pages are safe to cache briefly at the edge/proxy: booking is
      // handled by dedicated API routes, and data tags are revalidated from
      // the admin panel.
      ...["/", "/rooms", "/rooms/:slug", "/offers", "/events", "/reviews", "/facilities", "/attractions", "/gallery", "/about", "/contact", "/dining", "/pool"].map(
        (source) => ({
          source,
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
            },
          ],
        }),
      ),
    ];
  },
};

export default nextConfig;
