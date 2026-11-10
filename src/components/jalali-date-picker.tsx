"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import * as jalaali from "jalaali-js";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  cn,
  faNum,
  formatJalali,
  isoToJalali,
  jalaliToISO,
  jMonths,
  parseISODate,
  todayISO,
  weekDays,
} from "@/lib/utils";

export function JalaliDatePicker({
  name,
  value,
  onChange,
  min,
  isDisabled,
  dayInfo,
  placeholder = "انتخاب تاریخ",
  label,
}: {
  name: string;
  value: string;
  onChange: (iso: string) => void;
  min?: string;
  isDisabled?: (iso: string) => boolean;
  dayInfo?: (iso: string) => { price?: number; kind?: string } | undefined;
  placeholder?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const base = isoToJalali(value || min || todayISO());
  const [view, setView] = useState({ jy: base.jy, jm: base.jm });
  const ref = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const on = () => setMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const b = isoToJalali(value || min || todayISO());
    setView({ jy: b.jy, jm: b.jm });
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || sheetRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const firstISO = jalaliToISO(view.jy, view.jm, 1);
  const offset = (parseISODate(firstISO).getUTCDay() + 1) % 7;
  const len = jalaali.jalaaliMonthLength(view.jy, view.jm);
  const today = todayISO();

  const move = (d: number) => {
    let jm = view.jm + d;
    let jy = view.jy;
    if (jm > 12) {
      jm = 1;
      jy++;
    }
    if (jm < 1) {
      jm = 12;
      jy--;
    }
    setView({ jy, jm });
  };

  return (
    <div className="relative" ref={ref}>
      {label && <span className="field-label">{label}</span>}
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn("input w-full flex items-center justify-between text-right", !value && "text-slate-400")}
      >
        <span>{value ? formatJalali(value, true) : placeholder}</span>
        <CalendarDays className="h-4 w-4 text-brand-600" />
      </button>
      {open && (
        <Sheet mobile={mobile} onClose={() => setOpen(false)}>
        <div
          ref={sheetRef}
          dir="rtl"
          className={cn(
            "animate-fade-up border border-slate-200 bg-white p-3 shadow-2xl",
            mobile
              ? "fixed inset-x-0 bottom-0 z-[121] max-h-[85svh] overflow-y-auto rounded-t-3xl px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] [&_button]:min-h-10"
              : "absolute right-0 z-40 mt-2 w-80 rounded-2xl",
          )}
        >
          {mobile && (
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">{label || placeholder}</span>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">بستن</button>
            </div>
          )}
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => move(-1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100">
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="text-sm font-bold text-slate-800">
              {jMonths[view.jm - 1]} {faNum(view.jy)}
            </div>
            <button type="button" onClick={() => move(1)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
            {weekDays.map((d) => (
              <div key={d} className="py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: offset }).map((_, i) => (
              <div key={`e${i}`} />
            ))}
            {Array.from({ length: len }).map((_, i) => {
              const iso = jalaliToISO(view.jy, view.jm, i + 1);
              const disabled = (min && iso < min) || (isDisabled ? isDisabled(iso) : false);
              const selected = iso === value;
              const info = dayInfo?.(iso);
              return (
                <button
                  type="button"
                  key={iso}
                  disabled={!!disabled}
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg text-sm transition",
                    info ? "h-12" : "aspect-square",
                    selected
                      ? "bg-primary font-bold text-primary-content"
                      : disabled
                        ? "cursor-not-allowed text-base-content/25 line-through"
                        : info?.kind === "holiday"
                          ? "text-error hover:bg-error/10"
                          : info?.kind === "peak"
                            ? "bg-warning/10 text-warning-content hover:bg-warning/20"
                            : "hover:bg-primary/10",
                    iso === today && !selected && "ring-1 ring-secondary",
                  )}
                >
                  <span>{faNum(i + 1)}</span>
                  {info?.price !== undefined && !disabled && (
                    <span className={cn("text-[9px] leading-none", selected ? "text-primary-content/80" : "text-base-content/50")}>
                      {faNum((info.price / 1_000_000).toFixed(info.price % 1_000_000 === 0 ? 0 : 1))}م
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {dayInfo && (
            <div className="mt-2 flex flex-wrap gap-3 border-t border-base-200 pt-2 text-[10px] text-base-content/60">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-error" /> تعطیل</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-warning" /> پیک</span>
              <span>قیمت‌ها به میلیون تومان</span>
            </div>
          )}
        </div>
        </Sheet>
      )}
    </div>
  );
}

/** On phones the calendar is rendered at <body> level as a bottom sheet (fixed positioning would break inside transformed / blurred ancestors). */
function Sheet({ mobile, onClose, children }: { mobile: boolean; onClose: () => void; children: ReactNode }) {
  if (!mobile) return <>{children}</>;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[120] bg-black/45" onClick={onClose} aria-hidden />
      {children}
    </>,
    document.body,
  );
}
