"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { TicketPercent, X as XIcon } from "lucide-react";
import { BedDouble, Waves, ShieldCheck, Info, Users, AlertCircle, ScrollText } from "lucide-react";
import { createReservation } from "@/app/actions/public";
import { JalaliDatePicker } from "./jalali-date-picker";
import { addDaysISO, cn, diffDays, faNum, formatJalali, formatPrice, todayISO } from "@/lib/utils";
import { minServicePrice } from "@/lib/booking";
import type { RoomOption } from "@/db/schema";
import { ChevronDown, CheckCircle2 } from "lucide-react";

const unitLabel: Record<RoomOption["unit"], string> = {
  per_night: "هر شب",
  per_person_night: "هر نفر / شب",
  per_stay: "کل اقامت",
  per_person: "هر نفر",
};

export type BookRoom = {
  id: number;
  name: string;
  type: string;
  price: number;
  capacity: number;
  maxGuests: number;
  extraGuestPrice: number;
  options: RoomOption[];
};
type Quote = {
  nights: { date: string; price: number; kind: string; title: string }[];
  nightsCount: number;
  roomTotal: number;
  extraGuests: number;
  extraGuestFee: number;
  options: { id: string; title: string; amount: number }[];
  optionsTotal: number;
  total: number;
};
export type BookService = {
  id: number;
  name: string;
  price: number;
  priceUnit: string;
  timeSlots: string[];
  slotPrices: Record<string, number>;
  includedGuests: number;
  extraGuestPrice: number;
  maxGuests: number;
  rules: string[];
};

export function BookingForm({
  rooms,
  services,
  defaultKind = "room",
  defaultItemId,
  depositPercent,
  compact = false,
  hotelRules = [],
  requireRulesAccept = true,
  initial,
}: {
  rooms: BookRoom[];
  services: BookService[];
  defaultKind?: "room" | "service";
  defaultItemId?: number;
  depositPercent: number;
  compact?: boolean;
  hotelRules?: string[];
  requireRulesAccept?: boolean;
  initial?: { checkIn?: string; checkOut?: string; guests?: number; promo?: string };
}) {
  const [state, action, pending] = useActionState(createReservation, null);
  const [kind, setKind] = useState<"room" | "service">(defaultKind);
  const [roomId, setRoomId] = useState<number>(
    defaultKind === "room" && defaultItemId ? defaultItemId : rooms[0]?.id ?? 0,
  );
  const [serviceId, setServiceId] = useState<number>(
    defaultKind === "service" && defaultItemId ? defaultItemId : services[0]?.id ?? 0,
  );
  const validIn = initial?.checkIn && /^\d{4}-\d{2}-\d{2}$/.test(initial.checkIn) && initial.checkIn >= todayISO() ? initial.checkIn : "";
  const validOut =
    validIn && defaultKind === "room" && initial?.checkOut && /^\d{4}-\d{2}-\d{2}$/.test(initial.checkOut) && initial.checkOut > validIn ? initial.checkOut : "";
  const [checkIn, setCheckIn] = useState(validIn);
  const [checkOut, setCheckOut] = useState(validOut);
  const [slot, setSlot] = useState("");
  const [guests, setGuests] = useState(Math.min(30, Math.max(1, Number(initial?.guests) || 2)));
  const [ranges, setRanges] = useState<{ checkIn: string; checkOut: string | null }[]>([]);
  const [taken, setTaken] = useState<string[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [prices, setPrices] = useState<Record<string, { p: number; k?: string }>>({});
  const [optIds, setOptIds] = useState<string[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [showNights, setShowNights] = useState(false);

  const room = rooms.find((r) => r.id === roomId);
  const service = services.find((s) => s.id === serviceId);
  const today = todayISO();

  useEffect(() => {
    if (kind !== "room" || !roomId) return;
    let alive = true;
    setLoadingAvail(true);
    fetch(`/api/availability?roomId=${roomId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setRanges(d.ranges ?? []);
        setPrices(d.prices ?? {});
      })
      .finally(() => alive && setLoadingAvail(false));
    return () => {
      alive = false;
    };
  }, [kind, roomId]);

  useEffect(() => {
    if (kind !== "service" || !serviceId || !checkIn) return;
    let alive = true;
    setLoadingAvail(true);
    fetch(`/api/availability?serviceId=${serviceId}&date=${checkIn}`)
      .then((r) => r.json())
      .then((d) => alive && setTaken(d.slots ?? []))
      .finally(() => alive && setLoadingAvail(false));
    return () => {
      alive = false;
    };
  }, [kind, serviceId, checkIn]);

  useEffect(() => {
    setOptIds([]);
  }, [roomId]);

  useEffect(() => {
    if (kind !== "room" || !roomId || !checkIn || !checkOut || checkOut <= checkIn) {
      setQuote(null);
      return;
    }
    let alive = true;
    setQuoting(true);
    const t = setTimeout(() => {
      fetch(`/api/quote?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}&guests=${guests}&options=${optIds.join(",")}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => alive && setQuote(d))
        .finally(() => alive && setQuoting(false));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [kind, roomId, checkIn, checkOut, guests, optIds]);

  const dayInfo = (iso: string) => {
    const x = prices[iso];
    return x ? { price: x.p, kind: x.k } : undefined;
  };

  const isNightBooked = (iso: string) => ranges.some((r) => r.checkOut && iso >= r.checkIn && iso < r.checkOut);
  const isCheckoutBlocked = (iso: string) => {
    if (!checkIn || iso <= checkIn) return true;
    return ranges.some((r) => r.checkOut && r.checkIn < iso && r.checkOut > checkIn);
  };

  const nights = kind === "room" && checkIn && checkOut ? Math.max(0, diffDays(checkIn, checkOut)) : 0;
  const slotPrice = (t: string) => (service ? service.slotPrices[t] ?? service.price : 0);
  const extraCount = kind === "service" && service ? Math.max(0, guests - service.includedGuests) : 0;
  const extraFee = kind === "service" && service ? extraCount * service.extraGuestPrice : 0;
  const basePrice = kind === "room" ? quote?.roomTotal ?? (room?.price ?? 0) * nights : slot ? slotPrice(slot) : service?.price ?? 0;
  const subtotal = kind === "room" ? quote?.total ?? basePrice : basePrice + extraFee;

  /* ---------- promo code ---------- */
  const [promoInput, setPromoInput] = useState(initial?.promo ?? "");
  const [promo, setPromo] = useState<{ code: string; title: string; discount: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const autoTried = useRef(false);
  const applyPromo = async (code: string, silent = false) => {
    if (!code.trim()) return;
    setPromoBusy(true);
    const q = new URLSearchParams({
      code,
      kind,
      itemId: String(kind === "room" ? roomId : serviceId),
      checkIn,
      checkOut,
      guests: String(guests),
      options: optIds.join(","),
      timeSlot: slot,
    });
    try {
      const r = await fetch(`/api/promo?${q}`).then((x) => x.json());
      if (r.ok) {
        setPromo({ code: r.code, title: r.title, discount: r.discount });
        setPromoMsg({ ok: true, text: r.message });
      } else {
        setPromo(null);
        if (!silent) setPromoMsg({ ok: false, text: r.error });
      }
    } catch {
      if (!silent) setPromoMsg({ ok: false, text: "خطا در بررسی کد تخفیف" });
    } finally {
      setPromoBusy(false);
    }
  };
  const promoDeps = JSON.stringify([kind, roomId, serviceId, checkIn, checkOut, guests, optIds, slot]);
  const promoReady = kind === "room" ? !!(checkIn && checkOut) : !!checkIn && (!service?.timeSlots.length || !!slot);
  useEffect(() => {
    if (!promoReady) return;
    if (promo) void applyPromo(promo.code, false);
    else if (!autoTried.current && initial?.promo) {
      autoTried.current = true;
      void applyPromo(initial.promo, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promoDeps, promoReady]);
  const discount = promo ? Math.min(promo.discount, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);
  const rules = kind === "room" ? hotelRules : service?.rules ?? [];
  const [accepted, setAccepted] = useState(false);
  const deposit = Math.round((total * depositPercent) / 100 / 1000) * 1000;
  const maxGuests = kind === "room" ? room?.maxGuests ?? 2 : service?.maxGuests ?? 6;

  useEffect(() => {
    if (guests > maxGuests) setGuests(maxGuests);
  }, [maxGuests, guests]);

  const ready = useMemo(() => {
    if (requireRulesAccept && rules.length > 0 && !accepted) return false;
    if (kind === "room") return !!roomId && !!checkIn && !!checkOut && nights > 0;
    return !!serviceId && !!checkIn && (service?.timeSlots.length ? !!slot : true);
  }, [kind, roomId, serviceId, checkIn, checkOut, nights, slot, service, requireRulesAccept, rules.length, accepted]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="itemId" value={kind === "room" ? roomId : serviceId} />
      <input type="hidden" name="timeSlot" value={slot} />
      <input type="hidden" name="guests" value={guests} />
      <input type="hidden" name="promoCode" value={promo?.code ?? ""} />

      <div role="tablist" className="tabs tabs-box grid grid-cols-2 bg-base-200 p-1.5">
        {[
          { k: "room" as const, label: "اقامت در اتاق", Icon: BedDouble, disabled: rooms.length === 0 },
          { k: "service" as const, label: services.length === 1 ? services[0].name : "خدمات و سانس‌ها", Icon: Waves, disabled: services.length === 0 },
        ].map(({ k, label, Icon, disabled }) => (
          <button
            type="button"
            key={k}
            disabled={disabled}
            onClick={() => {
              setKind(k);
              setAccepted(false);
              setCheckIn("");
              setCheckOut("");
              setSlot("");
            }}
            className={cn(
              "tab h-11 gap-2 text-sm font-semibold disabled:opacity-40",
              kind === k && "tab-active !text-primary",
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      <div className={cn("grid gap-4", !compact && "md:grid-cols-2")}>
        {kind === "room" ? (
          <>
            <div className={cn(!compact && "md:col-span-2")}>
              <label className="field-label">انتخاب اتاق</label>
              <select
                className="select w-full"
                value={roomId}
                onChange={(e) => {
                  setRoomId(Number(e.target.value));
                  setCheckIn("");
                  setCheckOut("");
                }}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — از {formatPrice(r.price)} تومان / شب
                  </option>
                ))}
              </select>
            </div>
            <JalaliDatePicker
              name="checkIn"
              label="تاریخ ورود"
              value={checkIn}
              min={today}
              isDisabled={isNightBooked}
              dayInfo={dayInfo}
              onChange={(v) => {
                setCheckIn(v);
                if (!checkOut || checkOut <= v || isCheckoutBlockedFor(v, checkOut, ranges)) setCheckOut(addDaysISO(v, 1));
              }}
            />
            <JalaliDatePicker
              name="checkOut"
              label="تاریخ خروج"
              value={checkOut}
              min={checkIn ? addDaysISO(checkIn, 1) : addDaysISO(today, 1)}
              isDisabled={isCheckoutBlocked}
              dayInfo={dayInfo}
              onChange={setCheckOut}
              placeholder={checkIn ? "انتخاب تاریخ خروج" : "ابتدا تاریخ ورود"}
            />
          </>
        ) : (
          <>
            <div>
              <label className="field-label">انتخاب خدمت</label>
              <select
                className="select w-full"
                value={serviceId}
                onChange={(e) => {
                  setServiceId(Number(e.target.value));
                  setSlot("");
                }}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {Object.keys(s.slotPrices).length ? "از " : ""}{formatPrice(minServicePrice(s))} تومان
                  </option>
                ))}
              </select>
            </div>
            <JalaliDatePicker
              name="checkIn"
              label="تاریخ"
              value={checkIn}
              min={today}
              onChange={(v) => {
                setCheckIn(v);
                setSlot("");
              }}
            />
            {service && service.timeSlots.length > 0 && (
              <div className={cn(!compact && "md:col-span-2")}>
                <label className="field-label flex items-center gap-2">
                  انتخاب سانس {loadingAvail && <span className="loading loading-spinner loading-xs text-primary" />}
                </label>
                {!checkIn ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                    برای مشاهده سانس‌های خالی، ابتدا تاریخ را انتخاب کنید.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {service.timeSlots.map((t) => {
                      const isTaken = taken.includes(t);
                      return (
                        <button
                          type="button"
                          key={t}
                          disabled={isTaken}
                          onClick={() => setSlot(t)}
                          className={cn(
                            "btn h-auto flex-col gap-0.5 py-2.5",
                            slot === t ? "btn-primary shadow-lg shadow-primary/20" : isTaken ? "btn-disabled line-through" : "btn-outline border-base-300 hover:border-primary hover:bg-primary/5 hover:text-primary",
                          )}
                        >
                          <span dir="ltr">{faNum(t)}</span>
                          <span className={cn("block text-[10px]", slot === t ? "text-white/80" : "text-slate-500")}>
                            {isTaken ? "رزرو شده" : `${formatPrice(slotPrice(t))} ت`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div>
          <label className="field-label">تعداد نفرات</label>
          <div className="join w-full">
            <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="btn join-item btn-square text-lg">−</button>
            <div className="input join-item flex flex-1 items-center justify-center gap-2 font-bold">
              <Users className="h-4 w-4 text-primary" /> {faNum(guests)} نفر
            </div>
            <button type="button" onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} className="btn join-item btn-square text-lg">+</button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            حداکثر {faNum(maxGuests)} نفر
            {kind === "service" && service && service.extraGuestPrice > 0 && (
              <> · تا {faNum(service.includedGuests)} نفر در قیمت سانس، هر نفر اضافه {formatPrice(service.extraGuestPrice)} تومان</>
            )}
            {kind === "room" && room && room.extraGuestPrice > 0 && (
              <> · ظرفیت استاندارد {faNum(room.capacity)} نفر، هر نفر اضافه شبی {formatPrice(room.extraGuestPrice)} تومان</>
            )}
          </p>
        </div>
        {kind === "room" && room && room.options.length > 0 && (
          <div className={cn(!compact && "md:col-span-2")}>
            <label className="field-label">خدمات و وعده‌های غذایی</label>
            <input type="hidden" name="options" value={optIds.join(",")} />
            <div className="grid gap-2 sm:grid-cols-2">
              {room.options.map((o) =>
                o.included ? (
                  <div key={o.id} className="flex items-center gap-3 rounded-box border border-success/30 bg-success/5 px-3 py-2.5 text-sm">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <span className="flex-1 font-medium">{o.title}</span>
                    <span className="badge badge-success badge-soft badge-sm">رایگان</span>
                  </div>
                ) : (
                  <label key={o.id} className={cn("flex cursor-pointer items-center gap-3 rounded-box border px-3 py-2.5 text-sm transition", optIds.includes(o.id) ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/50")}>
                    <input
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={optIds.includes(o.id)}
                      onChange={(e) => setOptIds((ids) => (e.target.checked ? [...ids, o.id] : ids.filter((x) => x !== o.id)))}
                    />
                    <span className="flex-1 font-medium">{o.title}</span>
                    <span className="text-left text-xs text-base-content/60">
                      {formatPrice(o.price)} ت<span className="block text-[10px]">{unitLabel[o.unit]}</span>
                    </span>
                  </label>
                ),
              )}
            </div>
          </div>
        )}
        <div>
          <label className="field-label">نام و نام خانوادگی *</label>
          <input name="guestName" className="input w-full" placeholder="مثلاً علی رضایی" required />
        </div>
        <div>
          <label className="field-label">شماره موبایل *</label>
          <input name="phone" className="input w-full text-left" dir="ltr" placeholder="09121234567" inputMode="tel" required />
        </div>
        <div>
          <label className="field-label">کد ملی</label>
          <input name="nationalId" className="input w-full text-left" dir="ltr" placeholder="اختیاری" inputMode="numeric" />
        </div>
        <div className={cn(!compact && "md:col-span-2")}>
          <label className="field-label">ایمیل</label>
          <input name="email" type="email" className="input w-full text-left" dir="ltr" placeholder="اختیاری" />
        </div>
        <div className={cn(!compact && "md:col-span-2")}>
          <label className="field-label">توضیحات</label>
          <textarea name="notes" rows={2} className="textarea w-full" placeholder="درخواست ویژه، ساعت تقریبی ورود، تخت اضافه و ..." />
        </div>
      </div>

      <div className="rounded-box border border-dashed border-primary/30 bg-primary/5 p-3">
        <label className="field-label flex items-center gap-1.5"><TicketPercent className="h-4 w-4 text-primary" /> کد تخفیف</label>
        {promo ? (
          <div className="flex items-center justify-between gap-2 rounded-field bg-success/10 px-3 py-2 text-sm">
            <span><b className="font-mono" dir="ltr">{promo.code}</b> · {promo.title}</span>
            <button type="button" onClick={() => { setPromo(null); setPromoMsg(null); setPromoInput(""); }} className="btn btn-ghost btn-xs btn-square" aria-label="حذف کد"><XIcon className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <div className="join w-full">
            <input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} dir="ltr" placeholder="مثلاً SUMMER20" className="input join-item w-full text-left font-mono uppercase" />
            <button type="button" disabled={promoBusy || !promoInput.trim()} onClick={() => applyPromo(promoInput)} className="btn btn-primary join-item">
              {promoBusy ? <span className="loading loading-spinner loading-xs" /> : "اعمال"}
            </button>
          </div>
        )}
        {promoMsg && <p className={cn("mt-1.5 text-xs", promoMsg.ok ? "text-success" : "text-error")}>{promoMsg.text}</p>}
        {!promoReady && !promo && <p className="mt-1.5 text-[11px] text-base-content/50">برای اعمال کد، ابتدا تاریخ{kind === "service" ? " و سانس" : "های ورود و خروج"} را انتخاب کنید.</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white">
        <div className="space-y-2 p-4 text-sm">
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1">
              {kind === "room" ? `${room?.name ?? "—"} × ${faNum(nights)} شب` : `${service?.name ?? "—"}${slot ? ` · سانس ${faNum(slot)}` : ""}`}
              {kind === "room" && quoting && <span className="loading loading-dots loading-xs text-primary" />}
              {kind === "room" && quote && quote.nights.length > 0 && (
                <button type="button" onClick={() => setShowNights((s) => !s)} className="btn btn-ghost btn-xs gap-0.5 px-1 text-primary">
                  جزئیات شب‌ها <ChevronDown className={cn("h-3 w-3 transition", showNights && "rotate-180")} />
                </button>
              )}
            </span>
            <span>{formatPrice(basePrice)} تومان</span>
          </div>
          {kind === "room" && showNights && quote && (
            <ul className="space-y-1 rounded-box bg-base-100 p-2 text-xs">
              {quote.nights.map((n) => (
                <li key={n.date} className="flex justify-between">
                  <span className="flex items-center gap-1.5">
                    {formatJalali(n.date, true)}
                    {n.kind === "holiday" && <span className="badge badge-error badge-soft badge-xs">{n.title || "تعطیل"}</span>}
                    {n.kind === "peak" && <span className="badge badge-warning badge-soft badge-xs">{n.title || "پیک"}</span>}
                  </span>
                  <span>{formatPrice(n.price)}</span>
                </li>
              ))}
            </ul>
          )}
          {kind === "room" && quote && quote.extraGuestFee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>{faNum(quote.extraGuests)} نفر اضافه × {faNum(quote.nightsCount)} شب</span>
              <span>{formatPrice(quote.extraGuestFee)} تومان</span>
            </div>
          )}
          {kind === "room" &&
            quote?.options.filter((o) => o.amount > 0).map((o) => (
              <div key={o.id} className="flex justify-between text-slate-600">
                <span>{o.title}</span>
                <span>{formatPrice(o.amount)} تومان</span>
              </div>
            ))}
          {extraFee > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>{faNum(extraCount)} نفر اضافه × {formatPrice(service?.extraGuestPrice ?? 0)}</span>
              <span>{formatPrice(extraFee)} تومان</span>
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between font-medium text-success">
              <span>تخفیف ({promo?.code})</span>
              <span>− {formatPrice(discount)} تومان</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-slate-800">
            <span>مبلغ کل</span>
            <span>{formatPrice(total)} تومان</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-brand-200 pt-2 font-bold text-brand-800">
            <span>پیش‌پرداخت ({faNum(depositPercent)}٪)</span>
            <span>{formatPrice(deposit)} تومان</span>
          </div>
        </div>
        <div className="flex gap-2 bg-brand-700/5 px-4 py-3 text-xs leading-6 text-brand-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          پس از ثبت درخواست، کد پیگیری دریافت می‌کنید و باید پیش‌پرداخت را واریز کنید. رزرو فقط پس از تایید پذیرش و صدور «کد رزرو» قطعی می‌شود.
        </div>
      </div>

      {rules.length > 0 && (
        <div className="overflow-hidden rounded-box border border-warning/30 bg-warning/5">
          <div className="flex items-center gap-2 border-b border-amber-200/70 px-4 py-2.5 text-sm font-bold text-amber-900">
            <ScrollText className="h-4 w-4" /> {kind === "room" ? "قوانین اقامت در هتل" : `قوانین ${service?.name ?? ""}`}
          </div>
          <ul className="max-h-40 space-y-1.5 overflow-y-auto px-4 py-3 text-xs leading-6 text-amber-900/80">
            {rules.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {r}
              </li>
            ))}
          </ul>
          {requireRulesAccept && (
            <label className="flex cursor-pointer items-center gap-2 border-t border-warning/20 bg-base-100/70 px-4 py-3 text-sm font-medium">
              <input type="checkbox" name="acceptRules" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="checkbox checkbox-primary checkbox-sm" />
              قوانین فوق را مطالعه کرده‌ام و می‌پذیرم.
            </label>
          )}
        </div>
      )}
      {(!requireRulesAccept || rules.length === 0) && <input type="hidden" name="acceptRules" value="on" />}

      {state?.error && (
        <div role="alert" className="alert alert-error alert-soft text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> <span>{state.error}</span>
        </div>
      )}

      <button type="submit" disabled={pending || !ready} className="btn btn-secondary w-full h-12 text-base">
        {pending ? <span className="loading loading-spinner" /> : <ShieldCheck className="h-5 w-5" />}
        {pending ? "در حال ثبت درخواست..." : "ثبت درخواست رزرو و ادامه به پرداخت"}
      </button>
    </form>
  );
}

function isCheckoutBlockedFor(checkIn: string, checkOut: string, ranges: { checkIn: string; checkOut: string | null }[]) {
  return ranges.some((r) => r.checkOut && r.checkIn < checkOut && r.checkOut > checkIn);
}

