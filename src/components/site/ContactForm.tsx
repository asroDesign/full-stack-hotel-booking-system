"use client";

import { useState } from "react";

const SUBJECTS = ["درخواست رزرو", "سوال درباره اتاق‌ها", "رزرو استخر خانوادگی", "تور و گشت", "همکاری", "سایر"];

export default function ContactForm() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: SUBJECTS[0], message: "" });
  const [state, setState] = useState<"idle" | "loading" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  if (state === "sent") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-forest-50 p-8 text-center">
        <div className="neu-circle h-12 w-12 text-xl text-forest-700">✓</div>
        <p className="text-sm font-bold text-forest-950">پیام شما ثبت شد</p>
        <p className="max-w-sm text-xs leading-6 text-forest-800/65">
          همکاران پذیرش کاج در اولین فرصت با شما تماس می‌گیرند. برای موارد فوری با شماره پذیرش تماس بگیرید.
        </p>
        <button
          type="button"
          onClick={() => {
            setForm({ name: "", phone: "", email: "", subject: SUBJECTS[0], message: "" });
            setState("idle");
          }}
          className="btn btn-ghost btn-sm"
        >
          ارسال پیام جدید
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        if (form.name.trim().length < 3 || form.message.trim().length < 10) {
          setError("نام و متن پیام را کامل‌تر وارد کنید (حداقل ۱۰ کاراکتر برای پیام).");
          return;
        }
        setState("loading");
        try {
          const response = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
          if (!response.ok) {
            const data = await response.json();
            setError(data.error ?? "ارسال پیام انجام نشد.");
            setState("idle");
            return;
          }
          setState("sent");
        } catch {
          setError("خطای شبکه. دوباره تلاش کنید.");
          setState("idle");
        }
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field">
          <span className="label">نام و نام خانوادگی *</span>
          <input
            className="input"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="نام کامل"
          />
        </label>
        <label className="field">
          <span className="label">شماره تماس *</span>
          <input
            className="input"
            dir="ltr"
            inputMode="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            placeholder="09xxxxxxxxx"
          />
        </label>
        <label className="field">
          <span className="label">ایمیل</span>
          <input
            className="input"
            dir="ltr"
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            placeholder="you@example.com"
          />
        </label>
        <label className="field">
          <span className="label">موضوع</span>
          <select
            className="input"
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
          >
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="field">
        <span className="label">متن پیام *</span>
        <textarea
          className="input min-h-32"
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
          placeholder="سوال یا درخواست خود را بنویسید…"
        />
      </label>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</p> : null}
      <button type="submit" disabled={state === "loading"} className="btn btn-primary w-full sm:w-auto">
        {state === "loading" ? "در حال ارسال…" : "ارسال پیام به پذیرش"}
      </button>
    </form>
  );
}
