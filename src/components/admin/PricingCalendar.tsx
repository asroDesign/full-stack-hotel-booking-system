"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, toFa } from "@/lib/format";
import {
  JALALI_MONTH_NAMES,
  JALALI_WEEKDAYS,
  addJalaliMonths,
  isoFromJalali,
  isoToday,
  jalaliMonthLength,
  jalaliMonthStartWeekday,
} from "@/lib/jalali";
import { jalaliFromIso, jalaliLabelFromIso } from "@/lib/jalali";

type RoomOption = { id: number; name: string; roomNumber: string; pricePerNight: number };
type PriceRow = { id: number; roomId: number; date: string; price: number; label: string; note: string };
type SpecialDay = { id: number; date: string; title: string; kind: string; percent: number };

const LABELS: { value: string; label: string }[] = [
  { value: "base", label: "نرخ پایه" },
  { value: "custom", label: "نرخ دستی" },
  { value: "peak", label: "پیک" },
  { value: "holiday", label: "تعطیلات" },
];

export default function PricingCalendar({
  rooms,
  initialJy,
  initialJm,
  initialDays,
}: {
  rooms: RoomOption[];
  initialJy: number;
  initialJm: number;
  initialDays: SpecialDay[];
}) {
  const router = useRouter();
  const [month, setMonth] = useState({ jy: initialJy, jm: initialJm });
  const [selectedRooms, setSelectedRooms] = useState<number[]>(rooms.slice(0, 1).map((room) => room.id));
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [days, setDays] = useState<SpecialDay[]>(initialDays);
  const [loading, setLoading] = useState(true);
  const [price, setPrice] = useState("");
  const [percent, setPercent] = useState("");
  const [label, setLabel] = useState("custom");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [dayDate, setDayDate] = useState(isoToday());
  const [dayTitle, setDayTitle] = useState("");
  const [dayKind, setDayKind] = useState("holiday");
  const [dayPercent, setDayPercent] = useState("30");
  const [applyPercent, setApplyPercent] = useState("");

  const monthStart = isoFromJalali(month.jy, month.jm, 1);
  const monthEnd = isoFromJalali(month.jy, month.jm, jalaliMonthLength(month.jy, month.jm));

  const loadPrices = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ from: monthStart, to: monthEnd });
      if (selectedRooms.length) query.set("roomIds", selectedRooms.join(","));
      const response = await fetch(`/api/admin/pricing?${query.toString()}`, { cache: "no-store" });
      const data = await response.json();
      setPrices(Array.isArray(data.prices) ? data.prices : []);
    } catch {
      setPrices([]);
    } finally {
      setLoading(false);
    }
  }, [monthStart, monthEnd, selectedRooms]);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  const priceIndex = useMemo(() => {
    const map = new Map<string, PriceRow>();
    prices.forEach((row) => map.set(`${row.roomId}:${row.date}`, row));
    return map;
  }, [prices]);

  const firstRoom = rooms.find((room) => room.id === selectedRooms[0]) ?? rooms[0];
  const daysIndex = useMemo(() => new Map(days.map((day) => [day.date, day])), [days]);

  const grid = useMemo(() => {
    const length = jalaliMonthLength(month.jy, month.jm);
    const startWeekday = jalaliMonthStartWeekday(month.jy, month.jm);
    const cells: ({ day: number; iso: string } | null)[] = Array.from({ length: startWeekday }, () => null);
    for (let day = 1; day <= length; day += 1) {
      cells.push({ day, iso: isoFromJalali(month.jy, month.jm, day) });
    }
    return cells;
  }, [month]);

  function toggleDate(iso: string) {
    setSelectedDates((current) =>
      current.includes(iso) ? current.filter((item) => item !== iso) : [...current, iso].sort(),
    );
  }

  async function applyPrices() {
    setMessage(null);
    if (selectedRooms.length === 0) return setMessage({ type: "error", text: "حداقل یک اتاق انتخاب کنید." });
    if (selectedDates.length === 0) return setMessage({ type: "error", text: "حداقل یک روز را از تقویم انتخاب کنید." });
    if (!price && !percent) return setMessage({ type: "error", text: "قیمت یا درصد تغییر را وارد کنید." });
    setSaving(true);
    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomIds: selectedRooms,
          dates: selectedDates,
          price: price === "" ? null : Number(price),
          percent: percent === "" ? null : Number(percent),
          label,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: data.error ?? "ذخیره انجام نشد." });
        return;
      }
      setMessage({ type: "ok", text: `قیمت ${toFa(data.updated)} روز-اتاق به‌روزرسانی شد.` });
      setSelectedDates([]);
      await loadPrices();
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "خطای شبکه." });
    } finally {
      setSaving(false);
    }
  }

  async function saveSpecialDay() {
    setMessage(null);
    try {
      const response = await fetch("/api/admin/special-days", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dayDate, title: dayTitle, kind: dayKind, percent: Number(dayPercent) || 0 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: data.error ?? "ثبت روز ویژه انجام نشد." });
        return;
      }
      setDays((current) => [...current.filter((day) => day.date !== dayDate), data.day].sort((a, b) => a.date.localeCompare(b.date)));
      setMessage({ type: "ok", text: "روز ویژه ثبت شد." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "خطای شبکه." });
    }
  }

  async function removeDay(id: number) {
    const snapshot = days;
    setDays((current) => current.filter((day) => day.id !== id));
    const response = await fetch(`/api/admin/special-days?id=${id}`, { method: "DELETE" });
    if (!response.ok) {
      setDays(snapshot);
      setMessage({ type: "error", text: "حذف انجام نشد." });
    }
  }

  async function applySpecialDays() {
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch("/api/admin/special-days", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: monthStart,
          to: monthEnd,
          roomIds: selectedRooms.length ? selectedRooms : undefined,
          percent: applyPercent === "" ? undefined : Number(applyPercent),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: data.error ?? "اعمال قیمت انجام نشد." });
        return;
      }
      setMessage({ type: "ok", text: `${toFa(data.days)} روز ویژه اعمال شد (${toFa(data.updated)} ردیف قیمت).` });
      await loadPrices();
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "خطای شبکه." });
    } finally {
      setSaving(false);
    }
  }

  const monthDays = days
    .filter((day) => day.date >= monthStart && day.date <= monthEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-4">
      {message ? (
        <div className={`alert ${message.type === "ok" ? "alert-success" : "alert-error"} py-2 text-[11px]`}>
          {message.text}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.7fr_1fr] xl:items-start">
        <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMonth(addJalaliMonths(month.jy, month.jm, -1))}
                className="btn btn-ghost btn-sm"
              >
                ماه قبل
              </button>
              <p className="min-w-32 text-center text-sm font-black text-forest-950">
                {JALALI_MONTH_NAMES[month.jm - 1]} {toFa(month.jy)}
              </p>
              <button
                type="button"
                onClick={() => setMonth(addJalaliMonths(month.jy, month.jm, 1))}
                className="btn btn-ghost btn-sm"
              >
                ماه بعد
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDates(grid.filter(Boolean).map((cell) => cell!.iso))}
                className="text-[10px] font-bold text-forest-900 underline-offset-4 hover:underline"
              >
                انتخاب همه ماه
              </button>
              <span className="text-cream-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedDates([])}
                className="text-[10px] font-bold text-rose-600 underline-offset-4 hover:underline"
              >
                پاک کردن
              </button>
            </div>
          </div>

          <div className="mb-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedRooms(rooms.map((room) => room.id))}
              className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold ${
                selectedRooms.length === rooms.length ? "border-forest-800 bg-forest-50" : "border-cream-300"
              }`}
            >
              همه اتاق‌ها ({toFa(rooms.length)})
            </button>
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() =>
                  setSelectedRooms((current) =>
                    current.includes(room.id) ? current.filter((id) => id !== room.id) : [...current, room.id],
                  )
                }
                className={`rounded-lg border px-2 py-1 text-[10px] font-semibold transition ${
                  selectedRooms.includes(room.id)
                    ? "border-gold-400 bg-gold-50 text-gold-700"
                    : "border-cream-300 text-forest-800/60"
                }`}
              >
                {toFa(room.roomNumber)}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid min-w-[320px] grid-cols-7 gap-1 overflow-x-auto">
              {Array.from({ length: 35 }).map((_, index) => (
                <div key={index} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid min-w-[320px] grid-cols-7 gap-1 overflow-x-auto">
                {JALALI_WEEKDAYS.map((weekday) => (
                  <div key={weekday} className="pb-1 text-center text-[9px] font-bold text-forest-800/45">
                    {weekday.slice(0, 4)}
                  </div>
                ))}
                {grid.map((cell, index) => {
                  if (!cell) return <div key={`empty-${index}`} />;
                  const selected = selectedDates.includes(cell.iso);
                  const special = daysIndex.get(cell.iso);
                  const row = firstRoom ? priceIndex.get(`${firstRoom.id}:${cell.iso}`) : undefined;
                  const effective = row?.price ?? firstRoom?.pricePerNight ?? 0;
                  return (
                    <button
                      key={cell.iso}
                      type="button"
                      onClick={() => toggleDate(cell.iso)}
                      className={`flex min-h-[52px] flex-col items-center justify-start rounded-lg border p-0.5 text-center transition sm:min-h-16 sm:p-1 ${
                        selected
                          ? "border-forest-800 bg-forest-900 text-white shadow-soft"
                          : special
                            ? "border-gold-300 bg-gold-50 text-gold-700 hover:border-gold-400"
                            : "border-cream-200 bg-white text-forest-900 hover:border-forest-300 hover:bg-cream-50"
                      }`}
                    >
                      <span className="text-[11px] font-black">{toFa(cell.day)}</span>
                      <span className={`mt-0.5 hidden text-[8px] leading-4 sm:block ${selected ? "text-cream-100/80" : "text-forest-800/55"}`}>
                        {formatMoney(effective).replace(" تومان", "")}
                      </span>
                      {special ? (
                        <span
                          className={`mt-auto rounded px-1 text-[7px] font-bold ${
                            selected ? "bg-gold-400 text-forest-950" : "bg-gold-200/70 text-gold-700"
                          }`}
                        >
                          {special.kind === "peak" ? "پیک" : "تعطیل"}
                        </span>
                      ) : row ? (
                        <span className={`mt-auto text-[7px] ${selected ? "text-cream-100/60" : "text-forest-800/40"}`}>
                          {LABELS.find((item) => item.value === row.label)?.label ?? "نرخ دستی"}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[9px] text-forest-800/45">
                نمایش قیمت بر اساس {firstRoom?.name ?? "اتاق"} است. انتخاب چند اتاق، قیمت را روی همه آن‌ها اعمال می‌کند.
                روزهای طلایی به‌عنوان پیک/تعطیل علامت‌گذاری شده‌اند.
              </p>
            </>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
            <h2 className="text-xs font-extrabold text-forest-950">تغییر قیمت روزهای انتخاب‌شده</h2>
            <p className="mt-1 text-[10px] leading-5 text-forest-800/55">
              {toFa(selectedDates.length)} روز انتخاب شده
              {selectedDates.length ? ` — از ${jalaliLabelFromIso(selectedDates[0])} تا ${jalaliLabelFromIso(selectedDates[selectedDates.length - 1])}` : ""}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="field">
                <span className="label text-[10px]">قیمت ثابت (تومان)</span>
                <input className="input h-9 py-1 text-xs" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="مثلاً 3200000" />
              </label>
              <label className="field">
                <span className="label text-[10px]">یا درصد افزایش/کاهش</span>
                <input className="input h-9 py-1 text-xs" value={percent} onChange={(event) => setPercent(event.target.value)} placeholder="مثلاً 25 یا -10" />
              </label>
              <label className="field sm:col-span-2">
                <span className="label text-[10px]">برچسب نرخ</span>
                <select className="input h-9 py-1 text-xs" value={label} onChange={(event) => setLabel(event.target.value)}>
                  {LABELS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button type="button" onClick={applyPrices} disabled={saving} className="btn btn-primary btn-sm mt-3 w-full">
              {saving ? <span className="loading loading-spinner loading-xs" /> : null}
              اعمال روی {toFa(selectedRooms.length)} اتاق
            </button>
          </section>

          <section className="rounded-2xl border border-gold-200 bg-gold-50/60 p-4 shadow-soft">
            <h2 className="text-xs font-extrabold text-forest-950">روزهای پیک و تعطیلات</h2>
            <div className="mt-2 grid gap-2">
              <label className="field">
                <span className="label text-[10px]">تاریخ (میلادی برای انتخاب؛ شمسی نمایش داده می‌شود)</span>
                <input type="date" className="input h-9 py-1 text-xs" value={dayDate} onChange={(event) => setDayDate(event.target.value)} />
                <span className="hint">
                  {jalaliLabelFromIso(dayDate)} — {toFa(jalaliFromIso(dayDate).jy)}
                </span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="field">
                  <span className="label text-[10px]">نوع</span>
                  <select className="input h-9 py-1 text-xs" value={dayKind} onChange={(event) => setDayKind(event.target.value)}>
                    <option value="holiday">تعطیلات</option>
                    <option value="peak">پیک</option>
                  </select>
                </label>
                <label className="field">
                  <span className="label text-[10px]">درصد افزایش</span>
                  <input className="input h-9 py-1 text-xs" value={dayPercent} onChange={(event) => setDayPercent(event.target.value)} />
                </label>
              </div>
              <label className="field">
                <span className="label text-[10px]">عنوان</span>
                <input className="input h-9 py-1 text-xs" value={dayTitle} onChange={(event) => setDayTitle(event.target.value)} placeholder="مثلاً تعطیلات نوروز" />
              </label>
              <button type="button" onClick={saveSpecialDay} className="btn btn-gold btn-sm w-full">
                ثبت روز ویژه
              </button>
            </div>

            <div className="mt-3 space-y-1.5">
              {monthDays.length === 0 ? (
                <p className="rounded-lg bg-white/70 p-2 text-center text-[10px] text-forest-800/50">
                  در این ماه روز ویژه‌ای ثبت نشده است.
                </p>
              ) : (
                monthDays.map((day) => (
                  <div key={day.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5">
                    <div>
                      <p className="text-[10px] font-bold text-forest-950">{jalaliLabelFromIso(day.date)}</p>
                      <p className="text-[9px] text-forest-800/50">
                        {day.title} · {day.kind === "peak" ? "پیک" : "تعطیلات"} · {toFa(day.percent)}٪
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDay(day.id)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                    >
                      حذف
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 rounded-lg border border-gold-200 bg-white p-2.5">
              <p className="text-[10px] font-bold text-forest-950">اعمال درصد روزهای ویژه روی اتاق‌های انتخابی</p>
              <div className="mt-1.5 flex gap-1.5">
                <input
                  className="input h-8 flex-1 py-1 text-[11px]"
                  placeholder="خالی = درصد هر روز"
                  value={applyPercent}
                  onChange={(event) => setApplyPercent(event.target.value)}
                />
                <button type="button" onClick={applySpecialDays} disabled={saving} className="btn btn-primary btn-sm">
                  اعمال
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
