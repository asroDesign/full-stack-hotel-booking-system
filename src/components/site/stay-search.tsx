"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Minus, Plus } from "lucide-react";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { addDaysISO, cn, diffDays, faNum, todayISO } from "@/lib/utils";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Date + guests search → /rooms?checkIn=&checkOut=&guests= (shows only available rooms with stay price). */
export function StaySearch({
  defaults,
  variant = "hero",
  maxGuests = 8,
}: {
  defaults?: { checkIn?: string; checkOut?: string; guests?: number };
  variant?: "hero" | "bar" | "soft" | "glass";
  maxGuests?: number;
}) {
  const router = useRouter();
  const today = todayISO();
  const okIn = defaults?.checkIn && ISO.test(defaults.checkIn) && defaults.checkIn >= today ? defaults.checkIn : "";
  const okOut = okIn && defaults?.checkOut && ISO.test(defaults.checkOut) && defaults.checkOut > okIn ? defaults.checkOut : "";
  const [checkIn, setCheckIn] = useState(okIn);
  const [checkOut, setCheckOut] = useState(okOut);
  const [guests, setGuests] = useState(Math.min(maxGuests, Math.max(1, defaults?.guests || 2)));
  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;

  const submit = () => {
    const q = new URLSearchParams();
    if (checkIn && checkOut && checkOut > checkIn) {
      q.set("checkIn", checkIn);
      q.set("checkOut", checkOut);
    }
    q.set("guests", String(guests));
    router.push(`/rooms?${q}#results`);
  };

  return (
    <div
      className={cn(
        "grid items-end gap-3 text-base-content",
        variant === "hero"
          ? "rounded-box bg-base-100 p-4 shadow-2xl ring-1 ring-black/5 md:grid-cols-[1fr_1fr_auto_auto] md:p-5"
          : variant === "soft"
            ? "neu rounded-[2rem] p-5 md:grid-cols-[1fr_1fr_auto_auto] md:p-6"
            : variant === "glass"
              ? "sm:grid-cols-2"
              : "rounded-box bg-base-100 p-3 ring-1 ring-base-300 md:grid-cols-[1fr_1fr_auto_auto]",
      )}
    >
      <JalaliDatePicker
        name="checkIn"
        label="تاریخ ورود"
        value={checkIn}
        min={today}
        onChange={(v) => {
          setCheckIn(v);
          if (!checkOut || checkOut <= v) setCheckOut(addDaysISO(v, 1));
        }}
      />
      <JalaliDatePicker
        name="checkOut"
        label={nights > 0 ? `تاریخ خروج · ${faNum(nights)} شب` : "تاریخ خروج"}
        value={checkOut}
        min={checkIn ? addDaysISO(checkIn, 1) : addDaysISO(today, 1)}
        onChange={setCheckOut}
        placeholder={checkIn ? "انتخاب تاریخ خروج" : "ابتدا تاریخ ورود"}
      />
      <div>
        <span className="field-label">مهمانان</span>
        <div className="join">
          <button type="button" aria-label="کمتر" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="btn join-item btn-square"><Minus className="h-4 w-4" /></button>
          <span className="join-item flex min-w-24 items-center justify-center gap-1.5 border-y border-base-300 bg-base-100 px-3 text-sm font-bold"><Users className="h-4 w-4 text-primary" />{faNum(guests)} نفر</span>
          <button type="button" aria-label="بیشتر" onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} className="btn join-item btn-square"><Plus className="h-4 w-4" /></button>
        </div>
      </div>
      <button type="button" onClick={submit} className={cn("btn btn-primary", variant === "hero" ? "h-12 px-8" : variant === "soft" ? "h-12 rounded-full px-8" : variant === "glass" ? "h-12 w-full rounded-full" : "")}>
        <Search className="h-4 w-4" /> جستجوی اتاق
      </button>
    </div>
  );
}
