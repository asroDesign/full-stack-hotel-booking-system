import { Img } from "@/components/img";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ArrowLeft, Clock } from "lucide-react";
import { db } from "@/db";
import { services } from "@/db/schema";
import { PageHero, EmptyState } from "@/components/site/ui";
import { DynIcon } from "@/components/dyn-icon";
import { formatPrice } from "@/lib/utils";
import { getSettings } from "@/lib/data";
import { notFound } from "next/navigation";

export const metadata = { title: "خدمات هتل" };

export default async function ServicesPage() {
  const s = await getSettings();
  if (s.moduleServices !== "1") notFound();
  const list = await db.select().from(services).where(eq(services.isActive, true)).orderBy(asc(services.sortOrder));
  return (
    <>
      <PageHero eyebrow="خدمات ویژه" title={`خدمات ${s.hotelName}`} subtitle="خدمات ویژه‌ای که سفر شما را راحت‌تر و خاطره‌انگیزتر می‌کند." image={list[0]?.image || "/images/hero.jpg"} />
      <section className="mx-auto max-w-7xl px-6 py-14">
        {list.length === 0 ? (
          <EmptyState title="هنوز خدمتی ثبت نشده است" />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {list.map((s, i) => (
              <Link key={s.id} href={`/services/${s.slug}`} className={`group grid overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm transition hover:shadow-2xl sm:grid-cols-2 ${i === 0 ? "md:col-span-2 md:grid-cols-[1.3fr_1fr]" : ""}`}>
                <div className="relative min-h-56 overflow-hidden">
                  <Img src={s.image || "/images/hero.jpg"} alt={s.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                  {s.isBookable && <span className="absolute right-4 top-4 rounded-full bg-gold-400 px-3 py-1 text-xs font-bold text-brand-950">رزرو آنلاین</span>}
                </div>
                <div className="flex flex-col p-6">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700"><DynIcon name={s.icon} className="h-6 w-6" /></span>
                  <h2 className="mt-4 text-xl font-extrabold text-slate-900">{s.name}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">{s.shortDescription}</p>
                  {s.workingHours && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" />{s.workingHours}</p>}
                  <div className="mt-auto flex items-center justify-between pt-5">
                    <span className="text-sm font-bold text-brand-700">{s.price > 0 ? `${formatPrice(s.price)} تومان` : "رایگان / طبق منو"}</span>
                    <ArrowLeft className="h-4 w-4 text-brand-700 transition group-hover:-translate-x-1" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
