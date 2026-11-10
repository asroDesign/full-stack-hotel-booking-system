"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertCircle, Send, CreditCard, Landmark, Copy, Search } from "lucide-react";
import { sendMessage, payDeposit, lookupReservation, submitReview } from "@/app/actions/public";
import { cn, faNum, formatPrice } from "@/lib/utils";
import type { PaymentGatewayOption } from "@/lib/payment-gateways";
import type { GatewayRedirect } from "@/lib/payment-providers";

function Alert({ state }: { state: { ok?: boolean; error?: string; message?: string } | null }) {
  if (!state) return null;
  if (state.error)
    return (
      <div role="alert" className="alert alert-error alert-soft text-sm">
        <AlertCircle className="h-4 w-4 shrink-0" /> <span>{state.error}</span>
      </div>
    );
  if (state.ok)
    return (
      <div role="alert" className="alert alert-success alert-soft text-sm">
        <CheckCircle2 className="h-4 w-4 shrink-0" /> <span>{state.message}</span>
      </div>
    );
  return null;
}

export function ContactForm() {
  const [state, action, pending] = useActionState(sendMessage, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
      <div>
        <label className="field-label">نام و نام خانوادگی *</label>
        <input name="name" className="input w-full" required />
      </div>
      <div>
        <label className="field-label">شماره تماس</label>
        <input name="phone" className="input w-full text-left" dir="ltr" />
      </div>
      <div>
        <label className="field-label">ایمیل</label>
        <input name="email" type="email" className="input w-full text-left" dir="ltr" />
      </div>
      <div>
        <label className="field-label">موضوع</label>
        <select name="subject" className="select w-full">
          <option>سؤال درباره رزرو</option>
          <option>خدمات و رستوران</option>
          <option>رزرو گروهی و تخفیف</option>
          <option>پیشنهاد و انتقاد</option>
          <option>سایر</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">متن پیام *</label>
        <textarea name="body" rows={5} className="textarea w-full" required />
      </div>
      <div className="sm:col-span-2">
        <Alert state={state} />
      </div>
      <div className="sm:col-span-2">
        <button disabled={pending} className="btn btn-primary w-full h-12 sm:w-auto sm:px-10">
          {pending ? <span className="loading loading-spinner loading-sm" /> : <Send className="h-4 w-4" />}
          {pending ? "در حال ارسال..." : "ارسال پیام"}
        </button>
      </div>
    </form>
  );
}

function goToGateway(redirect: GatewayRedirect) {
  const allowed = ["payment.zarinpal.com", "sandbox.zarinpal.com", "gateway.zibal.ir", "sep.shaparak.ir", "bpm.shaparak.ir"];
  const url = new URL(redirect.url);
  if (url.protocol !== "https:" || url.username || url.password || !["", "443"].includes(url.port) || !allowed.includes(url.hostname)) throw new Error("نشانی درگاه معتبر نیست.");
  if (redirect.redirectMethod === "POST") {
    if (url.hostname !== "sep.shaparak.ir" || url.pathname !== "/OnlinePG/OnlinePG" || !redirect.redirectFields?.Token) throw new Error("اطلاعات انتقال سامان معتبر نیست.");
    const form = document.createElement("form"); form.method = "POST"; form.action = url.toString(); form.style.display = "none";
    for (const [name, value] of Object.entries(redirect.redirectFields)) { const input = document.createElement("input"); input.type = "hidden"; input.name = name; input.value = value; form.appendChild(input); }
    document.body.appendChild(form); form.submit(); return;
  }
  window.location.assign(url.toString());
}

export function PaymentPanel({
  code,
  phone,
  amount,
  cardNumber,
  cardHolder,
  bankName,
  gateways,
}: {
  code: string;
  phone: string;
  amount: number;
  cardNumber: string;
  cardHolder: string;
  bankName: string;
  gateways: PaymentGatewayOption[];
}) {
  const [state, action, pending] = useActionState(payDeposit, null);
  const [method, setMethod] = useState<"gateway" | "card">(gateways.length ? "gateway" : "card");
  const [provider, setProvider] = useState<PaymentGatewayOption["id"]>(gateways[0]?.id ?? "zarinpal");
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (state?.redirect) { try { goToGateway(state.redirect); } catch { router.refresh(); } }
    else if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="code" value={code} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="provider" value={provider} />
      <div className="grid grid-cols-2 gap-3">
        {[
          ...(gateways.length ? [{ k: "gateway" as const, label: "درگاه پرداخت آنلاین", Icon: CreditCard }] : []),
          { k: "card" as const, label: "کارت به کارت", Icon: Landmark },
        ].map(({ k, label, Icon }) => (
          <button
            type="button"
            key={k}
            onClick={() => setMethod(k)}
            className={cn(
              "btn h-auto flex-col gap-2 py-4",
              method === k ? "btn-primary btn-soft border-2 border-primary" : "btn-outline border-base-300",
            )}
          >
            <Icon className="h-6 w-6" /> {label}
          </button>
        ))}
      </div>

      <details className="rounded-box border border-dashed border-primary/30 bg-primary/5 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-primary">پرداخت با کارت هدیه</summary>
        <input name="giftCode" dir="ltr" placeholder="GC-XXXX-XXXX" className="input mt-2 w-full text-left font-mono uppercase" />
        <p className="mt-1 text-xs text-base-content/55">کارت هدیه فقط زمانی اعمال می‌شود که ماندهٔ آن کل پیش‌پرداخت را پوشش دهد.</p>
      </details>
      {method === "card" ? (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-800 to-brand-950 p-5 text-white shadow-xl">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-gold-400/20 blur-2xl" />
            <div className="text-xs text-white/60">{bankName}</div>
            <div className="mt-4 flex items-center justify-between">
              <span dir="ltr" className="font-mono text-xl tracking-widest">{faNum(cardNumber)}</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(cardNumber.replace(/-/g, ""));
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="frost grid h-9 w-9 place-items-center rounded-lg"
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-3 text-sm text-white/80">به نام: {cardHolder}</div>
          </div>
          <div>
            <label className="field-label">شماره پیگیری / مرجع تراکنش *</label>
            <input name="ref" className="input w-full text-left" dir="ltr" placeholder="مثلاً 123456" inputMode="numeric" />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {gateways.length ? <><label className="field-label">انتخاب درگاه</label><select value={provider} onChange={(e) => { const selected = gateways.find((gateway) => gateway.id === e.target.value); if (selected) setProvider(selected.id); }} className="select w-full">{gateways.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select><p className="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-500">پس از بازگشت از بانک، نتیجه از سرویس درگاه بررسی می‌شود.</p></> : <p className="rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">درگاه اینترنتی هنوز تنظیم نشده است. برای پرداخت، رسید کارت‌به‌کارت را ثبت کنید.</p>}
        </div>
      )}

      <Alert state={state} />

      <button disabled={pending} className="btn btn-secondary w-full h-12 text-base">
        {pending ? <span className="loading loading-spinner" /> : <CreditCard className="h-5 w-5" />}
        {method === "gateway" ? `پرداخت ${formatPrice(amount)} تومان` : "ثبت رسید برای بررسی"}
      </button>
    </form>
  );
}

export function TrackLookup() {
  const [state, action, pending] = useActionState(lookupReservation, null);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="field-label">کد پیگیری یا کد رزرو</label>
        <input name="code" className="input w-full text-left font-mono uppercase" dir="ltr" placeholder="TR-XXXXXX" required />
      </div>
      <div>
        <label className="field-label">شماره موبایل</label>
        <input name="phone" className="input w-full text-left" dir="ltr" placeholder="09121234567" required />
      </div>
      <Alert state={state} />
      <button disabled={pending} className="btn btn-primary w-full h-12">
        {pending ? <span className="loading loading-spinner loading-sm" /> : <Search className="h-4 w-4" />}
        پیگیری رزرو
      </button>
    </form>
  );
}

export function ReviewForm() {
  const [state, action, pending] = useActionState(submitReview, null);
  const [rating, setRating] = useState(5);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="rating" value={rating} />
      <div className="grid grid-cols-2 gap-3">
        <input name="code" required dir="ltr" placeholder="کد رزرو ATL-…" className="input input-sm w-full text-left font-mono uppercase" />
        <input name="phone" required dir="ltr" placeholder="09121234567" className="input input-sm w-full text-left" />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-base-content/70">امتیاز شما</span>
        <div className="rating rating-md" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <input key={n} type="radio" name="r" aria-label={`${n} ستاره`} className="mask mask-star-2 bg-warning" checked={rating === n} onChange={() => setRating(n)} />
          ))}
        </div>
      </div>
      <input name="city" placeholder="شهر شما (اختیاری)" className="input input-sm w-full" />
      <textarea name="body" required rows={4} placeholder="تجربه اقامت خود را بنویسید…" className="textarea w-full" />
      <Alert state={state} />
      <button disabled={pending} className="btn btn-primary btn-block">{pending && <span className="loading loading-spinner loading-sm" />} ثبت نظر</button>
    </form>
  );
}
