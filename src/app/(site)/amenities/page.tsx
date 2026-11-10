import { notFound } from "next/navigation";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { CalendarCheck } from "lucide-react";
import { db } from "@/db";
import { amenities } from "@/db/schema";
import { PageHero, EmptyState } from "@/components/site/ui";
import { DynIcon } from "@/components/dyn-icon";
import { faNum } from "@/lib/utils";
import { getSettings } from "@/lib/data";

export const metadata = { title: "امکانات هتل" };

export default async function AmenitiesPage() {
  const [list, s] = await Promise.all([db.select().from(amenities).orderBy(asc(amenities.sortOrder)), getSettings()]);
  if (s.moduleAmenities !== "1") notFound();
  const groups = Array.from(new Set(list.map((a) => a.category)));
  return (
    <>
      <PageHero eyebrow={`${faNum(list.length)} امکان رفاهی`} title={`امکانات ${s.hotelName}`} subtitle="همه آنچه برای یک سفر راحت و خاطره‌انگیز نیاز دارید، زیر یک سقف." image="https://images.pexels.com/photos/12391805/pexels-photo-12391805.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280" />
      <section className="mx-auto max-w-7xl space-y-14 px-6 py-14">
        {list.length === 0 && <EmptyState title="هنوز امکاناتی ثبت نشده است" />}
        {groups.map((g) => (
          <div key={g}>
            <h2 className="mb-6 flex items-center gap-3 text-2xl font-black text-slate-900">
              <span className="h-8 w-1.5 rounded-full bg-gold-400" /> {g}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {list.filter((a) => a.category === g).map((a) => (
                <div key={a.id} className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-6 transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-brand-50 transition group-hover:scale-150" />
                  <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-lg shadow-brand-700/20">
                    <DynIcon name={a.icon} className="h-6 w-6" />
                  </span>
                  <h3 className="relative mt-5 font-extrabold text-slate-900">{a.title}</h3>
                  <p className="relative mt-1.5 text-sm leading-6 text-slate-500">{a.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-gradient-to-l from-brand-800 to-brand-950 p-8 text-white md:flex-row">
          <div>
            <h3 className="text-2xl font-black">آماده تجربه اقامت در {s.hotelName} هستید؟</h3>
            <p className="mt-2 text-white/70">همین حالا اتاق خود را آنلاین رزرو کنید و کد رزرو بگیرید.</p>
          </div>
          <Link href="/booking" className="btn btn-secondary px-8 h-12"><CalendarCheck className="h-4 w-4" /> رزرو آنلاین</Link>
        </div>
      </section>
    </>
  );
}
