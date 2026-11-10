"use client";

import { Img } from "@/components/img";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Maximize, Users, Eye } from "lucide-react";
import { cn, faNum, formatPrice } from "@/lib/utils";

export type ExplorerRoom = {
  id: number;
  slug: string;
  name: string;
  type: string;
  image: string;
  capacity: number;
  extraBeds: number;
  size: number;
  view: string;
  price: number;
};

/** Room explorer: glass filter chips + photo cards with frosted info panels. */
export function GlassRoomExplorer({ rooms, limit = 6 }: { rooms: ExplorerRoom[]; limit?: number }) {
  const types = useMemo(() => Array.from(new Set(rooms.map((r) => r.type))), [rooms]);
  const [type, setType] = useState<string>("all");
  const list = (type === "all" ? rooms : rooms.filter((r) => r.type === type)).slice(0, limit);
  const total = type === "all" ? rooms.length : rooms.filter((r) => r.type === type).length;

  return (
    <div>
      <div role="tablist" className="no-scrollbar mb-8 flex gap-2 overflow-x-auto pb-1">
        {[{ k: "all", l: "همه" }, ...types.map((t) => ({ k: t, l: t }))].map(({ k, l }) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={type === k}
            onClick={() => setType(k)}
            className={cn(
              "whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition",
              type === k ? "bg-gradient-to-l from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-500/30" : "glass-chip text-base-content/70 hover:text-brand-800",
            )}
          >
            {l}
            {k !== "all" && <span className="mr-1.5 text-xs opacity-70">{faNum(rooms.filter((r) => r.type === k).length)}</span>}
          </button>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r, i) => (
          <Link
            key={r.id}
            href={`/rooms/${r.slug}`}
            style={{ animationDelay: `${i * 60}ms` }}
            className={cn("group relative animate-fade-up overflow-hidden rounded-[1.75rem] ring-1 ring-white/70", i === 0 && list.length > 3 ? "h-[440px] lg:row-span-2 lg:h-auto" : "h-[400px]")}
          >
            <Img src={r.image || "/images/hero.jpg"} alt={r.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <span className="glass-dark absolute right-4 top-4 rounded-full px-3 py-1 text-xs">{r.type}</span>
            <div className="glass-strong absolute inset-x-3 bottom-3 rounded-[1.25rem] p-4 transition group-hover:-translate-y-1">
              <h3 className="font-extrabold text-brand-950">{r.name}</h3>
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-base-content/60">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{faNum(r.capacity)}{r.extraBeds ? `+${faNum(r.extraBeds)}` : ""} نفر</span>
                <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{faNum(r.size)} متر</span>
                {r.view && <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{r.view}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/70 pt-3">
                <span><span className="text-lg font-black text-primary">{formatPrice(r.price)}</span> <span className="text-[11px] text-base-content/50">تومان / شب</span></span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white transition group-hover:scale-110"><ArrowLeft className="h-4 w-4" /></span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {total > list.length && (
        <div className="mt-8 text-center">
          <Link href={type === "all" ? "/rooms" : `/rooms?type=${encodeURIComponent(type)}`} className="btn rounded-full px-7">
            مشاهده همه {faNum(total)} اتاق <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      )}
    </div>
  );
}
