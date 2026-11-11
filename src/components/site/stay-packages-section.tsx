import { Img } from "@/components/img";
import Link from "next/link";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import type { getActiveStayPackages } from "@/lib/stay-packages";
import { formatPrice } from "@/lib/utils";

type StayPackage = Awaited<ReturnType<typeof getActiveStayPackages>>[number];

export function StayPackagesSection({ packages }: { packages: StayPackage[] }) {
  if (!packages.length) return null;
  return (
    <section id="stay-packages" className="relative overflow-hidden bg-brand-950 py-20 text-white md:py-28">
      <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-gold-400/10 blur-3xl" />
      <div className="relative mx-auto max-w-7xl px-5 md:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-300/30 px-4 py-1.5 text-xs font-bold text-gold-200"><Sparkles className="h-3.5 w-3.5" /> انتخابی برای مناسبت شما</span>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">بسته‌های اقامتی ویژه</h2>
          <p className="mt-4 leading-8 text-white/65">برای کامل‌تر شدن تجربهٔ اقامت، یکی از بسته‌های ویژه را به رزرو اتاق اضافه کنید.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((stayPackage) => (
            <Link key={stayPackage.id} href={`/booking?package=${encodeURIComponent(stayPackage.slug)}#form`} className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] transition hover:-translate-y-1 hover:border-gold-300/50 hover:bg-white/[0.09]">
              <div className="relative aspect-[16/9] overflow-hidden bg-brand-900">
                {stayPackage.image ? <Img src={stayPackage.image} alt={stayPackage.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-brand-800 to-brand-950"><Sparkles className="h-12 w-12 text-gold-300/70" /></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/70 to-transparent" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-extrabold text-white">{stayPackage.title}</h3>
                {stayPackage.description && <p className="mt-2 min-h-14 text-sm leading-7 text-white/65">{stayPackage.description}</p>}
                {stayPackage.features.length > 0 && <ul className="mt-4 space-y-2 text-sm text-white/80">{stayPackage.features.map((feature, index) => <li key={`${index}-${feature}`} className="flex items-start gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />{feature}</li>)}</ul>}
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-sm font-bold text-gold-200">{stayPackage.pricingMode === "fixed" ? `${formatPrice(stayPackage.price)} تومان` : "هماهنگی با پذیرش"}</span>
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-white transition group-hover:text-gold-200">انتخاب بسته <ArrowLeft className="h-4 w-4" /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
