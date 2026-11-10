"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gift, CreditCard, Landmark, Search, CalendarCheck, Send, LogIn, Wifi, Phone, BedDouble, Sparkles, Wrench, ConciergeBell, Car, CalendarPlus, MessageSquare, UtensilsCrossed } from "lucide-react";
import { bookTable, checkGiftBalance, orderGiftCard, payGiftCard, stayLogin, stayNewRequest, stayReply } from "@/app/actions/guest";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { cn, faNum, formatPrice, relativeTime, todayISO } from "@/lib/utils";
import type { PaymentGatewayOption } from "@/lib/payment-gateways";
import type { GatewayRedirect } from "@/lib/payment-providers";

function Alert({ state }: { state: { ok?: boolean; error?: string; message?: string } | null }) {
  if (!state || (!state.error && !state.message)) return null;
  return <div role="alert" className={cn("alert alert-soft text-sm", state.error ? "alert-error" : "alert-success")}>{state.error ?? state.message}</div>;
}

/* ---------------------------- gift cards ---------------------------- */

export function GiftOrderForm({ amounts, min }: { amounts: number[]; min: number }) {
  const [state, action, pending] = useActionState(orderGiftCard, null);
  const [amount, setAmount] = useState(amounts[1] ?? amounts[0] ?? min);
  const [custom, setCustom] = useState(false);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="amount" value={amount} />
      <div>
        <label className="field-label">مبلغ کارت</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {amounts.map((a) => (
            <button key={a} type="button" onClick={() => { setAmount(a); setCustom(false); }} className={cn("btn h-auto flex-col py-3", !custom && amount === a ? "btn-primary" : "btn-outline border-base-300")}>
              <span className="text-lg font-black">{formatPrice(a / 1_000_000)}</span><span className="text-[11px] opacity-70">میلیون تومان</span>
            </button>
          ))}
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} className="checkbox checkbox-sm" />مبلغ دلخواه</label>
        {custom && <input type="number" min={min} step={100000} value={amount} onChange={(e) => setAmount(Number(e.target.value) || 0)} className="input mt-2 w-full" placeholder={`حداقل ${formatPrice(min)} تومان`} />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label">نام خریدار *</label><input name="purchaserName" required className="input w-full" /></div>
        <div><label className="field-label">موبایل خریدار *</label><input name="purchaserPhone" required dir="ltr" className="input w-full text-left" placeholder="09…" /></div>
        <div><label className="field-label">نام گیرنده هدیه</label><input name="recipientName" className="input w-full" /></div>
        <div><label className="field-label">موبایل گیرنده (کد برای او پیامک می‌شود)</label><input name="recipientPhone" dir="ltr" className="input w-full text-left" placeholder="09…" /></div>
      </div>
      <div><label className="field-label">پیام تبریک</label><textarea name="message" rows={2} className="textarea w-full" placeholder="تولدت مبارک! یک اقامت رویایی هدیه من به تو…" /></div>
      <Alert state={state} />
      <button disabled={pending} className="btn btn-primary btn-block h-12">{pending ? <span className="loading loading-spinner loading-sm" /> : <Gift className="h-5 w-5" />} ادامه و پرداخت {formatPrice(amount)} تومان</button>
    </form>
  );
}

function goToGiftGateway(redirect: GatewayRedirect) {
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

export function GiftPayForm({ id, phone, amount, card, gateways }: { id: number; phone: string; amount: number; card: { number: string; holder: string; bank: string }; gateways: PaymentGatewayOption[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(payGiftCard, null);
  const [method, setMethod] = useState<"gateway" | "card">(gateways.length ? "gateway" : "card");
  const [provider, setProvider] = useState(gateways[0]?.id ?? "");
  useEffect(() => {
    if (state?.redirect) { try { goToGiftGateway(state.redirect); } catch { router.refresh(); } }
    else if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={id} /><input type="hidden" name="phone" value={phone} /><input type="hidden" name="method" value={method} /><input type="hidden" name="provider" value={provider} />
      <div className="grid grid-cols-2 gap-3">
        {([...(gateways.length ? [["gateway", "درگاه پرداخت", CreditCard] as const] : []), ["card", "کارت به کارت", Landmark] as const]).map(([k, l, I]) => (
          <button key={k} type="button" onClick={() => setMethod(k)} className={cn("btn h-auto flex-col gap-2 py-4", method === k ? "btn-primary btn-soft border-2 border-primary" : "btn-outline border-base-300")}><I className="h-6 w-6" />{l}</button>
        ))}
      </div>
      {method === "card" ? (
        <div className="space-y-2 rounded-box bg-base-200 p-4 text-sm">
          <div>{card.bank} · به نام {card.holder}</div>
          <div dir="ltr" className="font-mono text-lg font-bold">{faNum(card.number)}</div>
          <input name="ref" required dir="ltr" className="input w-full text-left" placeholder="شماره پیگیری واریز" />
        </div>
      ) : (
        <div className="space-y-2">{gateways.length ? <><label className="field-label">انتخاب درگاه</label><select value={provider} onChange={(e) => setProvider(e.target.value)} className="select w-full">{gateways.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}</select><p className="rounded-box bg-base-200 p-3 text-xs text-base-content/60">کارت پس از تأیید پرداخت توسط درگاه فعال می‌شود.</p></> : null}</div>
      )}
      <Alert state={state} />
      <button disabled={pending} className="btn btn-primary btn-block h-12">{pending && <span className="loading loading-spinner loading-sm" />} {method === "gateway" ? `پرداخت ${formatPrice(amount)} تومان` : "ثبت رسید برای بررسی"}</button>
    </form>
  );
}

export function GiftBalanceForm() {
  const [state, action, pending] = useActionState(checkGiftBalance, null);
  return (
    <form action={action} className="space-y-3">
      <div className="join w-full">
        <input name="code" required dir="ltr" placeholder="GC-XXXX-XXXX" className="input join-item w-full text-left font-mono uppercase" />
        <button disabled={pending} className="btn btn-primary join-item"><Search className="h-4 w-4" /> استعلام</button>
      </div>
      <Alert state={state} />
    </form>
  );
}

/* ---------------------------- table booking ---------------------------- */

const TIMES = Array.from({ length: 30 }, (_, i) => `${String(8 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);

export function TableBookingForm({ venueId, venueName }: { venueId: number; venueName: string }) {
  const [state, action, pending] = useActionState(bookTable, null);
  const [date, setDate] = useState(todayISO());
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <input type="hidden" name="venueId" value={venueId} />
      <h3 className="flex items-center gap-2 font-extrabold"><UtensilsCrossed className="h-5 w-5 text-primary" /> رزرو میز در {venueName}</h3>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2"><JalaliDatePicker name="date" label="تاریخ" value={date} min={todayISO()} onChange={setDate} /></div>
        <div><label className="field-label">ساعت</label><select name="time" defaultValue="20:00" className="select w-full">{TIMES.map((t) => <option key={t} value={t}>{faNum(t)}</option>)}</select></div>
        <div><label className="field-label">نفرات</label><input name="guests" type="number" min={1} max={40} defaultValue={2} className="input w-full" /></div>
        <input name="name" required placeholder="نام و نام خانوادگی" className="input col-span-2 w-full" />
        <input name="phone" required dir="ltr" placeholder="موبایل 09…" className="input col-span-2 w-full text-left" />
        <input name="notes" placeholder="توضیحات (مناسبت، صندلی کودک، …)" className="input col-span-2 w-full" />
      </div>
      <Alert state={state} />
      <button disabled={pending} className="btn btn-primary btn-block">{pending ? <span className="loading loading-spinner loading-sm" /> : <CalendarCheck className="h-4 w-4" />} ثبت درخواست رزرو میز</button>
    </form>
  );
}

/* ---------------------------- in-house guest portal ---------------------------- */

export function StayLoginForm() {
  const [state, action, pending] = useActionState(stayLogin, null);
  return (
    <form action={action} className="space-y-3">
      <div><label className="field-label">کد رزرو</label><input name="code" required dir="ltr" placeholder="ATL-1234-ABC" className="input w-full text-left font-mono uppercase" /></div>
      <div><label className="field-label">شماره موبایل رزرو</label><input name="phone" required dir="ltr" placeholder="09121234567" className="input w-full text-left" /></div>
      <Alert state={state} />
      <button disabled={pending} className="btn btn-primary btn-block h-12">{pending ? <span className="loading loading-spinner loading-sm" /> : <LogIn className="h-5 w-5" />} ورود به پرتال مهمانان</button>
    </form>
  );
}

const CATS: { key: string; label: string; Icon: typeof Wifi }[] = [
  { key: "housekeeping", label: "نظافت اتاق", Icon: Sparkles },
  { key: "room_service", label: "سفارش غذا", Icon: UtensilsCrossed },
  { key: "maintenance", label: "تعمیرات", Icon: Wrench },
  { key: "reception", label: "پذیرش", Icon: ConciergeBell },
  { key: "transfer", label: "تاکسی / ترانسفر", Icon: Car },
  { key: "extend", label: "تمدید اقامت", Icon: CalendarPlus },
  { key: "other", label: "سایر", Icon: MessageSquare },
];
const ST: Record<string, [string, string]> = { open: ["ارسال شد", "badge-ghost"], in_progress: ["در حال انجام", "badge-warning"], done: ["انجام شد", "badge-success"] };

type Thread = { id: number; category: string; status: string; updatedAt: string; messages: { id: number; sender: string; body: string; createdAt: string }[] };

export function StayPortal({ guest, room, wifi, reception, threads }: { guest: string; room: string; wifi: { name: string; password: string }; reception: { ext: string; phone: string }; threads: Thread[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(stayNewRequest, null);
  const [cat, setCat] = useState("housekeeping");
  const [reply, setReply] = useState<Record<number, string>>({});
  const [busy, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="tpl-card rounded-box bg-base-100 p-5 ring-1 ring-base-300"><BedDouble className="h-6 w-6 text-primary" /><div className="mt-2 text-xs text-base-content/55">اتاق شما</div><div className="font-black">{room}</div></div>
        {wifi.name && <div className="tpl-card rounded-box bg-base-100 p-5 ring-1 ring-base-300"><Wifi className="h-6 w-6 text-primary" /><div className="mt-2 text-xs text-base-content/55">Wi-Fi: <b dir="ltr">{wifi.name}</b></div><div dir="ltr" className="font-mono font-black">{wifi.password || "—"}</div></div>}
        <div className="tpl-card rounded-box bg-base-100 p-5 ring-1 ring-base-300"><Phone className="h-6 w-6 text-primary" /><div className="mt-2 text-xs text-base-content/55">پذیرش ۲۴ ساعته</div><div className="font-black">داخلی {faNum(reception.ext)} · <span dir="ltr">{faNum(reception.phone)}</span></div></div>
      </div>
      <form ref={formRef} action={action} className="tpl-card space-y-3 rounded-box bg-base-100 p-5 ring-1 ring-base-300">
        <h3 className="font-extrabold">{guest} عزیز، چه کمکی از ما ساخته است؟</h3>
        <input type="hidden" name="category" value={cat} />
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
          {CATS.map(({ key, label, Icon }) => (
            <button key={key} type="button" onClick={() => setCat(key)} className={cn("btn h-auto flex-col gap-1 py-3 text-xs", cat === key ? "btn-primary" : "btn-outline border-base-300")}><Icon className="h-5 w-5" />{label}</button>
          ))}
        </div>
        <textarea name="body" required rows={3} className="textarea w-full" placeholder="درخواست خود را بنویسید… (مثلاً دو حوله اضافه، تعویض ملحفه، رزرو تاکسی ساعت ۸ صبح)" />
        <Alert state={state} />
        <button disabled={pending} className="btn btn-primary">{pending ? <span className="loading loading-spinner loading-sm" /> : <Send className="h-4 w-4" />} ارسال به پذیرش</button>
      </form>
      {threads.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-extrabold">درخواست‌های من</h3>
          {threads.map((t) => (
            <div key={t.id} className="tpl-card rounded-box bg-base-100 p-4 ring-1 ring-base-300">
              <div className="mb-2 flex items-center justify-between"><b className="text-sm">{CATS.find((c) => c.key === t.category)?.label ?? "درخواست"}</b><span className={cn("badge badge-sm", ST[t.status]?.[1])}>{ST[t.status]?.[0]}</span></div>
              <div className="space-y-1">
                {t.messages.map((m) => (
                  <div key={m.id} className={cn("chat", m.sender === "guest" ? "chat-end" : "chat-start")}>
                    <div className={cn("chat-bubble text-sm", m.sender === "guest" ? "chat-bubble-primary" : "")}>{m.body}</div>
                    <div className="chat-footer text-[10px] opacity-60">{m.sender === "guest" ? "شما" : "پذیرش هتل"} · {relativeTime(m.createdAt)}</div>
                  </div>
                ))}
              </div>
              <div className="join mt-3 w-full">
                <input value={reply[t.id] ?? ""} onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))} placeholder="پاسخ…" className="input input-sm join-item w-full" />
                <button type="button" disabled={busy || !(reply[t.id] ?? "").trim()} onClick={() => start(async () => { await stayReply(t.id, reply[t.id] ?? ""); setReply((r) => ({ ...r, [t.id]: "" })); router.refresh(); })} className="btn btn-sm btn-primary join-item"><Send className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
