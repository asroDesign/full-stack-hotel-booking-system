"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addDaysISO, todayISO, toFa } from "@/lib/format";

export default function QuickSearch() {
  const router = useRouter();
  const [checkIn, setCheckIn] = useState(addDaysISO(1));
  const [checkOut, setCheckOut] = useState(addDaysISO(3));
  const [guests, setGuests] = useState("2");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams({ service: "room", checkIn, checkOut, adults: guests });
        router.push(`/booking?${params.toString()}`);
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
    >
      <label className="field">
        <span className="text-[9px] font-bold text-forest-800/50">تاریخ ورود</span>
        <input
          type="date"
          value={checkIn}
          min={todayISO()}
          onChange={(event) => {
            setCheckIn(event.target.value);
            if (event.target.value >= checkOut) setCheckOut(addDaysISO(1, new Date(event.target.value)));
          }}
          className="input py-2 text-xs"
        />
      </label>
      <label className="field">
        <span className="text-[9px] font-bold text-forest-800/50">تاریخ خروج</span>
        <input
          type="date"
          value={checkOut}
          min={addDaysISO(1, new Date(checkIn))}
          onChange={(event) => setCheckOut(event.target.value)}
          className="input py-2 text-xs"
        />
      </label>
      <label className="field">
        <span className="text-[9px] font-bold text-forest-800/50">مهمان</span>
        <select value={guests} onChange={(event) => setGuests(event.target.value)} className="input py-2 text-xs">
          {[1, 2, 3, 4, 5, 6].map((value) => (
            <option key={value} value={value}>
              {toFa(value)} نفر
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-gold h-[38px] text-[11px]">
        بررسی ظرفیت
        <span aria-hidden="true">←</span>
      </button>
    </form>
  );
}
