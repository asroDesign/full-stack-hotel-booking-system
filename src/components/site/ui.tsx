import { Img } from "@/components/img";
import Link from "next/link";
import { BedDouble, Maximize, Users, ArrowLeft, Eye, PlayCircle, MapPin, Clock } from "lucide-react";
import type { Attraction, Room } from "@/db/schema";
import { cn, faNum, formatPrice } from "@/lib/utils";

export function SectionTitle({
  eyebrow,
  title,
  desc,
  center = true,
  light = false,
}: {
  eyebrow: string;
  title: string;
  desc?: string;
  center?: boolean;
  light?: boolean;
}) {
  return (
    <div className={cn("mb-12 max-w-2xl", center && "mx-auto text-center")}>
      <span
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold tracking-wide",
          light ? "bg-white/10 text-gold-300" : "bg-gold-400/15 text-gold-600",
        )}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {eyebrow}
      </span>
      <h2 className={cn("mt-4 text-3xl font-black leading-tight md:text-4xl", light ? "text-white" : "text-slate-900")}>{title}</h2>
      {desc && <p className={cn("mt-4 leading-8", light ? "text-white/70" : "text-slate-500")}>{desc}</p>}
    </div>
  );
}

export function PageHero({ title, subtitle, image, eyebrow }: { title: string; subtitle?: string; image: string; eyebrow?: string }) {
  return (
    <>
      {/* luxe: dark full-bleed image banner */}
      <section className="relative isolate overflow-hidden pb-16 pt-40 in-data-[tpl=boutique]:hidden in-data-[tpl=soft]:hidden in-data-[tpl=glass]:hidden">
        <Img src={image} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-950/80 via-brand-950/70 to-brand-950/90" />
        <div className="mx-auto max-w-7xl px-6 text-center text-white">
          {eyebrow && <span className="frost inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-gold-300">{eyebrow}</span>}
          <h1 className="mt-4 animate-fade-up text-4xl font-black md:text-5xl">{title}</h1>
          {subtitle && <p className="mx-auto mt-4 max-w-2xl animate-fade-up leading-8 text-white/75">{subtitle}</p>}
        </div>
      </section>
      {/* glass: frosted panel with image window */}
      <section className="hidden px-4 pt-28 in-data-[tpl=glass]:block">
        <div className="glass-panel mx-auto grid max-w-7xl items-center gap-8 rounded-[2rem] p-6 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div className="animate-fade-up">
            {eyebrow && <span className="glass-chip inline-flex rounded-full px-4 py-1.5 text-xs font-bold text-primary">{eyebrow}</span>}
            <h1 className="text-aurora mt-4 text-4xl font-black leading-tight md:text-5xl">{title}</h1>
            {subtitle && <p className="mt-4 max-w-xl leading-8 text-base-content/65">{subtitle}</p>}
          </div>
          <div className="relative hidden h-56 overflow-hidden rounded-[1.5rem] ring-1 ring-white/70 md:block">
            <Img src={image} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-900/30 to-transparent" />
          </div>
        </div>
      </section>
      {/* soft: neumorphic raised banner with inset image */}
      <section className="hidden px-4 pt-28 in-data-[tpl=soft]:block">
        <div className="neu mx-auto grid max-w-7xl items-center gap-8 rounded-[2.5rem] p-6 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div className="animate-fade-up">
            {eyebrow && <span className="neu-inset-sm inline-flex rounded-full px-4 py-1.5 text-xs font-bold text-primary">{eyebrow}</span>}
            <h1 className="mt-4 text-4xl font-black text-brand-900 md:text-5xl">{title}</h1>
            {subtitle && <p className="mt-4 max-w-xl leading-8 text-base-content/60">{subtitle}</p>}
          </div>
          <div className="neu-inset hidden rounded-[2rem] p-2 md:block">
            <Img src={image} alt="" className="h-52 w-full rounded-[1.6rem] object-cover" />
          </div>
        </div>
      </section>
      {/* boutique: light editorial split banner */}
      <section className="hidden border-b border-base-300 in-data-[tpl=boutique]:block">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-6 py-10 md:grid-cols-[1.2fr_1fr] md:py-14">
          <div className="animate-fade-up">
            {eyebrow && <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-600"><span className="h-px w-10 bg-gold-500" />{eyebrow}</div>}
            <h1 className="mt-3 text-4xl font-black text-brand-900 md:text-5xl">{title}</h1>
            {subtitle && <p className="mt-4 max-w-xl leading-8 text-base-content/60">{subtitle}</p>}
          </div>
          <div className="relative hidden h-56 overflow-hidden rounded-box md:block">
            <Img src={image} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>
    </>
  );
}

export function RoomCard({ room, query, stay }: { room: Room; query?: string; stay?: { nights: number; total: number } }) {
  return (
    <Link
      href={`/rooms/${room.slug}${query ? `?${query}` : ""}`}
      className="tpl-card group flex flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm transition duration-500 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-brand-900/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Img src={room.images[0] ?? "/images/hero.jpg"} alt={room.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent" />
        <span className="frost absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-semibold text-white">{room.type}</span>
        {room.videoUrl && (
          <span className="frost absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white">
            <PlayCircle className="h-3.5 w-3.5" /> ویدیو
          </span>
        )}
        <div className="absolute bottom-3 right-3 text-white">
          {stay ? (
            <>
              <span className="text-xl font-black">{formatPrice(stay.total)}</span>
              <span className="text-xs text-white/80"> تومان / {faNum(stay.nights)} شب</span>
            </>
          ) : (
            <>
              <span className="text-xl font-black">{formatPrice(room.pricePerNight)}</span>
              <span className="text-xs text-white/80"> تومان / شب</span>
            </>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-extrabold text-slate-900">{room.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-7 text-slate-500">{room.shortDescription}</p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-slate-600">
          <span className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-2"><Users className="h-3.5 w-3.5 text-brand-600" />{faNum(room.capacity)} نفر</span>
          <span className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-2"><Maximize className="h-3.5 w-3.5 text-brand-600" />{faNum(room.size)} متر</span>
          <span className="flex items-center gap-1.5 truncate rounded-xl bg-slate-50 px-2 py-2"><Eye className="h-3.5 w-3.5 shrink-0 text-brand-600" /><span className="truncate">{room.view || "—"}</span></span>
        </div>
        <div className="mt-auto flex items-center justify-between pt-5 text-sm font-bold text-brand-700">
          <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4" /> مشاهده و رزرو</span>
          <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

export function AttractionCard({ a }: { a: Attraction }) {
  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-3xl shadow-lg">
      <Img src={a.image || "/images/hero.jpg"} alt={a.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/30 to-transparent" />
      <span className="frost absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-semibold text-white">{a.category}</span>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        <h3 className="text-xl font-extrabold">{a.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/75 transition-all group-hover:line-clamp-none">{a.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"><MapPin className="h-3 w-3" />{faNum(a.distanceKm)} کیلومتر</span>
          {a.travelTime && <span className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1"><Clock className="h-3 w-3" />{a.travelTime}</span>}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-2xl">🏨</div>
      <h3 className="mt-4 font-bold text-slate-800">{title}</h3>
      {desc && <p className="mt-1 text-sm text-slate-500">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
