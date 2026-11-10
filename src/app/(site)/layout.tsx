import type { ReactNode } from "react";
import { SiteHeader, type NavLink } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { getSettings } from "@/lib/data";
import { logoLetter, templateOf } from "@/lib/appearance";
import { safeUrl } from "@/lib/sanitize";
import { redactPaymentCredentials } from "@/lib/payment-settings";
import { FloatingContact } from "@/components/site/extras-client";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const s = await getSettings();
  const template = templateOf(s);
  const on = (k: keyof typeof s) => s[k] === "1";
  // header: compact primary navigation (≤ 8 items)
  const links: NavLink[] = [
    { href: "/", label: "خانه" },
    { href: "/rooms", label: "اتاق‌ها" },
    ...(on("moduleDining") ? [{ href: "/dining", label: "رستوران و کافه" }] : []),
    ...(on("moduleOffers") ? [{ href: "/offers", label: "پیشنهادها" }] : []),
    ...(on("moduleServices") ? [{ href: "/services", label: "خدمات" }] : []),
    ...(on("moduleGallery") ? [{ href: "/gallery", label: "گالری" }] : []),
    ...(on("moduleAttractions") ? [{ href: "/attractions", label: "جاذبه‌ها" }] : []),
    { href: "/contact", label: "تماس" },
  ].slice(0, 8);
  // footer: every public page
  const footerLinks: NavLink[] = [
    ...links,
    ...(on("moduleAmenities") ? [{ href: "/amenities", label: "امکانات" }] : []),
    { href: "/about", label: "درباره ما" },
    { href: "/reviews", label: "نظرات مهمانان" },
    { href: "/gift-cards", label: "کارت هدیه" },
    ...(on("stayPortalEnabled") ? [{ href: "/stay", label: "پرتال مهمانان ساکن" }] : []),
    ...(on("moduleFaq") ? [{ href: "/faq", label: "سوالات متداول" }] : []),
  ].filter((l, i, a) => a.findIndex((x) => x.href === l.href) === i);
  const letter = logoLetter(s.hotelName);
  return (
    <div data-tpl={template} className="min-h-screen">
      {template === "glass" && (
        <div aria-hidden className="glass-backdrop">
          <span className="-right-32 -top-32 h-[38rem] w-[38rem] animate-blob bg-brand-300/60 blur-[90px]" />
          <span className="-left-40 top-1/4 h-[34rem] w-[34rem] animate-blob bg-gold-300/60 blur-[90px] [animation-delay:-7s]" />
          <span className="-bottom-48 right-1/4 h-[36rem] w-[36rem] animate-blob bg-pink-300/45 blur-[100px] [animation-delay:-13s]" />
          <span className="left-1/3 top-[55%] h-[24rem] w-[24rem] animate-blob bg-brand-200/70 blur-[80px] [animation-delay:-19s]" />
        </div>
      )}
      <SiteHeader
        hotelName={s.hotelName}
        hotelNameEn={s.hotelNameEn}
        phone={s.phone}
        address={s.address}
        logoUrl={safeUrl(s.logoUrl)}
        logoLetter={letter}
        links={links}
        template={template}
      />
      <main className="min-h-screen">{children}</main>
      <SiteFooter s={{ ...redactPaymentCredentials(s), logoUrl: safeUrl(s.logoUrl), smsApiKey: "" }} links={footerLinks} template={template} logoLetter={letter} />
      {on("floatingContact") && template !== "opus" && <FloatingContact phone={s.phone} whatsapp={s.whatsapp} />}
    </div>
  );
}
