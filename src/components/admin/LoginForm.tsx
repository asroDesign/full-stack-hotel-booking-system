"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setLoading(true);
        try {
          const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await response.json();
          if (!response.ok) {
            setError(data.error ?? "ورود انجام نشد.");
            return;
          }
          router.replace("/admin");
          router.refresh();
        } catch {
          setError("خطای شبکه. دوباره تلاش کنید.");
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-4"
    >
      <label className="field">
        <span className="label">ایمیل مدیر</span>
        <input
          className="input"
          dir="ltr"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@company.com"
        />
      </label>
      <label className="field">
        <span className="label">رمز عبور</span>
        <input
          className="input"
          dir="ltr"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
      </label>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</p> : null}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "در حال ورود…" : "ورود به پنل مدیریت"}
      </button>
      {/* Demo credentials are only shown when explicitly enabled at build time
          (NEXT_PUBLIC_DEMO_CREDENTIALS=true). Keep this unset in production. */}
      {process.env.NEXT_PUBLIC_DEMO_CREDENTIALS === "true" ? (
        <div className="rounded-xl border border-dashed border-cream-300 bg-cream-50 p-3 text-[10px] leading-5 text-forest-800/60">
          <p className="font-bold text-forest-900">دسترسی نمایشی (محیط دمو)</p>
          <p dir="ltr">admin@atalar.ir / Atalar@1400</p>
        </div>
      ) : (
        <p className="rounded-xl bg-cream-100 px-3 py-2 text-center text-[10px] leading-5 text-forest-800/55">
          دسترسی این بخش محدود به مدیران مجاز هتل است. در صورت فراموشی رمز عبور با پشتیبانی فنی تماس بگیرید.
        </p>
      )}
    </form>
  );
}
