import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ChevronLeft, Clock, Users, Phone, CheckCircle2, UtensilsCrossed } from "lucide-react";
import { db } from "@/db";
import { diningVenues } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { getVenueMenu, priceLevelLabel, venueKindLabel } from "@/lib/dining";
import { Gallery, VideoPlayer } from "@/components/media";
import { MenuBrowser } from "@/components/site/menu-browser";
import { TableBookingForm } from "@/components/site/guest-ui";
import { faNum } from "@/lib/utils";

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = await getSettings();
  if (s.moduleDining !== "1") notFound();
  const [v] = await db.select().from(diningVenues).where(and(eq(diningVenues.slug, decodeURIComponent(slug)), eq(diningVenues.isActive, true)));
  if (!v) notFound();
  const menu = v.showMenu ? await getVenueMenu(v.id) : [];
  const phone = v.phone || s.phone;
  return (
    <div className="mx-auto max-w-7xl px-6 pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
      <nav className="mb-6 flex items-center gap-1 text-sm text-base-content/50">
        <Link href="/" className="hover:text-brand-700">خانه</Link><ChevronLeft className="h-4 w-4" />
        <Link href="/dining" className="hover:text-brand-700">رستوران و کافه</Link><ChevronLeft className="h-4 w-4" />
        <span className="text-base-content">{v.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <Gallery images={v.images} alt={v.name} hasVideo={!!v.videoUrl} />
          <div>
            <span className="badge badge-secondary">{venueKindLabel(v.kind)}</span>
            <h1 className="mt-3 text-3xl font-black text-brand-900 md:text-4xl">{v.name}</h1>
            {v.tagline && <p className="mt-2 text-lg text-base-content/60">{v.tagline}</p>}
          </div>
          <div className="space-y-4 leading-8 text-base-content/70">{v.description.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div>
          {v.videoUrl && <section id="video" className="scroll-mt-28"><VideoPlayer url={v.videoUrl} poster={v.images[0]} /></section>}
        </div>
        <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
          {v.bookingEnabled && <div className="tpl-card rounded-box bg-base-100 p-5 shadow-sm ring-1 ring-base-300"><TableBookingForm venueId={v.id} venueName={v.name} /></div>}
          <div className="card card-border bg-base-100 shadow-sm">
            <div className="card-body gap-4 p-6">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-extrabold text-brand-900"><UtensilsCrossed className="h-5 w-5 text-gold-500" />{v.cuisine || venueKindLabel(v.kind)}</span>
                <span className="text-base-content/50">{priceLevelLabel(v.priceLevel)}</span>
              </div>
              {v.hours.length > 0 && (
                <ul className="space-y-2 rounded-box bg-base-200/60 p-4 text-sm">
                  {v.hours.map((h, i) => <li key={i} className="flex justify-between"><span className="flex items-center gap-2"><Clock className="h-4 w-4 text-brand-600" />{h.label}</span><span className="font-medium">{h.time}</span></li>)}
                </ul>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {v.capacity > 0 && <span className="badge badge-ghost gap-1"><Users className="h-3 w-3" />ظرفیت {faNum(v.capacity)} نفر</span>}
                <span className={`badge badge-soft ${v.openToPublic ? "badge-success" : "badge-warning"}`}>{v.openToPublic ? "پذیرش مهمانان غیرمقیم" : "ویژه مهمانان هتل"}</span>
              </div>
              {v.features.length > 0 && (
                <ul className="space-y-2 text-sm">{v.features.map((f) => <li key={f} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" />{f}</li>)}</ul>
              )}
              {phone && <a href={`tel:${phone}`} className="btn btn-primary"><Phone className="h-4 w-4" /> رزرو میز: <span dir="ltr">{faNum(phone)}</span></a>}
              {menu.length > 0 && <a href="#menu" className="btn">مشاهده منو</a>}
            </div>
          </div>
        </aside>
      </div>
      {menu.length > 0 && (
        <section id="menu" className="mt-16 scroll-mt-28">
          <h2 className="mb-6 text-3xl font-black text-brand-900">منوی {v.name}</h2>
          <MenuBrowser categories={menu.map((c) => ({ name: c.name, items: c.items.map((i) => ({ id: i.id, name: i.name, description: i.description, price: i.price, image: i.image, tags: i.tags, isAvailable: i.isAvailable, isSignature: i.isSignature })) }))} />
        </section>
      )}
    </div>
  );
}
