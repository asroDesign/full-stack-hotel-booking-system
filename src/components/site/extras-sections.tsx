import { Img } from "@/components/img";
import Link from "next/link";
import { ArrowLeft, Clock, TicketPercent, HelpCircle } from "lucide-react";
import type { Faq, GalleryItem, Promotion } from "@/db/schema";
import { discountLabel, promoConditions } from "@/lib/promotions";
import { CopyCode, GalleryGrid } from "./extras-client";
import { cn, formatJalali } from "@/lib/utils";

export function OfferCard({ p, dark }: { p: Promotion; dark?: boolean }) {
  const conds = promoConditions(p);
  return (
    <article className={cn("tpl-card group relative flex overflow-hidden rounded-box ring-1", dark ? "bg-white/5 text-white ring-white/15" : "bg-base-100 ring-base-300")}>
      <div className="relative w-2/5 shrink-0 overflow-hidden">
        <Img src={p.image || "/images/hero.jpg"} alt={p.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-l from-black/50 to-transparent" />
        <span className="absolute bottom-3 right-3 rounded-full bg-secondary px-3 py-1 text-xs font-black text-secondary-content shadow">{discountLabel(p)}</span>
      </div>
      {/* ticket perforation */}
      <div className={cn("relative w-0 border-r-2 border-dashed", dark ? "border-white/20" : "border-base-300")}>
        <span className={cn("absolute -right-3 -top-3 h-6 w-6 rounded-full", dark ? "bg-brand-950" : "bg-base-200")} />
        <span className={cn("absolute -bottom-3 -right-3 h-6 w-6 rounded-full", dark ? "bg-brand-950" : "bg-base-200")} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold leading-snug">{p.title || p.code}</h3>
        {p.description && <p className={cn("mt-1.5 line-clamp-2 text-sm leading-6", dark ? "text-white/60" : "text-base-content/60")}>{p.description}</p>}
        {conds.length > 0 && (
          <ul className={cn("mt-3 flex flex-wrap gap-1.5 text-[11px]", dark ? "text-white/70" : "text-base-content/60")}>
            {conds.map((c) => <li key={c} className={cn("rounded-full px-2 py-0.5", dark ? "bg-white/10" : "bg-base-200")}>{c}</li>)}
          </ul>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          <CopyCode code={p.code} />
          <Link href={`/booking?promo=${encodeURIComponent(p.code)}`} className="btn btn-primary btn-sm">رزرو با این کد</Link>
        </div>
      </div>
    </article>
  );
}

export function OffersSection({ offers, eyebrow, title, text }: { offers: Promotion[]; eyebrow: string; title: string; text: string }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/20 px-3 py-1 text-xs font-bold text-primary"><TicketPercent className="h-3.5 w-3.5" />{eyebrow}</span>
          <h2 className="mt-3 text-3xl font-black leading-snug text-brand-900 md:text-4xl">{title}</h2>
          {text && <p className="mt-3 leading-8 text-base-content/60">{text}</p>}
        </div>
        <Link href="/offers" className="btn">همه پیشنهادها <ArrowLeft className="h-4 w-4" /></Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {offers.slice(0, 4).map((p) => <OfferCard key={p.id} p={p} />)}
      </div>
    </section>
  );
}

export function GallerySection({ items, eyebrow, title }: { items: GalleryItem[]; eyebrow: string; title: string }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">{eyebrow}</span>
          <h2 className="mt-2 text-3xl font-black text-brand-900 md:text-4xl">{title}</h2>
        </div>
        <Link href="/gallery" className="btn">مشاهده گالری کامل <ArrowLeft className="h-4 w-4" /></Link>
      </div>
      <GalleryGrid filter={false} items={items.slice(0, 8).map((i) => ({ id: i.id, url: i.url, caption: i.caption, category: i.category }))} />
    </section>
  );
}

export function FaqList({ faqs, open = 0 }: { faqs: Faq[]; open?: number }) {
  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <details key={f.id} open={i === open} className="tpl-card collapse collapse-arrow rounded-box bg-base-100 ring-1 ring-base-300">
          <summary className="collapse-title pe-12 font-bold text-brand-900">{f.question}</summary>
          <div className="collapse-content whitespace-pre-line text-sm leading-8 text-base-content/70">{f.answer}</div>
        </details>
      ))}
    </div>
  );
}

export function FaqSection({ faqs, eyebrow, title }: { faqs: Faq[]; eyebrow: string; title: string }) {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.7fr]">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary"><HelpCircle className="h-4 w-4" />{eyebrow}</span>
          <h2 className="mt-3 text-3xl font-black leading-snug text-brand-900 md:text-4xl">{title}</h2>
          <p className="mt-3 leading-8 text-base-content/60">پاسخ سوال خود را پیدا نکردید؟ تیم پذیرش به‌صورت شبانه‌روزی پاسخگوی شماست.</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href="/faq" className="btn btn-primary">همه سوالات</Link>
            <Link href="/contact" className="btn">تماس با ما</Link>
          </div>
        </div>
        <FaqList faqs={faqs.slice(0, 6)} />
      </div>
    </section>
  );
}

export function ValidUntil({ date }: { date: string | null }) {
  if (!date) return null;
  return <span className="inline-flex items-center gap-1 text-xs text-base-content/55"><Clock className="h-3.5 w-3.5" />تا {formatJalali(date)}</span>;
}

