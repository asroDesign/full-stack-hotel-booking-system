import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "هتل کاج | اقامت چهارستاره در شیراز",
    template: "%s | هتل کاج",
  },
  description:
    "هتل چهارستاره کاج در قلب شیراز؛ سوئیت‌های آرام، اسپا و سلامتی، کافه‑رستوران کاج و رزرو آنلاین با پیش‌پرداخت امن.",
  keywords: [
    "هتل کاج",
    "هتل شیراز",
    "هتل چهار ستاره",
    "کافه رستوران",
    "رزرو هتل شیراز",
    "اقامتگاه بوتیک",
  ],
  openGraph: {
    title: "هتل کاج",
    description: "اقامت آرام در شیراز، با کافه‑رستوران کاج",
    type: "website",
    locale: "fa_IR",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" data-theme="atelier">
      <head>
        <link rel="preload" href="/fonts/vazirmatn-arabic-wght-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="dns-prefetch" href="https://images.pexels.com" />
        <meta name="theme-color" content="#0b3b33" />
      </head>
      <body className="min-h-screen bg-cream-50 text-forest-950 antialiased">
        {children}
      </body>
    </html>
  );
}
