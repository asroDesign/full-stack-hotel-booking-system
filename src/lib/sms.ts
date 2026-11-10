import { db } from "@/db";
import { smsLogs, type Reservation } from "@/db/schema";
import { getSettingsFresh } from "./data";
import { faNum, formatJalali, isoToJalali } from "./utils";

/**
 * Pattern (template) based SMS via Kavenegar "verify/lookup" or sms.ir "send/verify".
 *
 * Kavenegar tokens used in every template:
 *   %token%   → main code (reservation code / tracking code)
 *   %token2%  → date (1404/05/12)
 *   %token3%  → guest mobile / amount
 *   %token10% → guest name           (spaces allowed)
 *   %token20% → room / service name  (spaces allowed)
 *
 * sms.ir template parameters (exact names, per template):
 *   admin reservation : #NAME# #ITEM# #DATE# #TRACKING# #PHONE#
 *   guest request     : #NAME# #TRACKING#
 *   guest confirmed   : #NAME# #CODE# #ITEM# #DATE#
 *   guest rejected    : #NAME# #TRACKING#
 */

export type SmsEvent = "admin_reservation" | "guest_request" | "guest_confirmed" | "guest_rejected" | "test";
export type TextEvent = "campaign" | "birthday" | "manual" | "review_invite" | "table" | "giftcard" | "guest_reply";

export type SmsParams = {
  code?: string;
  tracking?: string;
  name?: string;
  item?: string;
  date?: string;
  phone?: string;
  amount?: string;
};

const EVENT_LABEL: Record<SmsEvent, string> = {
  admin_reservation: "اطلاع رزرو به مدیر",
  guest_request: "ثبت درخواست (مهمان)",
  guest_confirmed: "تایید و کد رزرو (مهمان)",
  guest_rejected: "رد درخواست (مهمان)",
  test: "پیامک آزمایشی",
};
const TEXT_LABEL: Record<TextEvent, string> = {
  campaign: "کمپین تبلیغاتی",
  birthday: "تبریک تولد و کد تخفیف",
  manual: "ارسال دستی",
  review_invite: "دعوت به ثبت نظر",
  table: "رزرو میز رستوران",
  giftcard: "کارت هدیه",
  guest_reply: "پاسخ به مهمان ساکن",
};
export const smsEventLabel: Record<string, string> = { ...EVENT_LABEL, ...TEXT_LABEL };

const SMSIR_PARAMS: Record<SmsEvent, (keyof SmsParams)[]> = {
  admin_reservation: ["name", "item", "date", "tracking", "phone"],
  guest_request: ["name", "tracking"],
  guest_confirmed: ["name", "code", "item", "date"],
  guest_rejected: ["name", "tracking"],
  test: ["code"],
};

const noSpace = (s = "") => s.trim().replace(/\s+/g, "\u200c").slice(0, 100);
const limitSpaces = (s = "", max: number) => {
  const parts = s.trim().split(/\s+/);
  return parts.length - 1 <= max ? parts.join(" ") : parts.slice(0, max).join(" ") + "\u200c" + parts.slice(max).join("\u200c");
};

function normalizeMobile(m: string) {
  const d = m.replace(/[^\d]/g, "");
  if (d.startsWith("98") && d.length === 12) return "0" + d.slice(2);
  if (d.length === 10 && d.startsWith("9")) return "0" + d;
  return d;
}

async function log(receptor: string, event: SmsEvent | TextEvent, provider: string, status: string, response: string, campaignId?: number) {
  await db
    .insert(smsLogs)
    .values({ receptor, event, provider, status, response: response.slice(0, 500), campaignId: campaignId ?? null })
    .catch(() => {});
}

async function sendKavenegar(apiKey: string, template: string, receptor: string, p: SmsParams) {
  const body = new URLSearchParams({
    receptor,
    template,
    token: noSpace(p.code || p.tracking || "-"),
    token2: noSpace(p.date || "-"),
    token3: noSpace(p.phone || p.amount || "-"),
  });
  if (p.name) body.set("token10", limitSpaces(p.name, 4));
  if (p.item) body.set("token20", limitSpaces(p.item, 8));
  const res = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const text = await res.text();
  let ok = res.ok;
  try {
    ok = ok && JSON.parse(text)?.return?.status === 200;
  } catch {
    ok = false;
  }
  return { ok, text };
}

async function sendSmsIr(apiKey: string, templateId: string, receptor: string, event: SmsEvent, p: SmsParams) {
  const parameters = SMSIR_PARAMS[event].map((k) => ({ name: k.toUpperCase(), value: String(p[k] || "-").slice(0, 100) }));
  const res = await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain", "x-api-key": apiKey },
    body: JSON.stringify({ mobile: receptor, templateId: Number(templateId), parameters }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  const text = await res.text();
  let ok = res.ok;
  try {
    ok = ok && JSON.parse(text)?.status === 1;
  } catch {
    ok = false;
  }
  return { ok, text };
}

/** Send a pattern SMS. Never throws. */
export async function sendPattern(
  event: SmsEvent,
  receptor: string,
  params: SmsParams,
  templateOverride?: string,
): Promise<"sent" | "failed" | "disabled"> {
  const s = await getSettingsFresh();
  const provider = s.smsProvider;
  const to = normalizeMobile(receptor);
  const template =
    templateOverride ??
    {
      admin_reservation: s.smsTplAdminReservation,
      guest_request: s.smsTplGuestRequest,
      guest_confirmed: s.smsTplGuestConfirmed,
      guest_rejected: s.smsTplGuestRejected,
      test: s.smsTplGuestConfirmed,
    }[event];

  if (provider !== "kavenegar" && provider !== "smsir") {
    await log(to, event, "none", "disabled", "پنل پیامک فعال نیست");
    return "disabled";
  }
  if (!s.smsApiKey || !template) {
    await log(to, event, provider, "disabled", "کلید API یا قالب پیامک تنظیم نشده است");
    return "disabled";
  }
  if (!/^09\d{9}$/.test(to)) {
    await log(to, event, provider, "failed", "شماره موبایل نامعتبر");
    return "failed";
  }
  try {
    const r =
      provider === "kavenegar"
        ? await sendKavenegar(s.smsApiKey, template, to, params)
        : await sendSmsIr(s.smsApiKey, template, to, event, params);
    await log(to, event, provider, r.ok ? "sent" : "failed", r.text);
    return r.ok ? "sent" : "failed";
  } catch (e) {
    await log(to, event, provider, "failed", e instanceof Error ? e.message : "network error");
    return "failed";
  }
}

const jDate = (iso: string) => {
  const { jy, jm, jd } = isoToJalali(iso);
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
};

export function reservationParams(r: Reservation): SmsParams {
  return {
    code: r.reservationCode ?? "",
    tracking: r.trackingCode,
    name: r.guestName,
    item: r.itemName + (r.kind === "service" && r.timeSlot ? ` ${r.timeSlot}` : ""),
    date: jDate(r.checkIn),
    phone: r.phone,
    amount: String(r.depositAmount),
  };
}

/** Notify all admin mobiles about a reservation (on request and/or payment). */
export async function notifyAdmins(r: Reservation, stage: "request" | "paid") {
  const s = await getSettingsFresh();
  if (stage === "request" && s.smsNotifyAdminOnRequest !== "1") return;
  if (stage === "paid" && s.smsNotifyAdminOnPaid !== "1") return;
  const mobiles = s.smsAdminMobiles
    .split(/[,\s،]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 5);
  for (const m of mobiles) await sendPattern("admin_reservation", m, reservationParams(r));
}

export async function notifyGuest(r: Reservation, event: "guest_request" | "guest_confirmed" | "guest_rejected") {
  const s = await getSettingsFresh();
  if (event === "guest_request" && s.smsNotifyGuestOnRequest !== "1") return "disabled" as const;
  return sendPattern(event, r.phone, reservationParams(r));
}

export function describeReservation(r: Reservation) {
  return `${r.itemName} · ${formatJalali(r.checkIn)} · ${faNum(r.guests)} نفر`;
}

/* ------------------------------------------------------------------ */
/* Plain-text (non-pattern) sending: campaigns, birthday, manual, ...  */
/* Requires a dedicated sender line (settings → smsLineNumber).        */
/* ------------------------------------------------------------------ */

async function kavenegarSend(apiKey: string, sender: string, receptors: string[], message: string) {
  const body = new URLSearchParams({ receptor: receptors.join(","), message, sender });
  const res = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/sms/send.json`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const text = await res.text();
  let ok = res.ok;
  try {
    ok = ok && JSON.parse(text)?.return?.status === 200;
  } catch {
    ok = false;
  }
  return { ok, text };
}

async function smsIrBulk(apiKey: string, line: string, mobiles: string[], messageText: string) {
  const res = await fetch("https://api.sms.ir/v1/send/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/plain", "x-api-key": apiKey },
    body: JSON.stringify({ lineNumber: Number(line), messageText, mobiles, sendDateTime: null }),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const text = await res.text();
  let ok = res.ok;
  try {
    ok = ok && JSON.parse(text)?.status === 1;
  } catch {
    ok = false;
  }
  return { ok, text };
}

export type BulkResult = { sent: number; failed: number; disabled?: string };

/** Send the same text to many numbers (batched). Marketing messages get the opt-out suffix. */
export async function sendBulkText(
  numbers: string[],
  text: string,
  opts: { event: TextEvent; campaignId?: number; marketing?: boolean },
): Promise<BulkResult> {
  const s = await getSettingsFresh();
  const list = Array.from(new Set(numbers.map(normalizeMobile).filter((m) => /^09\d{9}$/.test(m))));
  if (!list.length) return { sent: 0, failed: 0 };
  const provider = s.smsProvider;
  const message = opts.marketing && s.smsOptOutSuffix ? `${text}\n${s.smsOptOutSuffix}` : text;
  const reason =
    provider !== "kavenegar" && provider !== "smsir" ? "پنل پیامک فعال نیست" : !s.smsApiKey ? "کلید API تنظیم نشده" : !s.smsLineNumber ? "شماره خط ارسال تنظیم نشده" : "";
  if (reason) {
    for (const m of list) await log(m, opts.event, provider || "none", "disabled", reason, opts.campaignId);
    return { sent: 0, failed: 0, disabled: reason };
  }
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100);
    try {
      const r = provider === "kavenegar" ? await kavenegarSend(s.smsApiKey, s.smsLineNumber, batch, message) : await smsIrBulk(s.smsApiKey, s.smsLineNumber, batch, message);
      for (const m of batch) await log(m, opts.event, provider, r.ok ? "sent" : "failed", r.ok ? "" : r.text, opts.campaignId);
      if (r.ok) sent += batch.length;
      else failed += batch.length;
    } catch (e) {
      failed += batch.length;
      for (const m of batch) await log(m, opts.event, provider, "failed", e instanceof Error ? e.message : "network error", opts.campaignId);
    }
  }
  return { sent, failed };
}

export async function sendText(to: string, text: string, opts: { event: TextEvent; campaignId?: number; marketing?: boolean }) {
  return sendBulkText([to], text, opts);
}

/** Remaining credit of the SMS panel (for the SMS center). */
export async function getSmsCredit(): Promise<{ ok: boolean; text: string }> {
  const s = await getSettingsFresh();
  if (!s.smsApiKey || (s.smsProvider !== "kavenegar" && s.smsProvider !== "smsir")) return { ok: false, text: "پنل پیامک تنظیم نشده" };
  try {
    if (s.smsProvider === "kavenegar") {
      const r = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(s.smsApiKey)}/account/info.json`, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
      const j = await r.json();
      const rial = Number(j?.entries?.remaincredit);
      return Number.isFinite(rial) ? { ok: true, text: `${faNum(Math.floor(rial / 10).toLocaleString("en-US"))} تومان` } : { ok: false, text: "دریافت اعتبار ناموفق بود" };
    }
    const r = await fetch("https://api.sms.ir/v1/credit", { headers: { "x-api-key": s.smsApiKey, Accept: "text/plain" }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
    const j = await r.json();
    return j?.status === 1 ? { ok: true, text: `${faNum(Number(j.data).toLocaleString("en-US"))} واحد` } : { ok: false, text: j?.message || "دریافت اعتبار ناموفق بود" };
  } catch {
    return { ok: false, text: "ارتباط با پنل پیامک برقرار نشد" };
  }
}
