import Link from "next/link";
import type { Settings } from "@/db/schema";
import { hasDining, starWord, type HotelModules } from "@/lib/modules";
import { toFa } from "@/lib/format";
import NewsletterForm from "@/components/site/NewsletterForm";

export default function SiteFooter({ settings, modules }: { settings: Settings; modules: HotelModules }) {
  const quickLinks = [
    { href: "/rooms", label: "اتاق‌ها و سوئیت‌ها" },
    { href: "/offers", label: "پیشنهادها و پکیج‌ها" },
    ...(hasDining(modules) ? [{ href: "/dining", label: "کافه و رستوران" }] : []),
    { href: "/events", label: "رویدادها" },
    ...(modules.pool ? [{ href: "/pool", label: "استخر" }] : []),
    { href: "/facilities", label: "امکانات و اسپا" },
  ];
  const guestLinks = [
    { href: "/booking", label: "ثبت درخواست رزرو" },
    { href: "/track", label: "پیگیری رزرو" },
    { href: "/reviews", label: "نظرات مهمانان" },
    { href: "/concierge", label: "کانسیرژ و خدمات" },
    { href: "/attractions", label: "جاذبه‌های اطراف" },
    { href: "/gallery", label: "گالری" },
    { href: "/about", label: "درباره هتل" },
  ];

  return (
    <footer className="mt-14 pb-16 md:pb-0">
      <div className="bg-[#08211d] text-cream-200">
        <div className="container-x">
          <div className="grid gap-6 border-b border-gold-400/20 py-8 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-gold-300">خبرنامه کاج</span>
              <p className="mt-1 text-lg font-black text-cream-50">پیشنهادهای ویژه را زودتر از همه دریافت کنید</p>
              <p className="mt-1 text-[10px] leading-5 text-cream-200/55">
                بسته‌های فصلی، رویدادها و کدهای تخفیف محدود؛ بدون ایمیل اضافی.
              </p>
            </div>
            <NewsletterForm source="footer" />
          </div>

          <div className="grid gap-8 py-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.2fr]">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center border border-gold-400/50 text-base font-black text-gold-300">ک</span>
                <div>
                  <p className="text-sm font-black text-cream-50">{settings.hotelName}</p>
                  <p className="text-[9px] font-bold text-gold-300">{"★".repeat(settings.starRating)} {starWord(settings.starRating)}</p>
                </div>
              </div>
              <p className="text-[10px] leading-6 text-cream-200/55">{settings.tagline}</p>
              <div className="flex gap-2">
                {settings.instagram ? (
                  <a href={settings.instagram} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center border border-white/15 text-[9px] font-bold text-cream-200/70 transition hover:border-gold-400 hover:text-gold-300">
                    IG
                  </a>
                ) : null}
                {settings.telegram ? (
                  <a href={settings.telegram} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center border border-white/15 text-[9px] font-bold text-cream-200/70 transition hover:border-gold-400 hover:text-gold-300">
                    TG
                  </a>
                ) : null}
                <a href={settings.whatsappLink || "#"} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center border border-white/15 text-[9px] font-bold text-cream-200/70 transition hover:border-gold-400 hover:text-gold-300">
                  WA
                </a>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold-300">دسترسی سریع</p>
              <ul className="space-y-1.5 text-[10px]">
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-cream-200/60 transition hover:text-gold-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold-300">مهمانان</p>
              <ul className="space-y-1.5 text-[10px]">
                {guestLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-cream-200/60 transition hover:text-gold-200">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2 text-[10px] text-cream-200/60">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-gold-300">تماس</p>
              <p className="leading-6">{settings.address}</p>
              <p dir="ltr">☎ {settings.phone}</p>
              <p dir="ltr">✉ {settings.email}</p>
              {hasDining(modules) ? (
                <p className="border border-white/10 bg-white/5 px-3 py-2 leading-5">
                  🍽 {settings.diningTitle} · {settings.diningHours}
                </p>
              ) : null}
              <p className="text-cream-200/40">
                ورود {settings.checkInTime} · تخلیه {settings.checkOutTime} · {toFa(settings.totalRooms)} اتاق
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-between gap-2 border-t border-gold-400/20 py-4 text-[9px] text-cream-200/45 sm:flex-row">
            <p>{`© ۱۴۰۴ تمامی حقوق برای ${settings.hotelName} محفوظ است.`}</p>
            <p className="flex items-center gap-1.5">
              <span>طراحی توسط</span>
              <a
                href="https://asrodev.ir"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-gold-300 underline-offset-4 transition hover:text-gold-200 hover:underline"
              >
                آسرودیزاین
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
