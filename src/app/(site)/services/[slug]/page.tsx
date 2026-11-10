import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { ChevronLeft, Clock, ShieldAlert, Users, Phone } from "lucide-react";
import { db } from "@/db";
import { rooms, services } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { getContent } from "@/lib/content";
import { minServicePrice, toBookRoom, toBookService } from "@/lib/booking";
import { faNum, formatPrice } from "@/lib/utils";
import { Gallery, VideoPlayer } from "@/components/media";
import { BookingForm } from "@/components/booking-form";
import { DynIcon } from "@/components/dyn-icon";

export default async function ServiceDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [svc] = await db.select().from(services).where(eq(services.slug, decodeURIComponent(slug)));
  if (!svc || !svc.isActive) notFound();
  const [s, { booking }] = await Promise.all([getSettings(), getContent()]);
  const fromPrice = minServicePrice(svc);
  const [allRooms, bookable] = await Promise.all([
    db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(asc(rooms.sortOrder)),
    db.select().from(services).where(and(eq(services.isActive, true), eq(services.isBookable, true))),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
      <nav className="mb-6 flex items-center gap-1 text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">خانه</Link><ChevronLeft className="h-4 w-4" />
        <Link href="/services" className="hover:text-brand-700">خدمات</Link><ChevronLeft className="h-4 w-4" />
        <span className="text-slate-800">{svc.name}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          <Gallery images={svc.gallery.length ? svc.gallery : [svc.image]} alt={svc.name} hasVideo={!!svc.videoUrl} />
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white"><DynIcon name={svc.icon} className="h-7 w-7" /></span>
            <div>
              <h1 className="text-3xl font-black text-slate-900 md:text-4xl">{svc.name}</h1>
              <p className="mt-2 text-lg leading-8 text-slate-500">{svc.shortDescription}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {svc.workingHours && <div className="card card-border bg-base-100 shadow-sm flex items-center gap-3 p-4 text-sm flex-row"><Clock className="h-5 w-5 text-brand-600" />{svc.workingHours}</div>}
            {svc.isBookable && <div className="card card-border bg-base-100 shadow-sm flex items-center gap-3 p-4 text-sm flex-row"><Users className="h-5 w-5 text-brand-600" />حداکثر {faNum(svc.maxGuests)} نفر</div>}
            {fromPrice > 0 && <div className="card card-border bg-base-100 shadow-sm p-4 text-sm block"><span className="text-slate-500">{Object.keys(svc.slotPrices).length ? "از " : ""}</span><span className="font-black text-brand-700">{formatPrice(fromPrice)} تومان</span><span className="text-slate-500"> / {svc.priceUnit}</span></div>}
          </div>
          <div className="space-y-4 leading-8 text-slate-600">
            {svc.description.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
          </div>
          {svc.timeSlots.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-extrabold text-slate-900">سانس‌ها و قیمت‌ها</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {svc.timeSlots.map((t) => (
                  <div key={t} className="rounded-2xl border border-brand-100 bg-gradient-to-b from-brand-50 to-white p-4 text-center">
                    <div dir="ltr" className="font-mono text-sm font-bold text-brand-800">{faNum(t)}</div>
                    <div className="mt-1 text-sm font-black text-slate-900">{formatPrice(svc.slotPrices[t] ?? svc.price)}</div>
                    <div className="text-[11px] text-slate-400">تومان</div>
                  </div>
                ))}
              </div>
              {svc.extraGuestPrice > 0 && (
                <p className="mt-4 flex items-center gap-2 rounded-2xl bg-gold-400/10 px-4 py-3 text-sm text-slate-700">
                  <Users className="h-4 w-4 text-gold-600" />
                  قیمت هر سانس برای حداکثر {faNum(svc.includedGuests)} نفر است؛ به ازای هر نفر اضافه {formatPrice(svc.extraGuestPrice)} تومان (حداکثر {faNum(svc.maxGuests)} نفر).
                </p>
              )}
            </section>
          )}
          {svc.rules.length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold text-amber-900"><ShieldAlert className="h-5 w-5" /> قوانین و مقررات</h2>
              <ul className="space-y-2 text-sm leading-7 text-amber-900/80">
                {svc.rules.map((r) => <li key={r} className="flex gap-2"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{r}</li>)}
              </ul>
            </section>
          )}
          {svc.videoUrl && (
            <section id="video" className="scroll-mt-28">
              <h2 className="mb-4 text-xl font-extrabold text-slate-900">ویدیو</h2>
              <VideoPlayer url={svc.videoUrl} poster={svc.image} />
            </section>
          )}
        </div>
        <aside className="lg:sticky lg:top-28 lg:self-start">
          {svc.isBookable ? (
            <div className="card card-border bg-base-100 shadow-sm overflow-hidden block">
              <div className="bg-gradient-to-l from-brand-800 to-brand-950 p-5 text-white">
                <div className="text-sm text-white/70">رزرو {svc.name}</div>
                <div className="mt-1 text-2xl font-black">{Object.keys(svc.slotPrices).length ? <span className="text-sm font-medium text-white/70">از </span> : null}{formatPrice(fromPrice)} <span className="text-sm font-medium text-white/70">تومان · {svc.priceUnit}</span></div>
              </div>
              <div className="p-5">
                <BookingForm
                  compact
                  depositPercent={Number(s.depositPercent) || 30}
                  defaultKind="service"
                  defaultItemId={svc.id}
                  rooms={allRooms.map(toBookRoom)}
                  services={bookable.map(toBookService)}
                  hotelRules={booking.hotelRules}
                  requireRulesAccept={booking.requireRulesAccept}
                />
              </div>
            </div>
          ) : (
            <div className="card card-border bg-base-100 shadow-sm p-6 text-center block">
              <h3 className="font-extrabold text-slate-900">اطلاعات بیشتر</h3>
              <p className="mt-2 text-sm leading-7 text-slate-500">این خدمت برای مهمانان هتل در دسترس است. برای هماهنگی با پذیرش تماس بگیرید.</p>
              <a href={`tel:${s.phone}`} className="btn btn-primary mt-4 w-full"><Phone className="h-4 w-4" /><span dir="ltr">{faNum(s.phone)}</span></a>
              <Link href="/booking" className="btn btn-secondary mt-2 w-full">رزرو اتاق</Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
