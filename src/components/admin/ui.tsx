import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPageHeader({
  title,
  description,
  action,
  kicker,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  kicker?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {kicker ? <p className="text-[10px] font-bold uppercase tracking-wide text-gold-600">{kicker}</p> : null}
        <h1 className="text-xl font-black text-forest-950 sm:text-2xl">{title}</h1>
        {description ? <p className="max-w-2xl text-[11px] leading-6 text-forest-800/55">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: string;
  tone?: "default" | "gold" | "dark" | "success" | "warning";
  href?: string;
}) {
  const toneMap: Record<string, string> = {
    default: "border-cream-200 bg-white text-forest-950",
    gold: "border-gold-200 bg-gold-50 text-gold-700",
    dark: "border-forest-900 bg-forest-950 text-white",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  };
  const content = (
    <div className={`stats w-full rounded-2xl border shadow-soft transition ${toneMap[tone]} ${href ? "hover:-translate-y-0.5" : ""}`}>
      <div className="stat p-3.5">
        <div className={`stat-figure flex h-8 w-8 items-center justify-center rounded-lg text-sm ${tone === "dark" ? "bg-white/10" : "bg-black/5"}`}>
          {icon}
        </div>
        <div className={`stat-title text-[10px] font-semibold ${tone === "dark" ? "text-cream-200/60" : "opacity-70"}`}>
          {label}
        </div>
        <div className={`stat-value mt-1 text-xl font-black ${tone === "dark" ? "text-white" : ""}`}>{value}</div>
        {hint ? (
          <div className={`stat-desc mt-0.5 text-[10px] ${tone === "dark" ? "text-cream-200/50" : "opacity-60"}`}>
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-cream-200 bg-white shadow-soft ${className}`}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-cream-100 px-4 py-3">
          <div>
            <h2 className="text-xs font-extrabold text-forest-950">{title}</h2>
            {description ? <p className="mt-0.5 text-[10px] text-forest-800/50">{description}</p> : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function MiniBars({
  data,
  format,
}: {
  data: { label: string; bookings: number; revenue: number }[];
  format: (value: number) => string;
}) {
  const max = Math.max(...data.map((item) => item.bookings), 1);
  return (
    <div className="flex h-40 items-end justify-between gap-2">
      {data.map((item) => (
        <div key={item.label} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[9px] font-bold text-forest-800/60">{format(item.revenue)}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-lg bg-gradient-to-t from-forest-800 to-forest-500 transition-all"
              style={{ height: `${Math.max(8, (item.bookings / max) * 100)}%` }}
              title={`${item.label}: ${item.bookings} رزرو`}
            />
          </div>
          <span className="text-[9px] text-forest-800/50">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
