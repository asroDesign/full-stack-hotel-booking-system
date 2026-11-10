import { Img } from "@/components/img";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Users } from "lucide-react";
import { getSettings } from "@/lib/data";
import { getActiveVenues, priceLevelLabel, venueKindLabel } from "@/lib/dining";
import { PageHero, EmptyState } from "@/components/site/ui";
import { faNum } from "@/lib/utils";

export const metadata = { title: "رستوران و کافه" };

export default async function DiningPage() {
  const s = await getSettings();
  if (s.moduleDining !== "1") notFound();
  const venues = await getActiveVenues();
  return (
    <>
      <PageHero eyebrow="طعم‌ها" title="رستوران و کافه" subtitle={`منوی کامل رستوران‌ها و کافه‌های ${s.hotelName}؛ برای مهمانان هتل و عموم.`} image={venues[0]?.images[0] || "/images/hero.jpg"} />
      <section className="mx-auto max-w-7xl px-6 py-14">
        {venues.length === 0 ? (
          <EmptyState title="هنوز رستوران یا کافه‌ای معرفی نشده است" />
        ) : (
          <div className="space-y-8">
            {venues.map((v, i) => (
              <Link key={v.id} href={`/dining/${v.slug}`} className={`tpl-card group grid overflow-hidden rounded-box bg-base-100 shadow-sm ring-1 ring-base-300 transition hover:shadow-xl md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}>
                <div className="relative min-h-64 overflow-hidden">
                  <Img src={v.images[0] || "/images/hero.jpg"} alt={v.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                  <span className="absolute right-4 top-4 badge badge-secondary">{venueKindLabel(v.kind)}</span>
                </div>
                <div className="flex flex-col justify-center p-8 md:p-10">
                  <div className="text-sm text-gold-600">{v.cuisine} <span className="text-base-content/40">{priceLevelLabel(v.priceLevel)}</span></div>
                  <h2 className="mt-2 text-3xl font-black text-brand-900">{v.name}</h2>
                  {v.tagline && <p className="mt-2 text-lg text-base-content/60">{v.tagline}</p>}
                  <div className="mt-5 flex flex-wrap gap-2 text-xs">
                    {v.hours.map((h, j) => <span key={j} className="badge badge-ghost gap-1"><Clock className="h-3 w-3" />{h.label}: {h.time}</span>)}
                    {v.capacity > 0 && <span className="badge badge-ghost gap-1"><Users className="h-3 w-3" />{faNum(v.capacity)} نفر</span>}
                    {!v.openToPublic && <span className="badge badge-warning badge-soft">ویژه مهمانان هتل</span>}
                  </div>
                  <span className="mt-6 inline-flex items-center gap-1 font-bold text-brand-700">{v.showMenu ? "مشاهده منو و جزئیات" : "مشاهده جزئیات"} <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
