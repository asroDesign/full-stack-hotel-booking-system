import { Info, SearchCheck, Clock, CreditCard, BadgeCheck, XCircle } from "lucide-react";
import type { Step } from "@/lib/content";
import { faNum } from "@/lib/utils";
import { TrackLookup } from "./forms";

export function BookingProcess({
  title,
  subtitle,
  steps,
  notice,
}: {
  title: string;
  subtitle: string;
  steps: Step[];
  notice: string;
}) {
  return (
    <section className="tpl-card relative overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl shadow-brand-950/10 ring-1 ring-slate-200/70 md:p-10">
      <div className="pattern-dots pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-gold-300/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-brand-300/20 blur-3xl" />

      <div className="relative text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-bold text-gold-600">
          <span className="h-1.5 w-1.5 rounded-full bg-current" /> {title}
        </span>
        <h2 className="mt-3 text-2xl font-black text-slate-900 md:text-3xl">{subtitle}</h2>
      </div>

      <ol className="relative mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {/* connector line (desktop) */}
        <div className="pointer-events-none absolute inset-x-[12%] top-11 hidden h-1 rounded-full bg-gradient-to-l from-brand-200 via-gold-300 to-emerald-300 xl:block" />
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li
              key={i}
              className="group relative animate-fade-up"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="relative z-10 mx-auto mb-4 grid h-[88px] w-[88px] place-items-center">
                <span
                  className={`absolute inset-0 rounded-[1.75rem] rotate-6 transition duration-500 group-hover:rotate-12 ${last ? "bg-gradient-to-br from-gold-300 to-gold-500" : "bg-gradient-to-br from-brand-500 to-brand-800"}`}
                />
                <span className="relative grid h-full w-full place-items-center rounded-[1.75rem] bg-white text-4xl shadow-xl ring-1 ring-slate-100 transition duration-500 group-hover:-translate-y-1">
                  {s.emoji}
                </span>
                <span
                  className={`absolute -right-2 -top-2 grid h-8 w-8 place-items-center rounded-full text-sm font-black shadow-lg ring-4 ring-white ${last ? "bg-brand-800 text-gold-300" : "bg-gold-400 text-brand-950"}`}
                >
                  {faNum(i + 1)}
                </span>
              </div>
              <div
                className={`h-[calc(100%-104px)] rounded-3xl border p-5 text-center transition duration-500 group-hover:-translate-y-1 group-hover:shadow-xl ${last ? "border-gold-300 bg-gradient-to-b from-gold-300/15 to-white" : "border-slate-200/80 bg-white/90 backdrop-blur"}`}
              >
                <h3 className="font-extrabold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-500">{s.text}</p>
                {last && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                    <BadgeCheck className="h-3.5 w-3.5" /> رزرو قطعی
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {notice && (
        <div className="relative mt-8 flex gap-4 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50/40 p-5">
          <span className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-amber-400 to-orange-500" />
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400/20 text-amber-700">
            <Info className="h-5 w-5" />
          </span>
          <p className="text-sm leading-7 text-amber-900">
            <b className="ml-1">توجه:</b>
            {notice}
          </p>
        </div>
      )}
    </section>
  );
}

const legend = [
  { Icon: Clock, label: "در انتظار پیش‌پرداخت", cls: "bg-amber-400/20 text-amber-200" },
  { Icon: CreditCard, label: "پرداخت شده، در انتظار تایید", cls: "bg-sky-400/20 text-sky-200" },
  { Icon: BadgeCheck, label: "قطعی، کد رزرو صادر شد", cls: "bg-emerald-400/20 text-emerald-200" },
  { Icon: XCircle, label: "رد یا لغو شده", cls: "bg-rose-400/20 text-rose-200" },
];

export function TrackSection({ title, text, id = "track" }: { title: string; text: string; id?: string }) {
  return (
    <section id={id} className="scroll-mt-28">
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950 p-6 md:p-10">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/3 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1.1fr_1fr]">
          <div className="text-white">
            <span className="frost inline-flex h-14 w-14 items-center justify-center rounded-2xl">
              <SearchCheck className="h-7 w-7 text-gold-300" />
            </span>
            <h2 className="mt-5 text-2xl font-black md:text-3xl">{title}</h2>
            <p className="mt-3 max-w-lg leading-8 text-white/70">{text}</p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {legend.map(({ Icon, label, cls }) => (
                <div key={label} className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 text-sm text-white/85 ring-1 ring-white/10">
                  <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${cls}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 font-extrabold text-slate-900">جستجوی رزرو</h3>
            <TrackLookup />
          </div>
        </div>
      </div>
    </section>
  );
}
