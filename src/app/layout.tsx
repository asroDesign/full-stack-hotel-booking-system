import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "vazirmatn/Vazirmatn-Variable-font-face.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { getSettingsSafe, paletteOf } from "@/lib/appearance";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettingsSafe();
  return {
    title: { default: `${s.hotelName}${s.city ? ` ${s.city}` : ""} | ${s.tagline}`, template: `%s | ${s.hotelName}` },
    description: s.seoDescription,
  };
}

export const viewport: Viewport = { themeColor: "#1c2f52", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const s = await getSettingsSafe();
  return (
    <html lang="fa" dir="rtl" data-theme={paletteOf(s)}>
      <body className="bg-base-200 font-sans text-base-content antialiased">{children}</body>
    </html>
  );
}
