"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { starWord, type NavItem } from "@/lib/modules";
import { phoneHref } from "@/lib/format";

export default function SiteHeader({
  hotelName,
  phone,
  email,
  city,
  stars,
  nav,
}: {
  hotelName: string;
  phone: string;
  email: string;
  city: string;
  stars: number;
  nav: NavItem[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-50">
      <div className="h-[2px] bg-gradient-to-l from-gold-500 via-gold-300 to-transparent" />
      <div className={`border-b border-gold-300/20 transition-all ${scrolled ? "bg-[#08211d]/97 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.9)] backdrop-blur-md" : "bg-[#0b3b33]/95"}`}>
        <div className="hidden border-b border-white/10 md:block">
          <div className="container-x flex items-center justify-between gap-3 py-1.5 text-[10px] text-cream-200/60">
            <div className="flex items-center gap-2">
              <span className="tracking-[0.2em] text-gold-300">{"★".repeat(stars)}</span>
              <span className="font-bold text-cream-100">{starWord(stars)}</span>
              <span className="mx-1 h-3 w-px bg-white/15" />
              <span>📍 {city}</span>
              <span className="mx-1 hidden h-3 w-px bg-white/15 sm:block" />
              <span className="hidden sm:inline">پذیرش و کانسیرژ ۲۴ ساعته</span>
            </div>
            <div className="flex items-center gap-3">
              <a href={`mailto:${email}`} dir="ltr" className="hidden transition hover:text-gold-300 sm:inline">
                {email}
              </a>
              <a href={phoneHref(phone)} dir="ltr" className="font-bold text-cream-100 transition hover:text-gold-300">
                ☎ {phone}
              </a>
            </div>
          </div>
        </div>

        <div className="container-x flex h-[68px] items-center justify-between gap-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative flex h-10 w-10 items-center justify-center border border-gold-400/60">
              <span className="absolute inset-[3px] border border-gold-400/25 transition group-hover:border-gold-400/70" />
              <span className="relative text-base font-black text-gold-300">ک</span>
            </span>
            <span className="leading-tight">
              <span className="block text-[15px] font-black tracking-tight text-cream-50">{hotelName}</span>
              <span className="mt-0.5 flex items-center gap-1.5 text-[9px] font-semibold text-cream-200/55">
                <span className="tracking-[0.16em] text-gold-300">{"★".repeat(stars)}</span>
                <span>{starWord(stars)} · {city}</span>
              </span>
            </span>
          </Link>

          <nav className="hidden xl:block">
            <ul className="flex items-center gap-0.5">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`relative block px-2 py-2 text-[11px] font-bold transition ${
                      isActive(item.href) ? "text-gold-300" : "text-cream-100/65 hover:text-gold-200"
                    }`}
                  >
                    {item.label}
                    {isActive(item.href) ? <span className="absolute inset-x-2 -bottom-0.5 h-px bg-gold-400" aria-hidden="true" /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/concierge" className="hidden text-[10px] font-bold text-cream-100/60 transition hover:text-gold-300 lg:inline-flex">
              کانسیرژ
            </Link>
            <Link href="/booking" className="btn btn-gold btn-sm hidden sm:inline-flex">
              رزرو اقامت
              <span aria-hidden="true">←</span>
            </Link>
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              aria-label="منوی ناوبری"
              aria-expanded={open}
              className="flex h-9 w-9 items-center justify-center border border-gold-400/40 text-cream-100 xl:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>

        {open ? (
          <div className="border-t border-gold-400/20 bg-[#0b3b33] xl:hidden">
            <div className="container-x grid max-h-[70vh] grid-cols-2 gap-1 overflow-y-auto py-3">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`border-b border-white/5 px-2.5 py-2.5 text-sm font-semibold transition ${
                    isActive(item.href) ? "text-gold-300" : "text-cream-100/75 hover:text-gold-200"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/concierge" className="border-b border-white/5 px-2.5 py-2.5 text-sm font-semibold text-cream-100/75">
                کانسیرژ
              </Link>
              <Link href="/track" className="border-b border-white/5 px-2.5 py-2.5 text-sm font-semibold text-cream-100/75">
                پیگیری رزرو
              </Link>
              <Link href="/booking" className="btn btn-gold col-span-2 mt-2">
                رزرو آنلاین اقامت
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}
