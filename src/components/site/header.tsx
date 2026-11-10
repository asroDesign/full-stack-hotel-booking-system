"use client";

import { Img } from "@/components/img";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, CalendarCheck, Phone, SearchCheck, MapPin } from "lucide-react";
import { cn, faNum } from "@/lib/utils";

export type NavLink = { href: string; label: string };

export type HeaderProps = {
  hotelName: string;
  hotelNameEn: string;
  phone: string;
  address: string;
  logoUrl: string;
  logoLetter: string;
  links: NavLink[];
  template: "luxe" | "boutique" | "grand" | "soft" | "glass" | "opus";
};

function Logo({ p, light }: { p: HeaderProps; light: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 shrink items-center gap-2.5">
      {p.logoUrl ? (
        <Img src={p.logoUrl} alt={p.hotelName} className="h-10 w-auto max-w-[140px] object-contain" />
      ) : (
        <span className={cn("grid h-10 w-10 place-items-center text-lg font-black shadow-md", p.template === "boutique" ? "rounded-md bg-brand-800 text-gold-300" : "rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-brand-950")}>
          {p.logoLetter}
        </span>
      )}
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-base font-extrabold">{p.hotelName}</span>
        {p.hotelNameEn && <span className={cn("block text-[10px] uppercase tracking-[0.25em]", light ? "text-white/70" : "text-base-content/50")}>{p.hotelNameEn}</span>}
      </span>
    </Link>
  );
}

export function SiteHeader(p: HeaderProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const mobile = open && (
    <div className="frost-light mx-auto mt-2 max-w-7xl animate-fade-up rounded-box p-3 shadow-xl lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        {p.links.map((l) => (
          <Link key={l.href} href={l.href} className={cn("rounded-field px-4 py-3 text-sm font-medium", isActive(l.href) ? "bg-brand-700 text-white" : "bg-white/70 text-slate-700 hover:bg-white")}>
            {l.label}
          </Link>
        ))}
        <Link href="/track" className="rounded-field bg-white/70 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-white">پیگیری رزرو</Link>
      </div>
      <Link href="/booking" className="btn btn-secondary mt-3 w-full"><CalendarCheck className="h-4 w-4" /> رزرو آنلاین</Link>
    </div>
  );

  /* ---------------- boutique: solid editorial bar with info strip ---------------- */
  if (p.template === "boutique") {
    return (
      <header className="sticky top-0 z-50">
        <div className={cn("hidden bg-brand-900 text-xs text-white/80 transition-all md:block", scrolled ? "h-0 overflow-hidden" : "h-9")}>
          <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6">
            <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-gold-300" />{p.address}</span>
            <span className="flex items-center gap-4">
              <Link href="/track" className="hover:text-gold-300">پیگیری رزرو</Link>
              <a href={`tel:${p.phone}`} className="flex items-center gap-1.5 hover:text-gold-300" dir="ltr"><Phone className="h-3.5 w-3.5" />{faNum(p.phone)}</a>
            </span>
          </div>
        </div>
        <div className={cn("border-b border-base-300 bg-base-100/95 backdrop-blur transition-shadow", scrolled && "shadow-md")}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
            <Logo p={p} light={false} />
            <nav className="hidden items-center gap-6 lg:flex">
              {p.links.map((l) => (
                <Link key={l.href} href={l.href} className={cn("relative py-2 text-sm font-medium transition hover:text-brand-700", isActive(l.href) ? "text-brand-700 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-gold-500" : "text-base-content/70")}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/booking" className="btn btn-primary hidden sm:inline-flex"><CalendarCheck className="h-4 w-4" /> رزرو</Link>
              <button onClick={() => setOpen((v) => !v)} className="btn btn-square btn-ghost lg:hidden" aria-label="منو">
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
        <div className="px-3">{mobile}</div>
      </header>
    );
  }

  /* ---------------- opus: cinematic bar + full-screen menu ---------------- */
  if (p.template === "opus") {
    const lightTop = /^\/(rooms|services|dining)\/[^/]+/.test(pathname);
    const solid = scrolled || lightTop;
    return (
      <>
        <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-500", open ? "text-white" : solid ? "bg-base-100/90 text-brand-950 shadow-[0_1px_0_rgba(0,0,0,.06)] backdrop-blur-xl" : "text-white")}>
          <div className={cn("mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 transition-all", solid && !open ? "py-3" : "py-5")}>
            <Link href="/" className="flex min-w-0 shrink items-center gap-3" onClick={() => setOpen(false)}>
              {p.logoUrl ? (
                <Img src={p.logoUrl} alt={p.hotelName} className="h-10 w-auto max-w-[140px] object-contain" />
              ) : (
                <span className={cn("grid h-11 w-11 place-items-center rounded-full border text-lg font-black", solid && !open ? "border-brand-900/20 text-brand-800" : "border-white/30 text-gold-300")}>{p.logoLetter}</span>
              )}
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-base font-black">{p.hotelName}</span>
                {p.hotelNameEn && <span className={cn("block text-[10px] uppercase tracking-[0.3em]", solid && !open ? "text-base-content/45" : "text-white/55")}>{p.hotelNameEn}</span>}
              </span>
            </Link>
            <nav className="hidden items-center gap-6 xl:flex">
              {p.links.slice(1, 6).map((l) => (
                <Link key={l.href} href={l.href} className={cn("text-[13px] font-medium transition", isActive(l.href) ? (solid && !open ? "text-brand-700" : "text-gold-300") : "opacity-75 hover:opacity-100")}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex shrink-0 items-center gap-2">
              <Link href="/booking" className={cn("btn hidden rounded-full sm:inline-flex", solid && !open ? "btn-primary" : "btn-secondary")}><CalendarCheck className="h-4 w-4" /> رزرو</Link>
              <button onClick={() => setOpen((v) => !v)} aria-label="منو" aria-expanded={open} className={cn("flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-bold transition", solid && !open ? "border-brand-900/15 hover:bg-brand-50" : "border-white/25 hover:bg-white/10")}>
                {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="hidden sm:inline">{open ? "بستن" : "منو"}</span>
              </button>
            </div>
          </div>
        </header>
        {open && (
          <div className="fixed inset-0 z-40 overflow-y-auto bg-brand-950 text-white">
            <div className="pointer-events-none absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-brand-600/30 blur-3xl" />
            <div className="relative mx-auto grid min-h-full max-w-7xl gap-12 px-6 pb-12 pt-32 lg:grid-cols-[1.5fr_1fr]">
              <nav className="flex flex-col">
                {[...p.links, { href: "/track", label: "پیگیری رزرو" }].map((l, i) => (
                  <Link key={l.href} href={l.href} style={{ animationDelay: `${i * 50}ms` }} className="group flex animate-fade-up items-baseline gap-5 border-b border-white/10 py-4">
                    <span className="text-sm font-bold text-gold-300">{faNum(String(i + 1).padStart(2, "0"))}</span>
                    <span className={cn("text-3xl font-black transition group-hover:-translate-x-3 md:text-5xl", isActive(l.href) ? "text-gold-300" : "text-white/85 group-hover:text-white")}>{l.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col justify-end gap-6 text-white/70 lg:pb-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-gold-300">تماس</div>
                  <a href={`tel:${p.phone}`} className="mt-3 block text-3xl font-black text-white" dir="ltr">{faNum(p.phone)}</a>
                  <p className="mt-3 flex gap-2 text-sm leading-7"><MapPin className="mt-1 h-4 w-4 shrink-0 text-gold-300" />{p.address}</p>
                </div>
                <Link href="/booking" className="btn btn-secondary btn-lg w-fit rounded-full px-10"><CalendarCheck className="h-5 w-5" /> رزرو آنلاین</Link>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ---------------- glass: frosted floating bar ---------------- */
  if (p.template === "glass") {
    return (
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
        <div className={cn("mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-all duration-300", scrolled || open ? "glass-strong" : "glass-panel")}>
          <Link href="/" className="flex min-w-0 shrink items-center gap-2.5">
            {p.logoUrl ? (
              <Img src={p.logoUrl} alt={p.hotelName} className="h-10 w-auto max-w-[130px] object-contain" />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-gold-400 text-lg font-black text-white shadow-lg shadow-brand-500/30">{p.logoLetter}</span>
            )}
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-extrabold text-brand-950 sm:text-base">{p.hotelName}</span>
              {p.hotelNameEn && <span className="truncate hidden text-[10px] uppercase tracking-[0.2em] text-base-content/50 sm:block">{p.hotelNameEn}</span>}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 xl:flex">
            {p.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn("rounded-xl px-3.5 py-2 text-[13px] font-medium transition", isActive(l.href) ? "bg-white/80 text-primary shadow-sm" : "text-base-content/70 hover:bg-white/45 hover:text-brand-900")}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/track" title="پیگیری رزرو" className="glass-chip hidden h-10 w-10 place-items-center rounded-xl text-base-content/70 transition hover:text-primary md:grid">
              <SearchCheck className="h-5 w-5" />
            </Link>
            <a href={`tel:${p.phone}`} className="glass-chip hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm text-base-content/75 2xl:flex" dir="ltr">
              <Phone className="h-4 w-4 text-primary" />{faNum(p.phone)}
            </a>
            <Link href="/booking" className="btn btn-primary rounded-xl"><CalendarCheck className="h-4 w-4" /> <span className="hidden sm:inline">رزرو آنلاین</span></Link>
            <button onClick={() => setOpen((v) => !v)} className="glass-chip grid h-10 w-10 place-items-center rounded-xl text-base-content/75 xl:hidden" aria-label="منو">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="glass-strong mx-auto mt-2 max-w-7xl animate-fade-up rounded-2xl p-3 xl:hidden">
            <div className="grid grid-cols-2 gap-2">
              {[...p.links, { href: "/track", label: "پیگیری رزرو" }].map((l) => (
                <Link key={l.href} href={l.href} className={cn("rounded-xl px-4 py-3 text-sm font-medium", isActive(l.href) ? "bg-primary text-primary-content" : "glass-chip text-base-content/80")}>
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>
    );
  }

  /* ---------------- soft: neumorphic floating pill ---------------- */
  if (p.template === "soft") {
    return (
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
        <div className={cn("mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full py-2 pe-2 ps-3 transition-shadow duration-300", scrolled ? "neu" : "neu-sm")}>
          <Link href="/" className="flex min-w-0 shrink items-center gap-2.5">
            {p.logoUrl ? (
              <Img src={p.logoUrl} alt={p.hotelName} className="h-10 w-auto max-w-[130px] object-contain" />
            ) : (
              <span className="neu-sm grid h-11 w-11 place-items-center rounded-full text-lg font-black text-primary">{p.logoLetter}</span>
            )}
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block truncate text-sm font-extrabold text-brand-900">{p.hotelName}</span>
              {p.hotelNameEn && <span className="truncate block text-[10px] uppercase tracking-[0.2em] text-base-content/45">{p.hotelNameEn}</span>}
            </span>
          </Link>
          <nav className="neu-inset-sm hidden items-center gap-1 rounded-full p-1.5 xl:flex">
            {p.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn("rounded-full px-4 py-2 text-[13px] font-medium transition", isActive(l.href) ? "neu-sm text-primary" : "text-base-content/65 hover:text-primary")}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2.5">
            <Link href="/track" title="پیگیری رزرو" className="neu-sm hidden h-11 w-11 place-items-center rounded-full text-base-content/70 transition hover:text-primary active:neu-inset-sm md:grid">
              <SearchCheck className="h-5 w-5" />
            </Link>
            <Link href="/booking" className="btn btn-primary rounded-full px-5"><CalendarCheck className="h-4 w-4" /> <span className="hidden sm:inline">رزرو</span></Link>
            <button onClick={() => setOpen((v) => !v)} className={cn("grid h-11 w-11 place-items-center rounded-full text-base-content/70 xl:hidden", open ? "neu-inset-sm" : "neu-sm")} aria-label="منو">
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {open && (
          <div className="neu mx-auto mt-3 max-w-7xl animate-fade-up rounded-[2rem] p-4 xl:hidden">
            <div className="grid grid-cols-2 gap-3">
              {[...p.links, { href: "/track", label: "پیگیری رزرو" }].map((l) => (
                <Link key={l.href} href={l.href} className={cn("rounded-2xl px-4 py-3 text-sm font-medium", isActive(l.href) ? "neu-inset-sm text-primary" : "neu-sm text-base-content/75")}>
                  {l.label}
                </Link>
              ))}
            </div>
            <a href={`tel:${p.phone}`} className="neu-inset-sm mt-4 flex items-center justify-center gap-2 rounded-2xl py-3 text-sm text-base-content/70" dir="ltr"><Phone className="h-4 w-4 text-primary" />{faNum(p.phone)}</a>
          </div>
        )}
      </header>
    );
  }

  /* ---------------- grand: centered crest, split navigation ---------------- */
  if (p.template === "grand") {
    const solid = scrolled || pathname !== "/" || open;
    const half = Math.ceil(p.links.length / 2);
    const navCls = (href: string) =>
      cn(
        "relative py-2 text-[13px] tracking-wide transition after:absolute after:inset-x-0 after:-bottom-0.5 after:mx-auto after:h-px after:bg-gold-300 after:transition-all",
        isActive(href) ? "text-gold-300 after:w-full" : "text-white/80 after:w-0 hover:text-white hover:after:w-full",
      );
    return (
      <>
        <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-500", solid ? "bg-brand-950/95 shadow-xl shadow-black/20 backdrop-blur-md" : "bg-gradient-to-b from-black/60 via-black/25 to-transparent")}>
          <div className={cn("mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 transition-all", solid ? "py-3" : "py-5")}>
            <div className="flex items-center gap-7">
              <button onClick={() => setOpen((v) => !v)} className="grid h-10 w-10 place-items-center text-white xl:hidden" aria-label="منو">
                {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              <nav className="hidden items-center gap-7 xl:flex">
                {p.links.slice(0, half).map((l) => <Link key={l.href} href={l.href} className={navCls(l.href)}>{l.label}</Link>)}
              </nav>
            </div>
            <Link href="/" className="flex flex-col items-center text-white">
              {p.logoUrl ? (
                <Img src={p.logoUrl} alt={p.hotelName} className={cn("w-auto object-contain transition-all", solid ? "h-9" : "h-12")} />
              ) : (
                <span className={cn("grid place-items-center border border-gold-300/70 font-extralight text-gold-300 transition-all", solid ? "h-9 w-9 text-lg" : "h-12 w-12 text-2xl")}>{p.logoLetter}</span>
              )}
              <span className={cn("mt-1.5 max-w-[42vw] truncate whitespace-nowrap font-bold tracking-wide transition-all sm:max-w-none", solid ? "text-sm" : "text-base")}>{p.hotelName}</span>
              {p.hotelNameEn && !solid && <span className="text-[9px] uppercase tracking-[0.4em] text-white/60">{p.hotelNameEn}</span>}
            </Link>
            <div className="flex items-center justify-end gap-7">
              <nav className="hidden items-center gap-7 xl:flex">
                {p.links.slice(half).map((l) => <Link key={l.href} href={l.href} className={navCls(l.href)}>{l.label}</Link>)}
              </nav>
              <Link href="/booking" className="btn btn-sm border-gold-300 bg-transparent font-medium text-gold-300 hover:bg-gold-300 hover:text-brand-950 sm:btn-md">
                <CalendarCheck className="h-4 w-4" /> <span className="hidden sm:inline">رزرو</span>
              </Link>
            </div>
          </div>
        </header>
        {open && (
          <div className="fixed inset-0 z-40 flex flex-col bg-brand-950 px-8 pb-10 pt-28 text-white xl:hidden">
            <nav className="flex flex-1 flex-col justify-center gap-1">
              {[...p.links, { href: "/track", label: "پیگیری رزرو" }].map((l, i) => (
                <Link key={l.href} href={l.href} style={{ animationDelay: `${i * 45}ms` }} className={cn("animate-fade-up border-b border-white/10 py-3.5 text-2xl font-extralight", isActive(l.href) ? "text-gold-300" : "text-white/85")}>
                  {l.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center justify-between text-sm text-white/60">
              <a href={`tel:${p.phone}`} dir="ltr" className="flex items-center gap-2"><Phone className="h-4 w-4 text-gold-300" />{faNum(p.phone)}</a>
              <Link href="/booking" className="btn btn-secondary">رزرو آنلاین</Link>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ---------------- luxe: floating glass bar over hero ---------------- */
  const transparent = pathname === "/" && !scrolled && !open;
  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3">
      <div className={cn("mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-3 transition-all duration-500", transparent ? "frost text-white" : "frost-light text-slate-800 shadow-lg shadow-slate-900/5")}>
        <Logo p={p} light={transparent} />
        <nav className="hidden items-center gap-1 lg:flex">
          {p.links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link key={l.href} href={l.href} className={cn("rounded-xl px-3.5 py-2 text-sm font-medium transition", active ? (transparent ? "bg-white/20" : "bg-brand-50 text-brand-700") : transparent ? "hover:bg-white/10" : "hover:bg-slate-100")}>
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Link href="/track" title="پیگیری رزرو" className={cn("hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium md:flex", transparent ? "hover:bg-white/10" : "hover:bg-slate-100")}>
            <SearchCheck className="h-4 w-4" />
            <span className="hidden xl:inline">پیگیری رزرو</span>
          </Link>
          <a href={`tel:${p.phone}`} className={cn("hidden items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium 2xl:flex", transparent ? "hover:bg-white/10" : "hover:bg-slate-100")}>
            <Phone className="h-4 w-4" />
            <span dir="ltr">{faNum(p.phone)}</span>
          </a>
          <Link href="/booking" className="btn btn-secondary hidden sm:inline-flex"><CalendarCheck className="h-4 w-4" /> رزرو آنلاین</Link>
          <button onClick={() => setOpen((v) => !v)} className={cn("grid h-10 w-10 place-items-center rounded-xl lg:hidden", transparent ? "bg-white/10" : "bg-slate-100")} aria-label="منو">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {mobile}
    </header>
  );
}
