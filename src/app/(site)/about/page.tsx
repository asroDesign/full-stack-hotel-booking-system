import { Img } from "@/components/img";
import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { Heart, Leaf, ShieldCheck, Users, Award, CalendarCheck } from "lucide-react";
import { db } from "@/db";
import { reservations, rooms, testimonials } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { PageHero, SectionTitle } from "@/components/site/ui";
import { faNum } from "@/lib/utils";

export const metadata = { title: "درباره ما" };

export default async function AboutPage() {
  const s = await getSettings();
  const [[rc], [gc], [tc]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(rooms),
    db.select({ c: sql<number>`count(*)::int` }).from(reservations),
    db.select({ c: sql<number>`coalesce(round(avg(rating)::numeric,1),5)::float` }).from(testimonials).where(eq(testimonials.isApproved, true)),
  ]);
  const years = Math.max(1, 1404 - Number(s.foundedYear || 1398));

  return (
    <>
      <PageHero eyebrow="درباره ما" title={s.aboutTitle} subtitle={s.tagline} image="https://images.pexels.com/photos/40317538/pexels-photo-40317538.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280" />
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div className="relative">
          <div className="grid grid-cols-2 gap-4">
            <Img src="/images/hero.jpg" alt="" className="col-span-2 aspect-[16/9] w-full rounded-3xl object-cover shadow-xl" />
            <Img src="/images/pool.jpg" alt="" className="aspect-square w-full rounded-3xl object-cover" />
            <Img src="https://images.pexels.com/photos/28999503/pexels-photo-28999503.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=600" alt="" className="aspect-square w-full rounded-3xl object-cover" />
          </div>
          <div className="absolute -bottom-6 right-6 rounded-3xl bg-gold-400 p-5 text-brand-950 shadow-xl">
            <div className="text-4xl font-black">{faNum(years)}+</div>
            <div className="text-sm font-semibold">سال مهمان‌نوازی</div>
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="داستان ما" title="مهمان‌نوازی اصیل، با نگاهی مدرن" center={false} />
          <div className="-mt-6 space-y-4 text-lg leading-9 text-slate-600">
            {s.aboutText.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { v: faNum(rc.c), l: "اتاق و سوئیت" },
              { v: `${faNum(gc.c + 1200)}+`, l: "مهمان راضی" },
              { v: faNum(tc.c), l: "امتیاز مهمانان" },
            ].map((x) => (
              <div key={x.l} className="card card-border bg-base-100 shadow-sm p-4 text-center block">
                <div className="text-2xl font-black text-brand-700">{x.v}</div>
                <div className="mt-1 text-xs text-slate-500">{x.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-brand-950 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <SectionTitle eyebrow="ارزش‌های ما" title={`آنچه ${s.hotelName} را متفاوت می‌کند`} light />
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Heart, t: "مهمان‌نوازی خانوادگی", d: "با شما مثل عضوی از خانواده رفتار می‌کنیم." },
              { Icon: ShieldCheck, t: "حریم خصوصی", d: "فضایی آرام و امن برای خانواده‌ها و مسافران کاری." },
              { Icon: Leaf, t: "محلی و طبیعی", d: "مواد اولیه تازه و طعم‌های اصیل محلی." },
              { Icon: Award, t: "کیفیت پایدار", d: `نظافت و نگهداری با استانداردهای هتل‌های ${["", "یک", "دو", "سه", "چهار", "پنج"][Number(s.stars)] ?? ""} ستاره.` },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 transition hover:bg-white/10">
                <Icon className="h-8 w-8 text-gold-300" />
                <h3 className="mt-4 font-extrabold text-white">{t}</h3>
                <p className="mt-2 text-sm leading-7 text-white/60">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20 text-center">
        <Users className="mx-auto h-10 w-10 text-brand-600" />
        <h2 className="mt-4 text-3xl font-black text-slate-900">تیم {s.hotelName} منتظر شماست</h2>
        <p className="mt-4 leading-8 text-slate-500">کارکنان ما به زبان‌های فارسی، ترکی آذربایجانی و انگلیسی آماده پاسخگویی هستند.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/booking" className="btn btn-secondary px-8 h-12"><CalendarCheck className="h-4 w-4" /> رزرو</Link>
          <Link href="/contact" className="btn px-8 h-12">تماس با ما</Link>
        </div>
      </section>
    </>
  );
}
