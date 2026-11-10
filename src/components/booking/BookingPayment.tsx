"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";

export default function BookingPayment({
  trackingCode,
  status,
  prepaymentAmount,
  cardNumber,
}: {
  trackingCode: string;
  status: string;
  prepaymentAmount: number;
  cardNumber: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(trackingCode)}/pay`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "پرداخت انجام نشد.");
        return;
      }
      router.refresh();
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!window.confirm("آیا از لغو این درخواست رزرو مطمئن هستید؟")) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(trackingCode)}/cancel`, { method: "POST" });
      if (!response.ok) {
        setError("لغو درخواست انجام نشد.");
        return;
      }
      router.refresh();
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "confirmed") return null;

  return (
    <div className="space-y-3">
      {status === "pending_payment" || status === "rejected" ? (
        <>
          <div className="rounded-xl bg-cream-100 p-3">
            <p className="text-[10px] font-semibold text-forest-800/60">شماره کارت هتل برای کارت‌به‌کارت</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p dir="ltr" className="font-mono text-sm font-bold tracking-wider text-forest-950">
                {cardNumber}
              </p>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(cardNumber.replace(/\D/g, ""));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1800);
                  } catch {
                    setCopied(false);
                  }
                }}
                className="rounded-lg border border-cream-300 px-2 py-1 text-[10px] font-semibold text-forest-800"
              >
                {copied ? "کپی شد ✓" : "کپی شماره"}
              </button>
            </div>
          </div>
          <button type="button" onClick={pay} disabled={loading} className="btn btn-gold w-full">
            {loading ? "در حال پردازش پرداخت…" : `پرداخت پیش‌پرداخت ${formatMoney(prepaymentAmount)}`}
          </button>
          <p className="text-center text-[10px] text-forest-800/50">
            درگاه پرداخت آزمایشی است؛ پس از پرداخت، درخواست برای تأیید پذیرش ارسال می‌شود.
          </p>
        </>
      ) : null}

      {status === "awaiting_review" ? (
        <div className="rounded-xl bg-sky-50 p-3 text-[11px] leading-6 text-sky-800">
          پیش‌پرداخت شما دریافت شد. پذیرش هتل درخواست را بررسی می‌کند و پس از تأیید، کد رزرو برای شما صادر و پیامک
          می‌شود. معمولاً کمتر از ۲ ساعت کاری طول می‌کشد.
        </div>
      ) : null}

      {status !== "cancelled" && status !== "rejected" ? (
        <button type="button" onClick={cancel} disabled={loading} className="btn btn-ghost w-full text-xs">
          لغو درخواست
        </button>
      ) : null}

      {error ? <p className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</p> : null}
    </div>
  );
}
