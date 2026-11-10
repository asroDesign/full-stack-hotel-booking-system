import type { ReactNode } from "react";
import SiteHeader from "@/components/site/SiteHeader";
import SiteFooter from "@/components/site/SiteFooter";
import MobileActionBar from "@/components/site/MobileActionBar";
import { getSettings } from "@/lib/data";
import { modulesFromSettings, publicNav } from "@/lib/modules";
import { phoneHref } from "@/lib/format";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const settings = await getSettings();
  const modules = modulesFromSettings(settings);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader
        hotelName={settings.hotelName}
        phone={settings.phone}
        email={settings.email}
        city={settings.city}
        stars={settings.starRating}
        nav={publicNav(modules)}
      />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <SiteFooter settings={settings} modules={modules} />

      <MobileActionBar phone={settings.phone} whatsappLink={settings.whatsappLink} />

      <div className="fixed bottom-20 left-4 z-40 hidden flex-col gap-2 md:flex md:bottom-5">
        <a
          href={settings.whatsappLink || "https://wa.me/989112345678"}
          target="_blank"
          rel="noreferrer"
          aria-label="گفتگو در واتس‌اپ"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-card transition hover:scale-105"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
            <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.06c-.24.68-1.41 1.3-1.94 1.36-.53.05-1.03.24-3.47-.72-2.94-1.16-4.79-4.2-4.94-4.4-.14-.2-1.16-1.55-1.16-2.95s.73-2.09 1-2.38c.26-.29.58-.36.77-.36s.39 0 .56.01c.19.01.44-.07.69.53.24.58.82 2 .89 2.14.07.15.12.32.02.51-.1.2-.19.32-.39.5-.19.19-.29.32-.42.51-.13.2-.29.4-.12.69.17.29.77 1.27 1.65 2.06 1.13 1.01 2.09 1.32 2.38 1.47.29.15.46.12.63-.07.17-.2.73-.85.93-1.14.19-.29.39-.24.65-.15.26.09 1.68.79 1.97.93.29.15.48.22.55.34.07.12.07.7-.17 1.38z" />
          </svg>
        </a>
        <a
          href={phoneHref(settings.phone)}
          aria-label="تماس تلفنی"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-500 text-white shadow-card transition hover:scale-105"
        >
          ☎
        </a>
      </div>
    </div>
  );
}
