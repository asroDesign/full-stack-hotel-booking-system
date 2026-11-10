import { and, asc, eq } from "drizzle-orm";
import { Phone, MessageCircle, SearchCheck } from "lucide-react";
import { db } from "@/db";
import { rooms, services } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { getContent } from "@/lib/content";
import { toBookRoom, toBookService } from "@/lib/booking";
import { BookingForm } from "@/components/booking-form";
import { EmptyState } from "@/components/site/ui";
import { BookingProcess, TrackSection } from "@/components/site/booking-sections";
import { RulesTabs } from "@/components/site/rules-tabs";
import { faNum } from "@/lib/utils";

export const metadata = { title: "رزرو آنلاین" };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ room?: string; service?: string; checkIn?: string; checkOut?: string; guests?: string; promo?: string }> }) {
  const sp = await searchParams;
  const [s, { booking }] = await Promise.all([getSettings(), getContent()]);
  const [allRooms, bookable] = await Promise.all([
    db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(asc(rooms.sortOrder)),
    db.select().from(services).where(and(eq(services.isActive, true), eq(services.isBookable, true))).orderBy(asc(services.sortOrder)),
  ]);

  return (
    <div className="relative overflow-hidden pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[460px] bg-gradient-to-b from-brand-950 to-brand-800">
        <div className="pattern-dots absolute inset-0 opacity-20" />
      </div>
      <div className="mx-auto max-w-7xl space-y-10 px-4 md:px-6">
        <div className="text-center text-white">
          <h1 className="animate-fade-up text-4xl font-black md:text-5xl">{booking.pageTitle}</h1>
          <p className="mx-auto mt-3 max-w-2xl animate-fade-up text-white/70">{booking.pageSubtitle}</p>
          <a href="#track" className="frost mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white hover:bg-white/20">
            <SearchCheck className="h-4 w-4 text-gold-300" /> قبلاً رزرو کرده‌اید؟ پیگیری رزرو
          </a>
        </div>

        <BookingProcess title={booking.processTitle} subtitle={booking.processSubtitle} steps={booking.steps} notice={booking.notice} />

        <div id="form" className="grid scroll-mt-28 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="card card-border bg-base-100 shadow-sm p-5 shadow-xl md:p-8 block">
            <h2 className="mb-6 text-xl font-black text-slate-900">فرم درخواست رزرو</h2>
            {allRooms.length === 0 && bookable.length === 0 ? (
              <EmptyState title="در حال حاضر امکان رزرو وجود ندارد" desc="لطفاً با پذیرش تماس بگیرید." />
            ) : (
              <BookingForm
                depositPercent={Number(s.depositPercent) || 30}
                defaultKind={sp.service || allRooms.length === 0 ? "service" : "room"}
                defaultItemId={Number(sp.room || sp.service) || undefined}
                rooms={allRooms.map(toBookRoom)}
                services={bookable.map(toBookService)}
                hotelRules={booking.hotelRules}
                requireRulesAccept={booking.requireRulesAccept}
                initial={{ checkIn: sp.checkIn, checkOut: sp.checkOut, guests: Number(sp.guests) || undefined, promo: (sp.promo ?? "").toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 30) || undefined }}
              />
            )}
          </div>
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <RulesTabs
              groups={[
                { key: "hotel", title: booking.hotelRulesTitle, kind: "room", rules: booking.hotelRules },
                ...bookable.map((b) => ({ key: `s${b.id}`, title: `قوانین ${b.name}`, kind: "service" as const, rules: b.rules })),
              ]}
            />
            <div className="card card-border bg-base-100 shadow-sm p-5 block">
              <h3 className="font-extrabold text-slate-900">نیاز به راهنمایی دارید؟</h3>
              <p className="mt-1 text-sm leading-7 text-slate-500">کارشناسان پذیرش به‌صورت ۲۴ ساعته پاسخگوی شما هستند.</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a href={`tel:${s.phone}`} className="btn btn-primary"><Phone className="h-4 w-4" /><span dir="ltr">{faNum(s.phone)}</span></a>
                <a href={`https://wa.me/${s.whatsapp}`} target="_blank" rel="noreferrer" className="btn"><MessageCircle className="h-4 w-4" /> واتس‌اپ</a>
              </div>
            </div>
          </aside>
        </div>

        <TrackSection title={booking.trackTitle} text={booking.trackText} />
      </div>
    </div>
  );
}
