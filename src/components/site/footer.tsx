import { Img } from "@/components/img";
import Link from "next/link";
import { Camera as Instagram, MapPin, Phone, Mail, Send, MessageCircle, Clock, Star } from "lucide-react";
import type { SiteSettings } from "@/lib/data";
import type { NavLink } from "./header";
import { cn, faNum, isoToJalali, todayISO } from "@/lib/utils";

export function SiteFooter({ s, links, template, logoLetter }: { s: SiteSettings; links: NavLink[]; template: "luxe" | "boutique" | "grand" | "soft" | "glass" | "opus"; logoLetter: string }) {
  const boutique = template === "boutique";
  const year = isoToJalali(todayISO()).jy;
  const socials = [
    s.instagram && { href: `https://instagram.com/${s.instagram}`, Icon: Instagram, label: "Instagram" },
    s.telegram && { href: `https://t.me/${s.telegram}`, Icon: Send, label: "Telegram" },
    s.whatsapp && { href: `https://wa.me/${s.whatsapp}`, Icon: MessageCircle, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; Icon: typeof Send; label: string }[];

  if (template === "opus") {
    return (
      <footer className="relative mt-24 overflow-hidden bg-brand-950 text-white/70">
        <div className="mx-auto max-w-7xl px-6 pt-20">
          <div className="grid gap-12 border-b border-white/10 pb-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
            <div>
              <div className="flex gap-0.5">{Array.from({ length: Number(s.stars) || 0 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-300 text-gold-300" />)}</div>
              <p className="mt-4 text-2xl font-light leading-[1.8] text-white">{s.tagline}</p>
              <p className="mt-4 text-sm leading-7">{s.footerText}</p>
              {socials.length > 0 && (
                <div className="mt-6 flex gap-2">
                  {socials.map(({ href, Icon, label }) => (
                    <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} className="grid h-11 w-11 place-items-center rounded-full border border-white/15 transition hover:border-gold-300 hover:bg-gold-300 hover:text-brand-950">
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-gold-300">صفحات</h4>
              <ul className="space-y-2.5 text-sm">
                {[...links.filter((l) => l.href !== "/"), { href: "/booking", label: "رزرو آنلاین" }, { href: "/track", label: "پیگیری رزرو" }].map((l) => (
                  <li key={l.href}><Link href={l.href} className="transition hover:text-white">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-gold-300">اقامت</h4>
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold-300" />ورود {faNum(s.checkInTime)}</li>
                <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold-300" />خروج {faNum(s.checkOutTime)}</li>
                <li>پیش‌پرداخت {faNum(s.depositPercent)}٪</li>
                <li>رزرو پس از صدور کد قطعی است</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-gold-300">تماس</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />{s.address}</li>
                {s.phone && <li><a href={`tel:${s.phone}`} className="text-xl font-black text-white" dir="ltr">{faNum(s.phone)}</a></li>}
                {s.email && <li className="flex gap-2"><Mail className="h-4 w-4 text-gold-300" />{s.email}</li>}
              </ul>
              <Link href="/booking" className="btn btn-secondary mt-6 rounded-full px-8">رزرو آنلاین</Link>
            </div>
          </div>
          <div className="select-none overflow-hidden py-6 text-center">
            <div className="text-outline whitespace-nowrap text-[15vw] font-black leading-none text-white/15 md:text-[11rem]">{s.hotelName}</div>
          </div>
          <div className="flex flex-col items-center justify-between gap-2 border-t border-white/10 pb-24 pt-6 text-xs sm:flex-row md:pb-6">
            <span>© {faNum(year)} تمامی حقوق برای {s.hotelName} محفوظ است.</span>
            <a href="https://asrodev.ir" target="_blank" rel="noopener" className="hover:text-white">طراحی توسط آسرودیزاین</a>
          </div>
        </div>
      </footer>
    );
  }

  if (template === "glass") {
    return (
      <footer className="mt-24 px-4 pb-6">
        <div className="glass-panel mx-auto max-w-7xl overflow-hidden rounded-[2.25rem]">
          <div className="relative overflow-hidden border-b border-white/60 px-8 py-12 md:px-12">
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-gold-300/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-brand-300/40 blur-3xl" />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="flex gap-0.5">{Array.from({ length: Number(s.stars) || 0 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-400 text-gold-400" />)}</div>
                <div className="text-aurora mt-2 text-4xl font-black md:text-6xl">{s.hotelName}</div>
                <p className="mt-2 text-base-content/60">{s.tagline}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/booking" className="btn btn-primary btn-lg rounded-full px-8">رزرو آنلاین</Link>
                <a href={`tel:${s.phone}`} className="btn btn-lg rounded-full px-6" dir="ltr">{faNum(s.phone)}</a>
              </div>
            </div>
          </div>
          <div className="grid gap-10 px-8 py-10 md:grid-cols-2 md:px-12 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
            <div>
              <p className="text-sm leading-7 text-base-content/65">{s.footerText}</p>
              {socials.length > 0 && (
                <div className="mt-5 flex gap-2">
                  {socials.map(({ href, Icon, label }) => (
                    <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} className="glass-chip grid h-10 w-10 place-items-center rounded-xl text-base-content/70 transition hover:bg-primary hover:text-primary-content">
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="mb-4 font-bold text-brand-950">دسترسی سریع</h4>
              <ul className="space-y-2.5 text-sm text-base-content/65">
                {[...links.filter((l) => l.href !== "/"), { href: "/booking", label: "رزرو آنلاین" }, { href: "/track", label: "پیگیری رزرو" }].map((l) => (
                  <li key={l.href}><Link href={l.href} className="transition hover:text-primary">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-brand-950">قوانین اقامت</h4>
              <ul className="space-y-2.5 text-sm text-base-content/65">
                <li className="glass-chip flex items-center gap-2 rounded-xl px-3 py-2"><Clock className="h-4 w-4 text-primary" /> ورود {faNum(s.checkInTime)}</li>
                <li className="glass-chip flex items-center gap-2 rounded-xl px-3 py-2"><Clock className="h-4 w-4 text-primary" /> خروج {faNum(s.checkOutTime)}</li>
                <li>پیش‌پرداخت {faNum(s.depositPercent)}٪ · رزرو پس از صدور کد قطعی است.</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-brand-950">ارتباط با ما</h4>
              <ul className="space-y-3 text-sm text-base-content/65">
                <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s.address}</li>
                {s.mobile && <li className="flex gap-2"><Phone className="h-4 w-4 text-primary" /><span dir="ltr">{faNum(s.mobile)}</span></li>}
                {s.email && <li className="flex gap-2"><Mail className="h-4 w-4 text-primary" />{s.email}</li>}
              </ul>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between gap-2 border-t border-white/60 px-8 py-4 text-xs text-base-content/55 sm:flex-row md:px-12">
            <span>© {faNum(year)} تمامی حقوق برای {s.hotelName} محفوظ است.</span>
            <a href="https://asrodev.ir" target="_blank" rel="noopener" className="hover:text-primary">طراحی توسط آسرودیزاین</a>
          </div>
        </div>
      </footer>
    );
  }

  if (template === "soft") {
    return (
      <footer className="mt-24 px-4 pb-6">
        <div className="neu-lg mx-auto max-w-7xl rounded-[2.5rem] p-8 md:p-12">
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
            <div>
              <div className="flex items-center gap-3">
                {s.logoUrl ? (
                  <Img src={s.logoUrl} alt={s.hotelName} className="h-12 w-auto max-w-[150px] object-contain" />
                ) : (
                  <span className="neu-sm grid h-14 w-14 place-items-center rounded-full text-xl font-black text-primary">{logoLetter}</span>
                )}
                <div>
                  <div className="text-lg font-extrabold text-brand-900">{s.hotelName}</div>
                  <div className="flex">{Array.from({ length: Number(s.stars) || 0 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-gold-400 text-gold-400" />)}</div>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-base-content/60">{s.footerText}</p>
              {socials.length > 0 && (
                <div className="mt-6 flex gap-3">
                  {socials.map(({ href, Icon, label }) => (
                    <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} className="neu-sm grid h-11 w-11 place-items-center rounded-full text-base-content/60 transition hover:text-primary active:neu-inset-sm">
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="mb-4 font-bold text-brand-900">دسترسی سریع</h4>
              <ul className="space-y-2.5 text-sm text-base-content/65">
                {[...links.filter((l) => l.href !== "/"), { href: "/booking", label: "رزرو آنلاین" }, { href: "/track", label: "پیگیری رزرو" }].map((l) => (
                  <li key={l.href}><Link href={l.href} className="transition hover:text-primary">{l.label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-brand-900">قوانین اقامت</h4>
              <ul className="space-y-3 text-sm text-base-content/65">
                <li className="neu-inset-sm flex items-center gap-2 rounded-2xl px-4 py-2.5"><Clock className="h-4 w-4 text-primary" /> ورود {faNum(s.checkInTime)}</li>
                <li className="neu-inset-sm flex items-center gap-2 rounded-2xl px-4 py-2.5"><Clock className="h-4 w-4 text-primary" /> خروج {faNum(s.checkOutTime)}</li>
                <li className="px-1">پیش‌پرداخت {faNum(s.depositPercent)}٪ · رزرو پس از صدور کد قطعی است.</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-4 font-bold text-brand-900">ارتباط با ما</h4>
              <ul className="space-y-3 text-sm text-base-content/65">
                <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{s.address}</li>
                {s.phone && <li className="flex gap-2"><Phone className="h-4 w-4 text-primary" /><span dir="ltr">{faNum(s.phone)}</span></li>}
                {s.mobile && <li className="flex gap-2"><Phone className="h-4 w-4 text-primary" /><span dir="ltr">{faNum(s.mobile)}</span></li>}
                {s.email && <li className="flex gap-2"><Mail className="h-4 w-4 text-primary" />{s.email}</li>}
              </ul>
              <Link href="/booking" className="btn btn-primary mt-6 w-full rounded-full">رزرو آنلاین</Link>
            </div>
          </div>
          <div className="neu-inset-sm mt-10 flex flex-col items-center justify-between gap-2 rounded-full px-6 py-3 text-xs text-base-content/55 sm:flex-row">
            <span>© {faNum(year)} تمامی حقوق برای {s.hotelName} محفوظ است.</span>
            <a href="https://asrodev.ir" target="_blank" rel="noopener" className="hover:text-primary">طراحی توسط آسرودیزاین</a>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn("relative mt-24 overflow-hidden", boutique ? "border-t border-base-300 bg-base-100 text-base-content/70" : "bg-brand-950 text-slate-300")}>
      {!boutique && template !== "grand" && <div className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[60rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" />}
      {template === "grand" && (
        <div className="relative border-b border-white/10">
          <Img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-15" />
          <div className="relative mx-auto max-w-4xl px-6 py-20 text-center">
            <div className="flex items-center justify-center gap-3 text-gold-300">
              <span className="h-px w-12 bg-gold-300/50" />
              <span className="flex">{Array.from({ length: Number(s.stars) || 0 }).map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</span>
              <span className="h-px w-12 bg-gold-300/50" />
            </div>
            <div className="mt-5 text-4xl font-extralight text-white md:text-6xl">{s.hotelName}</div>
            <p className="mt-4 text-white/60">{s.tagline}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/booking" className="btn btn-secondary btn-lg">رزرو آنلاین</Link>
              <a href={`tel:${s.phone}`} className="btn btn-lg border-white/20 bg-white/5 text-white hover:bg-white/10" dir="ltr">{faNum(s.phone)}</a>
            </div>
          </div>
        </div>
      )}
      {boutique && (
        <div className="border-b border-base-300 bg-brand-50/60">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 md:flex-row">
            <div>
              <div className="text-2xl font-black text-brand-900">سفر بعدی‌تان را با ما بسازید</div>
              <div className="mt-1 text-sm">رزرو آنلاین، پیش‌پرداخت امن و صدور کد رزرو قطعی</div>
            </div>
            <Link href="/booking" className="btn btn-primary btn-lg">رزرو آنلاین</Link>
          </div>
        </div>
      )}
      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            {s.logoUrl ? (
              <Img src={s.logoUrl} alt={s.hotelName} className="h-11 w-auto max-w-[150px] object-contain" />
            ) : (
              <span className={cn("grid h-11 w-11 place-items-center text-lg font-black", boutique ? "rounded-md bg-brand-800 text-gold-300" : "rounded-xl bg-gradient-to-br from-gold-300 to-gold-500 text-brand-950")}>{logoLetter}</span>
            )}
            <div>
              <div className={cn("text-lg font-extrabold", boutique ? "text-brand-900" : "text-white")}>{s.hotelName}</div>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: Number(s.stars) || 0 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-gold-400 text-gold-400" />)}
              </div>
            </div>
          </div>
          <p className={cn("mt-5 text-sm leading-7", boutique ? "" : "text-slate-400")}>{s.footerText}</p>
          {socials.length > 0 && (
            <div className="mt-5 flex gap-2">
              {socials.map(({ href, Icon, label }) => (
                <a key={href} href={href} target="_blank" rel="noreferrer" aria-label={label} className={cn("grid h-10 w-10 place-items-center rounded-xl transition", boutique ? "bg-base-200 hover:bg-brand-700 hover:text-white" : "bg-white/5 hover:bg-gold-400 hover:text-brand-950")}>
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div>
          <h4 className={cn("mb-4 font-bold", boutique ? "text-brand-900" : "text-white")}>دسترسی سریع</h4>
          <ul className="space-y-2.5 text-sm">
            {[...links.filter((l) => l.href !== "/"), { href: "/booking", label: "رزرو آنلاین" }, { href: "/track", label: "پیگیری رزرو" }].map((l) => (
              <li key={l.href}><Link href={l.href} className={cn("transition", boutique ? "hover:text-brand-700" : "hover:text-gold-300")}>{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className={cn("mb-4 font-bold", boutique ? "text-brand-900" : "text-white")}>قوانین اقامت</h4>
          <ul className={cn("space-y-2.5 text-sm", boutique ? "" : "text-slate-400")}>
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold-500" /> ساعت ورود: {faNum(s.checkInTime)}</li>
            <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-gold-500" /> ساعت خروج: {faNum(s.checkOutTime)}</li>
            <li>پیش‌پرداخت: {faNum(s.depositPercent)}٪ مبلغ کل</li>
            <li>رزرو فقط پس از صدور کد رزرو قطعی است.</li>
          </ul>
        </div>
        <div>
          <h4 className={cn("mb-4 font-bold", boutique ? "text-brand-900" : "text-white")}>ارتباط با ما</h4>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" />{s.address}</li>
            {s.phone && <li className="flex gap-2"><Phone className="h-4 w-4 text-gold-500" /><span dir="ltr">{faNum(s.phone)}</span></li>}
            {s.mobile && <li className="flex gap-2"><Phone className="h-4 w-4 text-gold-500" /><span dir="ltr">{faNum(s.mobile)}</span></li>}
            {s.email && <li className="flex gap-2"><Mail className="h-4 w-4 text-gold-500" />{s.email}</li>}
          </ul>
        </div>
      </div>
      <div className={cn("relative border-t py-6 text-center text-xs", boutique ? "border-base-300" : "border-white/10 text-slate-500")}>
        © {faNum(year)} تمامی حقوق برای {s.hotelName} محفوظ است. · <a href="https://asrodev.ir" target="_blank" rel="noopener" className="hover:underline">طراحی توسط آسرودیزاین</a>
      </div>
    </footer>
  );
}
