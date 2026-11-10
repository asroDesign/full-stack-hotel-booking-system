"use client";

import { useState } from "react";

export default function ReviewForm() {
  const [rating, setRating] = useState(5);
  const [form, setForm] = useState({ guestName: "", city: "", title: "", comment: "" });
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <div className="glass-strong rounded-2xl p-6 text-center">
        <p className="text-2xl">🌟</p>
        <p className="mt-2 text-sm font-black text-forest-950">ممنون از ثبت نظر شما</p>
        <p className="mt-1 text-[11px] leading-6 text-forest-900/60">
          نظر شما پس از تأیید پذیرش در سایت منتشر می‌شود. اگر مهمان هتل بوده‌اید، با کد رزرو در خبرنامه ما عضو شوید.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (form.guestName.trim().length < 3 || form.comment.trim().length < 15) {
          setError("نام و متن نظر را کامل‌تر وارد کنید (حداقل ۱۵ کاراکتر).");
          return;
        }
        setState("loading");
        try {
          const response = await fetch("/api/reviews", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...form, rating }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "ثبت نظر انجام نشد.");
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
        <p className="text-sm font-black text-forest-950">تجربه اقامت خود را بنویسید</p>
        <p className="text-[10px] text-forest-900/50">نظر شما پس از بررسی پذیرش منتشر می‌شود.</p>
      </div>

      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`امتیاز ${value}`}
            className={`text-xl transition ${value <= rating ? "text-gold-500" : "text-cream-300"}`}
          >
            ★
          </button>
        ))}
        <span className="ms-2 text-[10px] font-bold text-forest-800">{rating} از ۵</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="field">
          <span className="label text-[10px]">نام و نام خانوادگی *</span>
          <input className="input text-xs" value={form.guestName} onChange={(event) => setForm({ ...form, guestName: event.target.value })} placeholder="نام شما" />
        </label>
        <label className="field">
          <span className="label text-[10px]">شهر</span>
          <input className="input text-xs" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="مثلاً تهران" />
        </label>
      </div>
      <label className="field">
        <span className="label text-[10px]">عنوان نظر</span>
        <input className="input text-xs" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="مثلاً اقامتی آرام و خوش‌طعم" />
      </label>
      <label className="field">
        <span className="label text-[10px]">متن نظر *</span>
        <textarea className="input min-h-24 text-xs" value={form.comment} onChange={(event) => setForm({ ...form, comment: event.target.value })} placeholder="از اتاق، صبحانه، کافه یا برخورد پرسنل بنویسید…" />
      </label>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[10px] font-semibold text-rose-700">{error}</p> : null}
      <button type="submit" disabled={state === "loading"} className="btn btn-primary w-full">
        {state === "loading" ? <span className="loading loading-spinner loading-xs" /> : null}
        ثبت نظر برای انتشار
      </button>
    </form>
  );
}
