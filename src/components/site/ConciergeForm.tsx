"use client";

import { useState } from "react";
import { todayISO } from "@/lib/format";

const SERVICES = [
  { value: "airport_transfer", label: "ترانسفر فرودگاهی" },
  { value: "tour", label: "تور و راهنمای گردشگری" },
  { value: "spa", label: "رزرو اسپا و ماساژ" },
  { value: "table", label: "رزرو میز کافه‑رستوران" },
  { value: "celebration", label: "جشن و مناسبت ویژه" },
  { value: "other", label: "سایر درخواست‌ها" },
];

export default function ConciergeForm({ defaultBookingCode = "" }: { defaultBookingCode?: string }) {
  const [form, setForm] = useState({
    guestName: "",
    phone: "",
    bookingCode: defaultBookingCode,
    serviceType: "airport_transfer",
    preferredDate: todayISO(),
    details: "",
  });
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <div className="glass-strong rounded-2xl p-6 text-center">
        <p className="text-2xl">🛎️</p>
        <p className="mt-2 text-sm font-black text-forest-950">درخواست شما ثبت شد</p>
        <p className="mt-1 text-[11px] leading-6 text-forest-900/60">
          کانسیرژ هتل در اولین فرصت با شما تماس می‌گیرد. برای موارد فوری با شماره پذیرش تماس بگیرید.
        </p>
        <button type="button" onClick={() => setState("idle")} className="btn btn-ghost btn-sm mt-3">
          ارسال درخواست جدید
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (form.guestName.trim().length < 3) return setError("نام خود را کامل وارد کنید.");
        if (!/^09\d{9}$/.test(form.phone.replace(/\D/g, ""))) return setError("شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.");
        if (form.details.trim().length < 10) return setError("جزئیات درخواست را کامل‌تر بنویسید.");
        setState("loading");
        try {
          const response = await fetch("/api/concierge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "ثبت درخواست انجام نشد.");
            setState("idle");
            return;
          }
          setState("sent");
        } catch {
          setError("خطای شبکه. دوباره تلاش کنید.");
          setState("idle");
        }
      }}
      className="glass-strong space-y-3 rounded-2xl p-5"
    >
      <div>
        <p className="text-sm font-black text-forest-950">درخواست خدمت کانسیرژ</p>
        <p className="text-[10px] text-forest-900/50">ترانسفر، تور، اسپا، میز کافه یا مناسبت ویژه</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="field">
          <span className="label text-[10px]">نام و نام خانوادگی *</span>
          <input className="input text-xs" value={form.guestName} onChange={(event) => setForm({ ...form, guestName: event.target.value })} placeholder="نام شما" />
        </label>
        <label className="field">
          <span className="label text-[10px]">موبایل *</span>
          <input className="input text-xs" dir="ltr" inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="09xxxxxxxxx" />
        </label>
        <label className="field">
          <span className="label text-[10px]">کد رزرو (اختیاری)</span>
          <input className="input text-xs" dir="ltr" value={form.bookingCode} onChange={(event) => setForm({ ...form, bookingCode: event.target.value })} placeholder="TRK-…" />
        </label>
        <label className="field">
          <span className="label text-[10px]">تاریخ درخواستی</span>
          <input type="date" className="input text-xs" value={form.preferredDate} onChange={(event) => setForm({ ...form, preferredDate: event.target.value })} />
        </label>
      </div>
      <label className="field">
        <span className="label text-[10px]">نوع خدمت</span>
        <select className="input text-xs" value={form.serviceType} onChange={(event) => setForm({ ...form, serviceType: event.target.value })}>
          {SERVICES.map((service) => (
            <option key={service.value} value={service.value}>
              {service.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span className="label text-[10px]">جزئیات *</span>
        <textarea className="input min-h-20 text-xs" value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="مثلاً: ترانسفر فرودگاه شیراز برای ۲ نفر، پرواز ۱۸:۳۰" />
      </label>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">{error}</p> : null}
      <button type="submit" disabled={state === "loading"} className="btn btn-primary w-full">
        {state === "loading" ? <span className="loading loading-spinner loading-xs" /> : null}
        ارسال به کانسیرژ
      </button>
    </form>
  );
}
