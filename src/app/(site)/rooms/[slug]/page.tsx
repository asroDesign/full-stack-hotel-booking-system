import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { BedDouble, Building2, CheckCircle2, ChevronLeft, Eye, Maximize, Users, Clock, PlusCircle } from "lucide-react";
import { db } from "@/db";
import { rooms, services } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { getContent } from "@/lib/content";
import { toBookRoom, toBookService } from "@/lib/booking";
import { optionUnitLabel } from "@/lib/pricing";
import { faNum, formatPrice } from "@/lib/utils";
import { Gallery, VideoPlayer } from "@/components/media";
import { BookingForm } from "@/components/booking-form";
import { RoomCard } from "@/components/site/ui";
import { getActiveStayPackages } from "@/lib/stay-packages";

export default async function RoomDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ checkIn?: string; checkOut?: string; guests?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const [room] = await db.select().from(rooms).where(eq(rooms.slug, decodeURIComponent(slug)));
  if (!room || !room.isActive) notFound();
  const [s, { booking }] = await Promise.all([getSettings(), getContent()]);
  const [allRooms, bookable, similar, packages] = await Promise.all([
    db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(asc(rooms.sortOrder)),
    db.select().from(services).where(and(eq(services.isActive, true), eq(services.isBookable, true))),
    db.select().from(rooms).where(and(eq(rooms.type, room.type), ne(rooms.id, room.id), eq(rooms.isActive, true))).limit(3),
    getActiveStayPackages(),
  ]);

  const specs = [
    { Icon: Users, label: "ظرفیت استاندارد", value: `${faNum(room.capacity)} نفر` },
    { Icon: PlusCircle, label: "حداکثر ظرفیت", value: room.extraBeds ? `${faNum(room.capacity + room.extraBeds)} نفر${room.extraGuestPrice ? ` (نفر اضافه ${formatPrice(room.extraGuestPrice)})` : ""}` : "بدون نفر اضافه" },
    { Icon: Maximize, label: "متراژ", value: `${faNum(room.size)} متر مربع` },
    { Icon: BedDouble, label: "نوع تخت", value: room.beds || "—" },
    { Icon: Eye, label: "چشم‌انداز", value: room.view || "—" },
    { Icon: Building2, label: "طبقه / شماره", value: `${faNum(room.floor)} / ${faNum(room.roomNumber)}` },
  ];

  return (
    <div className="mx-auto max-w-7xl px-6 pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
      <nav className="mb-6 flex items-center gap-1 text-sm text-slate-500">
        <Link href="/" className="hover:text-brand-700">خانه</Link><ChevronLeft className="h-4 w-4" />
        <Link href="/rooms" className="hover:text-brand-700">اتاق‌ها</Link><ChevronLeft className="h-4 w-4" />
        <span className="text-slate-800">{room.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-10">
          <Gallery images={room.images} alt={room.name} hasVideo={!!room.videoUrl} />

          <div>
            <span className="rounded-full bg-gold-400/15 px-3 py-1 text-xs font-bold text-gold-600">{room.type}</span>
            <h1 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">{room.name}</h1>
            <p className="mt-3 text-lg leading-8 text-slate-500">{room.shortDescription}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {specs.map(({ Icon, label, value }) => (
              <div key={label} className="card card-border bg-base-100 shadow-sm flex items-center gap-3 p-4 flex-row">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">{label}</div>
                  <div className="truncate text-sm font-bold text-slate-800">{value}</div>
                </div>
              </div>
            ))}
          </div>

          <section>
            <h2 className="mb-4 text-xl font-extrabold text-slate-900">درباره این اتاق</h2>
            <div className="space-y-4 leading-8 text-slate-600">
              {room.description.split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </section>

          {room.features.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-extrabold text-slate-900">امکانات اتاق</h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {room.features.map((f) => (
                  <div key={f} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-sm text-slate-700 ring-1 ring-slate-200/70">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-brand-600" /> {f}
                  </div>
                ))}
              </div>
            </section>
          )}

          {room.options.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-extrabold">خدمات و وعده‌های غذایی</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {room.options.map((o) => (
                  <div key={o.id} className="flex items-center justify-between rounded-box bg-base-100 px-4 py-3 text-sm ring-1 ring-base-300">
                    <span className="font-medium">{o.title}</span>
                    {o.included ? <span className="badge badge-success badge-soft">رایگان</span> : <span className="text-base-content/70">{formatPrice(o.price)} تومان <span className="text-xs text-base-content/50">/ {optionUnitLabel[o.unit]}</span></span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {room.videoUrl && (
            <section id="video" className="scroll-mt-28">
              <h2 className="mb-4 text-xl font-extrabold text-slate-900">ویدیوی معرفی اتاق</h2>
              <VideoPlayer url={room.videoUrl} poster={room.images[0]} />
            </section>
          )}

          {booking.hotelRules.length > 0 && (
            <section className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6">
              <h2 className="mb-4 text-lg font-extrabold text-amber-900">{booking.hotelRulesTitle}</h2>
              <ul className="space-y-2 text-sm leading-7 text-amber-900/80">
                {booking.hotelRules.map((r) => (
                  <li key={r} className="flex gap-2"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />{r}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="grid gap-3 rounded-3xl bg-brand-50 p-6 text-sm text-brand-900 md:grid-cols-3">
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> ورود از ساعت {faNum(s.checkInTime)}</div>
            <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> خروج تا ساعت {faNum(s.checkOutTime)}</div>
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> صبحانه رایگان</div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="card card-border bg-base-100 shadow-sm overflow-hidden block">
            <div className="bg-gradient-to-l from-brand-800 to-brand-950 p-5 text-white">
              <div className="text-sm text-white/70">قیمت پایه هر شب (روزهای تعطیل و پیک متفاوت است)</div>
              <div className="mt-1 text-3xl font-black">{formatPrice(room.pricePerNight)} <span className="text-base font-medium text-white/70">تومان</span></div>
            </div>
            <div className="p-5">
              <BookingForm
                compact
                depositPercent={Number(s.depositPercent) || 30}
                defaultKind="room"
                defaultItemId={room.id}
                rooms={allRooms.map(toBookRoom)}
                services={bookable.map(toBookService)}
                packages={packages}
                hotelRules={booking.hotelRules}
                requireRulesAccept={booking.requireRulesAccept}
                initial={{ checkIn: sp.checkIn, checkOut: sp.checkOut, guests: Number(sp.guests) || undefined }}
              />
            </div>
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl font-black text-slate-900">اتاق‌های مشابه</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((r) => <RoomCard key={r.id} room={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
