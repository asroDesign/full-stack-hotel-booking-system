"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatJalali, formatMoney, nightsBetween, toFa, todayISO } from "@/lib/format";

export type BookingAddon = { name: string; price: number; description?: string };

export type BookingRoom = {
  id: number;
  name: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  maxCapacity: number;
  extraGuestFee: number;
  addons: BookingAddon[];
  pricePerNight: number;
  prepaymentPercent: number;
  coverImage: string;
};

export type BookingPoolSlot = {
  id: number;
  label: string;
  price: number;
  capacity: number;
  extraGuestFee: number;
  description: string;
};

type Props = {
  rooms: BookingRoom[];
  poolSlots: BookingPoolSlot[];
  extraGuestFee: number;
  poolMaxCapacity: number;
  roomRules: string[];
  poolRules: string[];
  defaultService: "room" | "pool";
  defaultRoomId?: number;
  defaultCheckIn: string;
  defaultCheckOut: string;
  defaultAdults: number;
  allowPool: boolean;
};

const STEPS = ["انتخاب خدمت", "اطلاعات مهمان", "ثبت نهایی"];

export default function BookingForm({
  rooms,
  poolSlots,
  extraGuestFee,
  poolMaxCapacity,
  roomRules,
  poolRules,
  defaultService,
  defaultRoomId,
  defaultCheckIn,
  defaultCheckOut,
  defaultAdults,
  allowPool,
}: Props) {
  const [service, setService] = useState<"room" | "pool">(allowPool ? defaultService : "room");
  const [roomId, setRoomId] = useState<number | undefined>(defaultRoomId ?? rooms[0]?.id);
  const [slotId, setSlotId] = useState<number | undefined>(poolSlots[0]?.id);
  const [checkIn, setCheckIn] = useState(defaultCheckIn);
  const [checkOut, setCheckOut] = useState(defaultCheckOut);
  const [adults, setAdults] = useState(defaultAdults);
  const [children, setChildren] = useState(0);
  const [step, setStep] = useState(0);
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ trackingCode: string; prepaymentAmount: number; totalAmount: number } | null>(
    null,
  );
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [roomBaseTotal, setRoomBaseTotal] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; label: string; kind: string; value: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  const selectedRoom = rooms.find((room) => room.id === roomId);
  const selectedSlot = poolSlots.find((slot) => slot.id === slotId);
  const guests = adults + children;
  const nights = service === "room" ? Math.max(1, nightsBetween(checkIn, checkOut)) : 1;

  const basePrice = service === "room" ? selectedRoom?.pricePerNight ?? 0 : selectedSlot?.price ?? 0;
  const baseCapacity = service === "room" ? selectedRoom?.capacity ?? 2 : selectedSlot?.capacity ?? 8;
  const extraGuests = Math.max(0, guests - baseCapacity);
  const perExtraGuest =
    service === "room" ? selectedRoom?.extraGuestFee || extraGuestFee : selectedSlot?.extraGuestFee ?? extraGuestFee;
  const extraTotal = extraGuests * perExtraGuest;
  const nightsTotal = service === "room" ? roomBaseTotal ?? basePrice * nights : basePrice;
  const nightlyAverage = Math.round(nightsTotal / Math.max(1, nights));
  const addonsTotal = (selectedRoom?.addons ?? [])
    .filter((addon) => selectedAddons.includes(addon.name))
    .reduce((sum, addon) => sum + addon.price, 0);
  const subtotal = nightsTotal + extraTotal + addonsTotal;
  const promoDiscount = promo
    ? Math.min(subtotal, promo.kind === "percent" ? Math.round((subtotal * promo.value) / 100) : promo.value)
    : 0;
  const total = Math.max(0, subtotal - promoDiscount);
  const prepaymentPercent = service === "room" ? selectedRoom?.prepaymentPercent ?? 30 : 30;
  const prepayment = Math.round((total * prepaymentPercent) / 100);

  async function applyPromo() {
    setPromoError(null);
    const code = promoInput.trim();
    if (!code) return setPromoError("کد تخفیف را وارد کنید.");
    setPromoLoading(true);
    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal, nights: service === "room" ? nights : 1 }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPromoError(data.error ?? "کد تخفیف معتبر نیست.");
        setPromo(null);
        return;
      }
      setPromo({ code: data.code, label: data.label || "کد تخفیف", kind: data.kind, value: Number(data.value) || 0 });
      setPromoInput(data.code);
    } catch {
      setPromoError("بررسی کد انجام نشد. دوباره تلاش کنید.");
    } finally {
      setPromoLoading(false);
    }
  }

  const maxGuests = service === "room" ? selectedRoom?.maxCapacity ?? (selectedRoom?.capacity ?? 2) + 2 : poolMaxCapacity;
  const capacityExceeded = guests > maxGuests;
  const activeRules = service === "room" ? roomRules : poolRules;

  useEffect(() => {
    if (service !== "room" || !roomId || !checkIn || !checkOut || checkOut <= checkIn) {
      setRoomBaseTotal(null);
      return;
    }
    const controller = new AbortController();
    setRateLoading(true);
    fetch(
      `/api/room-rate?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data.baseTotal === "number") setRoomBaseTotal(data.baseTotal);
      })
      .catch(() => undefined)
      .finally(() => setRateLoading(false));
    return () => controller.abort();
  }, [service, roomId, checkIn, checkOut]);

  useEffect(() => {
    setSelectedAddons([]);
  }, [roomId]);

  const dateError = useMemo(() => {
    if (!checkIn || !checkOut) return "تاریخ ورود و خروج را انتخاب کنید.";
    if (checkOut <= checkIn && service === "room") return "تاریخ خروج باید بعد از تاریخ ورود باشد.";
    return null;
  }, [checkIn, checkOut, service]);

  const canContinue =
    !dateError &&
    !capacityExceeded &&
    (service === "room" ? Boolean(selectedRoom) : Boolean(selectedSlot)) &&
    (service === "pool" || nights > 0);

  async function submit() {
    setError(null);
    if (!accepted) {
      setError("پذیرش قوانین رزرو الزامی است.");
      return;
    }
    if (guestName.trim().length < 3) {
      setError("نام و نام خانوادگی را کامل وارد کنید.");
      return;
    }
    if (!/^09\d{9}$/.test(phone.replace(/\D/g, ""))) {
      setError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: service,
          roomId: service === "room" ? roomId : null,
          poolSlotId: service === "pool" ? slotId : null,
          checkIn,
          checkOut: service === "room" ? checkOut : checkIn,
          timeSlot: service === "pool" ? selectedSlot?.label ?? null : null,
          adults,
          children,
          guestName,
          phone,
          email: email || null,
          notes: notes || null,
          addons: service === "room" ? selectedAddons : [],
          promoCode: promo?.code ?? null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "ثبت درخواست انجام نشد. دوباره تلاش کنید.");
        return;
      }
      setResult(data.booking);
      setStep(2);
    } catch {
      setError("خطای شبکه. اتصال اینترنت را بررسی کنید.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="panel overflow-hidden">
        <div className="neu-inset m-3 rounded-2xl p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold-400 text-2xl text-forest-950">
            ✓
          </div>
          <h2 className="text-lg font-black text-forest-950">درخواست رزرو شما ثبت شد</h2>
          <p className="mt-1 text-[11px] leading-6 text-forest-800/60">
            این درخواست هنوز قطعی نیست؛ پس از پرداخت پیش‌پرداخت و تأیید پذیرش، کد رزرو صادر می‌شود.
          </p>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-dashed border-gold-300 bg-gold-50 p-4 text-center">
            <p className="text-[11px] font-semibold text-gold-700">کد پیگیری درخواست</p>
            <p dir="ltr" className="mt-1 text-xl font-extrabold tracking-widest text-forest-950">
              {result.trackingCode}
            </p>
            <p className="mt-1 text-[10px] text-forest-800/60">این کد را برای پیگیری و پرداخت نزد خود نگه دارید.</p>
          </div>
          <dl className="grid gap-2 text-xs">
            <div className="flex items-center justify-between rounded-xl bg-cream-100 px-3 py-2">
              <dt className="text-forest-800/60">مبلغ کل</dt>
              <dd className="font-bold">{formatMoney(result.totalAmount)}</dd>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-forest-50 px-3 py-2">
              <dt className="text-forest-800/60">پیش‌پرداخت لازم</dt>
              <dd className="font-extrabold text-forest-900">{formatMoney(result.prepaymentAmount)}</dd>
            </div>
          </dl>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/booking/${result.trackingCode}`} className="btn btn-gold flex-1">
              پرداخت پیش‌پرداخت و پیگیری
            </Link>
            <Link href="/rooms" className="btn btn-ghost flex-1">
              مشاهده سایر اتاق‌ها
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <div className="panel overflow-hidden">
        <div className="border-b border-cream-200 bg-cream-100/60 px-4 py-3">
          <ul className="steps steps-horizontal w-full text-[10px]">
            {STEPS.map((label, index) => (
              <li
                key={label}
                data-content={index < step ? "✓" : toFa(index + 1)}
                className={`step ${index <= step ? "step-primary" : ""}`}
              >
                <span className={`hidden text-[10px] font-semibold sm:inline ${index <= step ? "text-forest-950" : "text-forest-800/40"}`}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {step === 0 ? (
            <>
              <div className={`grid gap-2 ${allowPool ? "sm:grid-cols-2" : ""}`}>
                {[
                  { key: "room" as const, title: "اقامت در اتاق", desc: `انتخاب از ${toFa(rooms.length)} اتاق و سوئیت`, icon: "🛏️" },
                  ...(allowPool
                    ? [{ key: "pool" as const, title: "استخر خانوادگی", desc: "سانس خصوصی سه ساعته", icon: "🏊" }]
                    : []),
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setService(option.key)}
                    className={`flex items-start gap-3 rounded-2xl border p-4 text-start transition ${
                      service === option.key
                        ? "border-forest-700 bg-forest-50 shadow-soft"
                        : "border-cream-200 bg-white hover:border-forest-200"
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <span>
                      <span className="block text-sm font-bold text-forest-950">{option.title}</span>
                      <span className="block text-[11px] text-forest-800/60">{option.desc}</span>
                    </span>
                    <span
                      className={`mr-auto mt-1 flex h-4 w-4 items-center justify-center rounded-full border ${
                        service === option.key ? "border-forest-800 bg-forest-800" : "border-cream-300"
                      }`}
                    >
                      {service === option.key ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
                    </span>
                  </button>
                ))}
              </div>

              {service === "room" ? (
                <div className="space-y-2">
                  <p className="label">انتخاب اتاق</p>
                  <div className="max-h-64 space-y-2 overflow-y-auto pl-1">
                    {rooms.map((room) => (
                      <label
                        key={room.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border p-2.5 transition ${
                          roomId === room.id ? "border-forest-600 bg-forest-50" : "border-cream-200 hover:border-forest-200"
                        }`}
                      >
                        <input
                          type="radio"
                          name="room"
                          checked={roomId === room.id}
                          onChange={() => setRoomId(room.id)}
                          className="accent-forest-800"
                        />
                        <img src={room.coverImage} alt="" className="h-12 w-16 rounded-lg object-cover" loading="lazy" />
                        <span className="flex-1">
                          <span className="block text-xs font-bold text-forest-950">{room.name}</span>
                          <span className="block text-[10px] text-forest-800/55">
                            {room.roomType} · ظرفیت {toFa(room.capacity)} نفر
                          </span>
                        </span>
                        <span className="text-[11px] font-bold text-forest-900">{formatMoney(room.pricePerNight)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : poolSlots.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-cream-300 p-6 text-center text-xs text-forest-800/60">
                  سانس فعالی برای استخر ثبت نشده است. لطفاً با پذیرش تماس بگیرید.
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="label">انتخاب سانس استخر</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {poolSlots.map((slot) => (
                      <label
                        key={slot.id}
                        className={`flex cursor-pointer flex-col gap-1 rounded-xl border p-3 transition ${
                          slotId === slot.id ? "border-forest-600 bg-forest-50" : "border-cream-200 hover:border-forest-200"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-2 text-xs font-bold text-forest-950">
                            <input
                              type="radio"
                              name="slot"
                              checked={slotId === slot.id}
                              onChange={() => setSlotId(slot.id)}
                              className="accent-forest-800"
                            />
                            {slot.label}
                          </span>
                          <span className="text-[10px] font-bold text-gold-600">{formatMoney(slot.price)}</span>
                        </span>
                        <span className="text-[10px] text-forest-800/55">
                          ظرفیت پایه {toFa(slot.capacity)} نفر · هر نفر اضافه {formatMoney(slot.extraGuestFee)}
                        </span>
                        {slot.description ? (
                          <span className="text-[10px] leading-5 text-forest-800/45">{slot.description}</span>
                        ) : null}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {service === "room" && (selectedRoom?.addons?.length ?? 0) > 0 ? (
                <div className="rounded-2xl border border-cream-200 bg-cream-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-extrabold text-forest-950">گزینه‌های اقامت (اختیاری)</p>
                    {addonsTotal > 0 ? (
                      <span className="badge badge-sm badge-success text-[9px]">{formatMoney(addonsTotal)}</span>
                    ) : null}
                  </div>
                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                    {(selectedRoom?.addons ?? []).map((addon) => (
                      <label
                        key={addon.name}
                        className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-[10px] transition ${
                          selectedAddons.includes(addon.name)
                            ? "border-forest-500 bg-white"
                            : "border-cream-200 bg-white/60"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-xs"
                            checked={selectedAddons.includes(addon.name)}
                            onChange={(event) =>
                              setSelectedAddons((current) =>
                                event.target.checked
                                  ? [...current, addon.name]
                                  : current.filter((item) => item !== addon.name),
                              )
                            }
                          />
                          <span>
                            <span className="block font-bold text-forest-950">{addon.name}</span>
                            {addon.description ? (
                              <span className="block text-[9px] text-forest-800/45">{addon.description}</span>
                            ) : null}
                          </span>
                        </span>
                        <span className="whitespace-nowrap font-bold text-gold-600">{formatMoney(addon.price)}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[9px] text-forest-800/45">
                    مبالغ گزینه‌ها به ازای هر نفر / هر شب به مبلغ کل اضافه می‌شود.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  <span className="label">{service === "room" ? "تاریخ ورود" : "تاریخ استفاده"}</span>
                  <input
                    type="date"
                    className="input"
                    value={checkIn}
                    min={todayISO()}
                    onChange={(event) => setCheckIn(event.target.value)}
                  />
                  <span className="hint">{formatJalali(checkIn, true)}</span>
                </label>
                {service === "room" ? (
                  <label className="field">
                    <span className="label">تاریخ خروج</span>
                    <input
                      type="date"
                      className="input"
                      value={checkOut}
                      min={checkIn}
                      onChange={(event) => setCheckOut(event.target.value)}
                    />
                    <span className="hint">{formatJalali(checkOut, true)}</span>
                  </label>
                ) : (
                  <div className="field">
                    <span className="label">سانس انتخابی</span>
                    <div className="input bg-cream-100 text-xs font-semibold">{selectedSlot?.label ?? "—"}</div>
                    <span className="hint">سانس‌ها سه ساعته و اختصاصی هستند.</span>
                  </div>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field">
                  <span className="label">بزرگسال</span>
                  <select className="input" value={adults} onChange={(event) => setAdults(Number(event.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((value) => (
                      <option key={value} value={value}>
                        {toFa(value)} نفر
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label">کودک</span>
                  <select className="input" value={children} onChange={(event) => setChildren(Number(event.target.value))}>
                    {[0, 1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {toFa(value)} نفر
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {extraGuests > 0 && !capacityExceeded ? (
                <p className="rounded-xl bg-gold-50 px-3 py-2 text-[11px] font-semibold leading-6 text-gold-700">
                  {toFa(extraGuests)} نفر بیش از ظرفیت پایه ({toFa(baseCapacity)} نفر) انتخاب شده است؛ هزینه نفر اضافه{" "}
                  {formatMoney(perExtraGuest)} برای هر نفر محاسبه می‌شود.
                </p>
              ) : null}
              {capacityExceeded ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold">
                  <span className="text-rose-700">
                    حداکثر ظرفیت این گزینه {toFa(maxGuests)} نفر است. تعداد مهمانان را کاهش دهید.
                  </span>
                </p>
              ) : null}
              {dateError ? (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-800">{dateError}</p>
              ) : null}

              <div className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
                <p className="text-[11px] font-extrabold text-forest-950">
                  📋 قوانین {service === "room" ? "اقامت در اتاق" : "استخر خانوادگی"}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {activeRules.map((rule) => (
                    <li key={rule} className="flex gap-2 text-[10px] leading-5 text-forest-800/65">
                      <span className="text-gold-600">•</span>
                      {rule}
                    </li>
                  ))}
                </ul>
              </div>

              <button type="button" disabled={!canContinue} onClick={() => setStep(1)} className="btn btn-primary w-full">
                ادامه و وارد کردن اطلاعات مهمان
                <span aria-hidden="true">←</span>
              </button>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="field sm:col-span-2">
                  <span className="label">نام و نام خانوادگی *</span>
                  <input
                    className="input"
                    value={guestName}
                    onChange={(event) => setGuestName(event.target.value)}
                    placeholder="مثال: علی محمدی"
                  />
                </label>
                <label className="field">
                  <span className="label">شماره موبایل *</span>
                  <input
                    className="input"
                    dir="ltr"
                    inputMode="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="09xxxxxxxxx"
                  />
                  <span className="hint">کد رزرو پس از تأیید به این شماره پیامک می‌شود.</span>
                </label>
                <label className="field">
                  <span className="label">ایمیل (اختیاری)</span>
                  <input
                    className="input"
                    dir="ltr"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </label>
                <label className="field sm:col-span-2">
                  <span className="label">توضیحات یا درخواست ویژه (اختیاری)</span>
                  <textarea
                    className="input min-h-24"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="مثال: اتاق آرام، تخت اضافه برای کودک، ترانسفر فرودگاه..."
                  />
                </label>
              </div>

              <label className="flex items-start gap-2 rounded-xl bg-cream-100 p-3 text-[11px] leading-6 text-forest-800/75">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-1 accent-forest-800"
                />
                <span>
                  با قوانین هتل کاج موافقم: رزرو تنها با پرداخت پیش‌پرداخت {toFa(prepaymentPercent)}٪ و تأیید پذیرش
                  قطعی می‌شود و کد رزرو در همان مرحله صادر می‌گردد.
                </span>
              </label>

              {error ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => setStep(0)} className="btn btn-ghost sm:w-32">
                  بازگشت
                </button>
                <button type="button" onClick={submit} disabled={submitting} className="btn btn-primary flex-1">
                  {submitting ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      در حال ثبت…
                    </>
                  ) : (
                    "ثبت درخواست رزرو"
                  )}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <aside className="panel sticky top-24 space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-forest-950">خلاصه رزرو</h3>
          <span className="badge-plain bg-forest-50 text-[10px] text-forest-700">
            {service === "room" ? "اتاق" : "استخر خانوادگی"}
          </span>
        </div>
        {service === "room" && selectedRoom ? (
          <div className="flex items-center gap-3 rounded-xl bg-cream-100 p-2">
            <img src={selectedRoom.coverImage} alt="" className="h-14 w-16 rounded-lg object-cover" loading="lazy" />
            <div>
              <p className="text-xs font-bold text-forest-950">{selectedRoom.name}</p>
              <p className="text-[10px] text-forest-800/60">
                ظرفیت {toFa(selectedRoom.capacity)} نفر · اتاق {toFa(selectedRoom.roomNumber)}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-forest-50 p-3 text-[11px] leading-6 text-forest-800/70">
            سانس {selectedSlot?.label ?? "—"} — استخر خانوادگی کاج
          </div>
        )}
        <dl className="space-y-2 text-[11px]">
          <div className="flex justify-between">
            <dt className="text-forest-800/55">تاریخ ورود</dt>
            <dd className="font-semibold">{formatJalali(checkIn)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-forest-800/55">{service === "room" ? "تاریخ خروج" : "سانس"}</dt>
            <dd className="font-semibold">{service === "room" ? formatJalali(checkOut) : selectedSlot?.label ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-forest-800/55">مهمانان</dt>
            <dd className="font-semibold">
              {toFa(adults)} بزرگسال {children ? `+ ${toFa(children)} کودک` : ""}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-forest-800/55">{service === "room" ? "تعداد شب" : "تعداد سانس"}</dt>
            <dd className="font-semibold">{toFa(service === "room" ? nights : 1)}</dd>
          </div>
        </dl>
        <div className="space-y-2 border-t border-cream-200 pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-forest-800/55">
              {service === "room" ? (
                <>
                  {toFa(nights)} شب × میانگین {formatMoney(nightlyAverage)}
                  {rateLoading ? " (در حال محاسبه…)" : ""}
                </>
              ) : (
                <>
                  {formatMoney(basePrice)} × {toFa(1)}
                </>
              )}
            </span>
            <span className="font-semibold">{formatMoney(nightsTotal)}</span>
          </div>
          {addonsTotal > 0 ? (
            <div className="flex justify-between">
              <span className="text-forest-800/55">گزینه‌های اقامت</span>
              <span className="font-semibold">{formatMoney(addonsTotal)}</span>
            </div>
          ) : null}
          {extraGuests > 0 ? (
            <div className="flex justify-between">
              <span className="text-forest-800/55">
                هزینه {toFa(extraGuests)} نفر اضافه
              </span>
              <span className="font-semibold">{formatMoney(extraTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-forest-800/55">مالیات و عوارض</span>
            <span className="font-semibold text-emerald-700">شامل می‌شود</span>
          </div>
          {promoDiscount > 0 ? (
            <div className="flex justify-between text-forest-700">
              <span>تخفیف ({promo?.code})</span>
              <span className="font-bold">− {formatMoney(promoDiscount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-forest-800/55">مبلغ کل</span>
            <span className="font-bold">{formatMoney(total)}</span>
          </div>
          <div className="neu-raised flex items-center justify-between rounded-xl px-3 py-2.5">
            <span className="text-[11px] font-semibold text-forest-800/70">پیش‌پرداخت ({toFa(prepaymentPercent)}٪)</span>
            <span className="text-sm font-black text-forest-900">{formatMoney(prepayment)}</span>
          </div>
          <div className="flex items-center justify-between px-1 text-[11px] text-forest-800/60">
            <span>مانده در محل پذیرش</span>
            <span>{formatMoney(total - prepayment)}</span>
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-forest-200 bg-white/40 p-3">
          <p className="text-[10px] font-bold text-forest-900">کد تخفیف دارید؟</p>
          <div className="mt-1.5 flex gap-1.5">
            <input
              className="input h-8 flex-1 py-1 text-[11px] uppercase"
              dir="ltr"
              value={promoInput}
              onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
              placeholder="PROMO CODE"
            />
            <button type="button" onClick={applyPromo} disabled={promoLoading} className="btn btn-ghost btn-sm shrink-0">
              {promoLoading ? <span className="loading loading-spinner loading-xs" /> : "اعمال"}
            </button>
          </div>
          {promoError ? <p className="mt-1 text-[9px] font-semibold text-rose-600">{promoError}</p> : null}
          {promo ? (
            <div className="mt-1.5 flex items-center justify-between rounded-lg bg-forest-50 px-2 py-1.5 text-[9px] text-forest-800">
              <span>✓ {promo.label} ({promo.code})</span>
              <button type="button" onClick={() => { setPromo(null); setPromoInput(""); }} className="font-bold text-rose-600">
                حذف
              </button>
            </div>
          ) : null}
        </div>

        <p className="rounded-xl bg-gold-50 p-3 text-[10px] leading-5 text-gold-700">
          ⓘ بدون ثبت درخواست و صدور کد رزرو، رزرو قطعی نمی‌شود. پس از تأیید پذیرش، کد رزرو به شما اعلام می‌گردد.
        </p>
      </aside>
    </div>
  );
}
