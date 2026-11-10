import { notFound } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { attractions } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { PageHero, AttractionCard, EmptyState, SectionTitle } from "@/components/site/ui";
import { MapView } from "@/components/map-view";
import { faNum } from "@/lib/utils";

export const metadata = { title: "جاذبه‌های گردشگری اطراف" };

export default async function AttractionsPage() {
  const s = await getSettings();
  if (s.moduleAttractions !== "1") notFound();
  const list = await db.select().from(attractions).orderBy(asc(attractions.sortOrder));
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  const cats = Array.from(new Set(list.map((a) => a.category)));

  return (
    <>
      <PageHero eyebrow={`${faNum(list.length)} مقصد دیدنی`} title="جاذبه‌های گردشگری اطراف" subtitle={`${s.hotelName} بهترین نقطه شروع برای کشف جاذبه‌های ${s.city || "اطراف"} است.`} image="https://images.pexels.com/photos/4146757/pexels-photo-4146757.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280" />
      <section className="mx-auto max-w-7xl px-6 py-14">
        <SectionTitle eyebrow="نقشه تعاملی" title="جاذبه‌ها روی نقشه" desc="روی هر نشانگر کلیک کنید تا نام و فاصله آن تا هتل را ببینید." />
        <MapView
          center={{ lat, lng }}
          fitBounds
          zoom={10}
          className="h-[480px] shadow-xl ring-1 ring-slate-200"
          markers={[
            { lat, lng, title: s.hotelName, subtitle: "محل اقامت شما", kind: "hotel" },
            ...list.filter((a) => a.lat && a.lng).map((a) => ({ lat: a.lat, lng: a.lng, title: a.name, subtitle: `${faNum(a.distanceKm)} کیلومتر · ${a.travelTime}` })),
          ]}
        />
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {cats.map((c) => (
            <span key={c} className="rounded-full bg-white px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">{c} · {faNum(list.filter((a) => a.category === c).length)}</span>
          ))}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-6 pb-10">
        {list.length === 0 ? (
          <EmptyState title="هنوز جاذبه‌ای ثبت نشده است" />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((a) => <AttractionCard key={a.id} a={a} />)}
          </div>
        )}
      </section>
    </>
  );
}
