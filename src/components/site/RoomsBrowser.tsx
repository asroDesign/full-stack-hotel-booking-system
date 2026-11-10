"use client";

import { useMemo, useState } from "react";
import type { Room } from "@/db/schema";
import RoomCard from "@/components/site/RoomCard";
import { EmptyState } from "@/components/site/ui";
import { formatMoney, toFa } from "@/lib/format";

const SORTS = [
  { key: "default", label: "پیشنهاد هتل" },
  { key: "price-asc", label: "ارزان‌ترین" },
  { key: "price-desc", label: "گران‌ترین" },
  { key: "capacity", label: "بیشترین ظرفیت" },
];

export default function RoomsBrowser({ rooms }: { rooms: Room[] }) {
  const types = useMemo(() => ["همه", ...Array.from(new Set(rooms.map((room) => room.roomType)))], [rooms]);
  const [type, setType] = useState("همه");
  const [capacity, setCapacity] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [sort, setSort] = useState("default");
  const [query, setQuery] = useState("");

  const priceCeiling = Math.max(...rooms.map((room) => room.pricePerNight), 1);

  const filtered = useMemo(() => {
    let list = rooms.filter((room) => {
      const matchesType = type === "همه" || room.roomType === type;
      const matchesCapacity = capacity === 0 || room.capacity >= capacity;
      const matchesPrice = maxPrice === 0 || room.pricePerNight <= maxPrice;
      const matchesQuery =
        query.trim().length === 0 ||
        `${room.name} ${room.roomNumber} ${room.roomType}`.toLowerCase().includes(query.trim().toLowerCase());
      return matchesType && matchesCapacity && matchesPrice && matchesQuery;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.pricePerNight - b.pricePerNight);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.pricePerNight - a.pricePerNight);
    if (sort === "capacity") list = [...list].sort((a, b) => b.capacity - a.capacity);
    return list;
  }, [rooms, type, capacity, maxPrice, sort, query]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cream-200 bg-cream-50/60 p-4">
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <label className="field">
            <span className="label text-[11px]">جستجو در اتاق‌ها</span>
            <input
              className="input"
              placeholder="نام یا شماره اتاق…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="field">
            <span className="label text-[11px]">نوع اتاق</span>
            <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
              {types.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label text-[11px]">حداقل ظرفیت</span>
            <select className="input" value={capacity} onChange={(event) => setCapacity(Number(event.target.value))}>
              <option value={0}>همه</option>
              {[2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {toFa(value)} نفر و بیشتر
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="label text-[11px]">ترتیب نمایش</span>
            <select className="input" value={sort} onChange={(event) => setSort(event.target.value)}>
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-cream-100 pt-3">
          <label className="flex flex-1 items-center gap-3 text-[11px] text-forest-800/60">
            <span className="whitespace-nowrap">حداکثر قیمت شب:</span>
            <input
              type="range"
              min={priceCeiling * 0.3}
              max={priceCeiling}
              step={50000}
              value={maxPrice || priceCeiling}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              className="w-full accent-gold-500"
            />
            <span className="whitespace-nowrap font-bold text-forest-900">
              {maxPrice === 0 || maxPrice >= priceCeiling ? "همه" : formatMoney(maxPrice)}
            </span>
          </label>
          <p className="rounded-full bg-cream-100 px-3 py-1.5 text-[11px] font-semibold text-forest-800/70">
            {toFa(filtered.length)} اتاق از {toFa(rooms.length)} اتاق نمایش داده می‌شود
          </p>
          <button
            type="button"
            onClick={() => {
              setType("همه");
              setCapacity(0);
              setMaxPrice(0);
              setSort("default");
              setQuery("");
            }}
            className="text-[11px] font-semibold text-gold-600 underline-offset-4 hover:underline"
          >
            حذف فیلترها
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon="🔍"
          title="اتاقی با این مشخصات پیدا نشد"
          description="فیلترها را تغییر دهید یا همه اتاق‌ها را ببینید."
          action={
            <button type="button" onClick={() => { setType("همه"); setCapacity(0); setMaxPrice(0); setQuery(""); }} className="btn btn-primary btn-sm">
              نمایش همه اتاق‌ها
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}
