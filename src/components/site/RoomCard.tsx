import Link from "next/link";
import type { Room } from "@/db/schema";
import { formatMoney, toFa } from "@/lib/format";
import SmartImage from "@/components/site/SmartImage";

export default function RoomCard({ room, compact = false }: { room: Room; compact?: boolean }) {
  return (
    <article className="glass glass-hover flex h-full flex-col overflow-hidden rounded-3xl p-3">
      <Link href={`/rooms/${room.slug}`} className="glass-img relative block aspect-[4/3]">
        <SmartImage src={room.coverImage} alt={room.name} loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute right-3 top-3 rounded-full bg-white/70 px-2.5 py-1 text-[9px] font-bold text-forest-800 backdrop-blur">
          {room.roomType}
        </span>
        {room.featured ? (
          <span className="absolute left-3 top-3 rounded-full bg-forest-800/80 px-2.5 py-1 text-[9px] font-bold text-white backdrop-blur">
            پیشنهاد ویژه
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 px-1 pb-1 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[9px] font-bold text-forest-700">اتاق {toFa(room.roomNumber)}</p>
            <h3 className="text-sm font-black leading-6 text-forest-950">
              <Link href={`/rooms/${room.slug}`} className="transition hover:text-forest-700">
                {room.name}
              </Link>
            </h3>
          </div>
          <span className="glass-pill shrink-0 !px-2 !py-1 !text-[8px]">
            {toFa(room.capacity)}–{toFa(room.maxCapacity)} نفر
          </span>
        </div>

        <p className="line-clamp-2 text-[10px] leading-5 text-forest-800/55">{room.description}</p>

        {!compact ? (
          <div className="flex flex-wrap gap-1.5">
            {room.amenities.slice(0, 3).map((amenity) => (
              <span key={amenity} className="glass-pill !px-2 !py-0.5 !text-[8px] !font-semibold">
                {amenity}
              </span>
            ))}
            {room.amenities.length > 3 ? (
              <span className="glass-pill !px-2 !py-0.5 !text-[8px] !text-forest-700">+{toFa(room.amenities.length - 3)}</span>
            ) : null}
          </div>
        ) : null}

        <div className="glass-divider my-0.5" />

        <div className="mt-auto flex items-end justify-between gap-2">
          <div>
            <p className="text-[9px] text-forest-800/45">هر شب از</p>
            <p className="text-[13px] font-black text-forest-950">{formatMoney(room.pricePerNight)}</p>
            <p className="text-[8px] font-semibold text-forest-600">پیش‌پرداخت {toFa(room.prepaymentPercent)}٪</p>
          </div>
          <Link href={`/rooms/${room.slug}`} className="btn btn-ghost btn-sm">
            جزئیات و رزرو
          </Link>
        </div>
      </div>
    </article>
  );
}
