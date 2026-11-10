"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TrackForm({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const value = code.trim().toUpperCase();
        if (value.length < 10) {
          setError("کد پیگیری رزرو را کامل وارد کنید.");
          return;
        }
        setLoading(true);
        try {
          const response = await fetch(`/api/bookings/lookup?code=${encodeURIComponent(value)}`);
          if (!response.ok) {
            setError("رزروی با این کد پیدا نشد. کد را بررسی کنید یا با پذیرش تماس بگیرید.");
            return;
          }
          router.push(`/booking/${value}`);
        } catch {
          setError("خطا در ارتباط با سرور. دوباره تلاش کنید.");
        } finally {
          setLoading(false);
        }
      }}
      className="space-y-3"
    >
      <label className="field">
        <span className="label">کد پیگیری رزرو</span>
        <input
          className="input text-center font-mono tracking-widest"
          dir="ltr"
          placeholder="TRK-XXXXXX"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </label>
      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</p> : null}
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "در حال جستجو…" : "مشاهده وضعیت رزرو"}
      </button>
    </form>
  );
}
