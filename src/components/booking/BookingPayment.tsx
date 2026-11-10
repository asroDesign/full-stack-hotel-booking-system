"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatMoney } from "@/lib/format";
import type { PaymentGatewayOption } from "@/lib/payment-gateways";

export default function BookingPayment({
  trackingCode,
  status,
  prepaymentAmount,
  cardNumber,
  demoMode,
  gateways,
  paymentResult,
}: {
  trackingCode: string;
  status: string;
  prepaymentAmount: number;
  cardNumber: string;
  demoMode: boolean;
  gateways: PaymentGatewayOption[];
  paymentResult?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const [currentPaymentResult, setCurrentPaymentResult] = useState(paymentResult);
  const [copied, setCopied] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState(gateways[0]?.id ?? "");

  async function pay(provider?: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(trackingCode)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(provider ? { provider } : {}),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "پرداخت انجام نشد.");
        return;
      }
      if (data.url && data.redirectMethod === "POST") {
        const target = new URL(data.url);
        if (target.protocol !== "https:" || target.username || target.password || !["", "443"].includes(target.port) || target.hostname !== "sep.shaparak.ir" || target.pathname !== "/OnlinePG/OnlinePG" || typeof data.redirectFields?.Token !== "string") throw new Error("نشانی انتقال سامان معتبر نیست.");
        const form = document.createElement("form");
        form.method = "POST";
        form.action = target.toString();
        form.style.display = "none";
        const token = document.createElement("input");
        token.type = "hidden";
        token.name = "Token";
        token.value = data.redirectFields.Token;
        form.appendChild(token);
        document.body.appendChild(form);
        form.submit();
        return;
      }
      if (data.url) {
        const target = new URL(data.url);
        if (target.protocol !== "https:" || target.username || target.password || !["", "443"].includes(target.port) || !["payment.zarinpal.com", "sandbox.zarinpal.com", "gateway.zibal.ir", "bpm.shaparak.ir"].includes(target.hostname)) throw new Error("نشانی درگاه معتبر نیست.");
        window.location.assign(target.toString());
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

  async function recheckPayment() {
    setRechecking(true);
    setError(null);
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(trackingCode)}/pay/recheck`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? "بررسی وضعیت پرداخت انجام نشد.");
        return;
      }
      if (data.status === "success") {
        setCurrentPaymentResult("success");
        router.refresh();
      } else if (data.status === "needs_refund") {
        setCurrentPaymentResult("refund");
      } else setError("تراکنش هنوز از سوی بانک تأیید نشده است. کمی بعد دوباره بررسی کنید.");
    } catch {
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setRechecking(false);
    }
  }

  if (status === "confirmed") return null;

  return (
    <div className="space-y-3">
      {status === "pending_payment" || status === "rejected" ? (
        <>
          {cardNumber ? <div className="rounded-xl bg-cream-100 p-3">
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
          </div> : null}
          {currentPaymentResult === "success" ? <p className="rounded-xl bg-emerald-50 p-3 text-[11px] leading-6 text-emerald-800">پیش‌پرداخت تأیید شد؛ درخواست شما برای بررسی به پذیرش هتل ارسال شد.</p> : null}
          {currentPaymentResult === "failed" ? <p className="rounded-xl bg-rose-50 p-3 text-[11px] leading-6 text-rose-700">پرداخت تأیید نشد. می‌توانید دوباره تلاش کنید یا از کارت‌به‌کارت استفاده کنید.</p> : null}
          {currentPaymentResult === "processing" ? <div className="space-y-2 rounded-xl bg-amber-50 p-3 text-[11px] leading-6 text-amber-800"><p>تراکنش در حال بررسی است. اگر وجه از حساب کسر شده، پرداخت را دوباره انجام ندهید.</p><button type="button" onClick={recheckPayment} disabled={rechecking} className="font-bold underline">{rechecking ? "در حال بررسی…" : "بررسی دوباره وضعیت پرداخت"}</button></div> : null}
          {currentPaymentResult === "refund" ? <p className="rounded-xl bg-rose-50 p-3 text-[11px] leading-6 text-rose-800">وجه دریافت شده اما وضعیت رزرو نیازمند بررسی است؛ پذیرش موضوع استرداد را پیگیری می‌کند.</p> : null}
          {gateways.length > 0 ? (
            <>
              <div className="space-y-2">{gateways.map((gateway) => <label key={gateway.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-cream-200 p-3 text-xs font-bold"><input type="radio" name={`gateway-${trackingCode}`} checked={selectedGateway === gateway.id} onChange={() => setSelectedGateway(gateway.id)} />پرداخت با {gateway.label}</label>)}</div>
              <button type="button" onClick={() => pay(selectedGateway)} disabled={loading || !selectedGateway || currentPaymentResult === "processing"} className="btn btn-gold w-full">
                {loading ? "در حال انتقال به درگاه…" : `پرداخت آنلاین ${formatMoney(prepaymentAmount)}`}
              </button>
            </>
          ) : demoMode ? (
            <>
              <button type="button" onClick={pay} disabled={loading} className="btn btn-gold w-full">
                {loading ? "در حال پردازش پرداخت…" : `پرداخت آزمایشی ${formatMoney(prepaymentAmount)}`}
              </button>
              <p className="text-center text-[10px] text-forest-800/50">
                این پرداخت فقط برای محیط دمو است و تراکنش بانکی واقعی انجام نمی‌دهد.
              </p>
            </>
          ) : cardNumber ? (
            <p className="rounded-xl bg-amber-50 p-3 text-[10px] leading-6 text-amber-800">
              پس از کارت‌به‌کارت، رسید را برای پذیرش ارسال کنید تا پرداخت از پنل بررسی و ثبت شود.
            </p>
          ) : (
            <p className="rounded-xl bg-amber-50 p-3 text-[10px] leading-6 text-amber-800">درگاه پرداخت هنوز پیکربندی نشده است؛ برای پرداخت با پذیرش تماس بگیرید.</p>
          )}
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
