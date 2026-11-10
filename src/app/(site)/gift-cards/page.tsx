import { Gift, Sparkles, ShieldCheck, Clock } from "lucide-react";
import { getSettings } from "@/lib/data";
import { PageHero } from "@/components/site/ui";
import { GiftBalanceForm, GiftOrderForm } from "@/components/site/guest-ui";
import { faNum } from "@/lib/utils";

export const metadata = { title: "کارت هدیه" };

export default async function GiftCardsPage() {
  const s = await getSettings();
  const amounts = s.giftCardAmounts.split(/[,،\s]+/).map((x) => Number(x)).filter((x) => x >= 100000).slice(0, 8);
  return (
    <>
      <PageHero eyebrow="هدیه‌ای به یادماندنی" title="کارت هدیه" subtitle={`یک اقامت، شام یا لحظه‌ای آرام در ${s.hotelName} هدیه دهید؛ کد کارت برای گیرنده پیامک می‌شود.`} image="/images/hero.jpg" />
      <section className="mx-auto grid max-w-6xl gap-8 px-6 py-14 lg:grid-cols-[1.4fr_1fr]">
        <div className="tpl-card rounded-box bg-base-100 p-6 shadow-sm ring-1 ring-base-300 md:p-8">
          <h2 className="mb-5 flex items-center gap-2 text-xl font-black text-brand-900"><Gift className="h-6 w-6 text-primary" /> خرید کارت هدیه</h2>
          <GiftOrderForm amounts={amounts.length ? amounts : [2000000, 5000000, 10000000]} min={Number(s.giftCardMin) || 1000000} />
        </div>
        <aside className="space-y-6">
          <div className="relative overflow-hidden rounded-box bg-gradient-to-br from-brand-800 to-brand-950 p-6 text-white shadow-xl">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-gold-400/25 blur-2xl" />
            <div className="text-xs text-white/60">{s.hotelName}</div>
            <div className="mt-8 font-mono text-2xl tracking-widest" dir="ltr">GC-••••-••••</div>
            <div className="mt-2 text-sm text-gold-300">GIFT CARD</div>
          </div>
          <ul className="space-y-3 text-sm text-base-content/70">
            <li className="flex gap-2"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />قابل استفاده برای پرداخت پیش‌پرداخت رزرو اتاق و خدمات</li>
            <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />اعتبار {faNum(s.giftCardValidMonths)} ماه از تاریخ صدور</li>
            <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />مانده کارت برای استفاده‌های بعدی حفظ می‌شود</li>
          </ul>
          <div className="tpl-card rounded-box bg-base-100 p-5 ring-1 ring-base-300">
            <h3 className="mb-3 font-extrabold">استعلام مانده کارت</h3>
            <GiftBalanceForm />
          </div>
        </aside>
      </section>
    </>
  );
}
