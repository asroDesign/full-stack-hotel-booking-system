import Link from "next/link";
import type { ReactNode } from "react";
import SmartImage from "@/components/site/SmartImage";

export function SectionHeading({
  kicker,
  title,
  description,
  align = "center",
  action,
}: {
  kicker?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  action?: ReactNode;
}) {
  return (
    <div
      className={`flex flex-col gap-5 ${
        align === "center" ? "items-center text-center" : "items-start text-start md:flex-row md:items-end md:justify-between"
      }`}
    >
      <div className={`max-w-2xl space-y-3 ${align === "center" ? "mx-auto" : ""}`}>
        {kicker ? (
          <span className="glass-pill">
            <span className="h-1.5 w-1.5 rounded-full bg-forest-600" />
            {kicker}
          </span>
        ) : null}
        <h2 className="display-xl text-2xl text-forest-950 sm:text-3xl lg:text-[2.1rem]">{title}</h2>
        {description ? <p className="text-[12px] leading-7 text-forest-800/60 sm:text-[13px]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <div className={`flex items-center gap-1 ${className}`} aria-label={`امتیاز ${rating} از ۵`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <span
          key={index}
          className={`text-[11px] ${index < rating ? "text-gold-600" : "text-cream-300/70"}`}
          aria-hidden="true"
        >
          ★
        </span>
      ))}
    </div>
  );
}

export function EmptyState({
  icon = "🌿",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass-soft flex flex-col items-center justify-center gap-3 rounded-3xl px-6 py-14 text-center">
      <div className="glass-circle h-14 w-14 text-2xl">{icon}</div>
      <p className="text-base font-black text-forest-950">{title}</p>
      {description ? <p className="max-w-sm text-[12px] leading-6 text-forest-800/55">{description}</p> : null}
      {action}
    </div>
  );
}

export function Breadcrumb({ items, light = false }: { items: { label: string; href?: string }[]; light?: boolean }) {
  return (
    <nav
      className={`flex flex-wrap items-center gap-2 text-[10px] font-semibold ${light ? "text-forest-800/55" : "text-forest-800/45"}`}
      aria-label="مسیر صفحه"
    >
      <Link href="/" className="transition hover:text-forest-800">
        خانه
      </Link>
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-2">
          <span className="text-forest-600/50">◆</span>
          {item.href ? (
            <Link href={item.href} className="transition hover:text-forest-800">
              {item.label}
            </Link>
          ) : (
            <span className="font-bold text-forest-800">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHero({
  kicker,
  title,
  description,
  image,
  children,
  breadcrumb,
}: {
  kicker: string;
  title: string;
  description?: string;
  image: string;
  children?: ReactNode;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <section className="container-x pt-6 sm:pt-8">
      <div className="atelier-hero relative overflow-hidden rounded-[1.5rem] border border-gold-400/25">
        <div className="fine-grid absolute inset-0 opacity-20" aria-hidden="true" />
        <div className="relative z-10 grid gap-0 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4 p-6 sm:p-9">
            {breadcrumb ? <Breadcrumb items={breadcrumb} light /> : null}
            <span className="glass-pill glass-pill-light">{kicker}</span>
            <h1 className="editorial-title text-2xl text-cream-50 sm:text-3xl lg:text-[2.7rem]">{title}</h1>
            {description ? <p className="max-w-2xl text-[12px] leading-7 text-cream-200/70 sm:text-[13px]">{description}</p> : null}
            <div className="rule-gold" />
            {children}
          </div>
          <div className="p-4 sm:p-6">
            <div className="gold-frame relative h-full min-h-52 overflow-hidden rounded-lg border border-gold-400/25">
              <SmartImage src={image} alt="" className="h-full min-h-52 w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061c18]/55 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
