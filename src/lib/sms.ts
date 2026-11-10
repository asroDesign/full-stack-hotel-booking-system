import { db } from "@/db";
import { smsLogs, type Booking } from "@/db/schema";
import { normalizePhone, toEnDigits } from "@/lib/format";
import { sanitizeText } from "@/lib/security";

type PatternKey = "admin_new_booking" | "guest_reservation" | "guest_status";
type SmsParam = { name: string; value: string };

const KAVENEGAR_PATTERN_ENV: Record<PatternKey, string> = {
  admin_new_booking: "KAVENEGAR_PATTERN_ADMIN_BOOKING",
  guest_reservation: "KAVENEGAR_PATTERN_GUEST_RESERVATION",
  guest_status: "KAVENEGAR_PATTERN_GUEST_STATUS",
};

const SMSIR_TEMPLATE_ENV: Record<PatternKey, string> = {
  admin_new_booking: "SMSIR_TEMPLATE_ADMIN_BOOKING",
  guest_reservation: "SMSIR_TEMPLATE_GUEST_RESERVATION",
  guest_status: "SMSIR_TEMPLATE_GUEST_STATUS",
};

export type SmsProvider = "kavenegar" | "smsir";

export function smsProvider(): SmsProvider {
  return (process.env.SMS_PROVIDER ?? "kavenegar").trim().toLowerCase() === "smsir" ? "smsir" : "kavenegar";
}

export function smsConfigured(): boolean {
  if (smsProvider() === "smsir") return Boolean(process.env.SMSIR_API_KEY);
  return Boolean(process.env.KAVENEGAR_API_KEY);
}

function patternFor(provider: SmsProvider, key: PatternKey): string {
  return provider === "smsir" ? process.env[SMSIR_TEMPLATE_ENV[key]] ?? "" : process.env[KAVENEGAR_PATTERN_ENV[key]] ?? "";
}

function tokenize(params: SmsParam[]): Record<string, string> {
  const map: Record<string, string> = {};
  params.forEach((param, index) => {
    map[`token${index === 0 ? "" : index + 1}`] = sanitizeText(param.value, 120).replace(/[\r\n]/g, " ");
  });
  return map;
}

async function deliver(input: {
  receptor: string;
  patternKey: PatternKey;
  params: SmsParam[];
  context?: string;
}): Promise<{ ok: boolean; status: string; response: string }> {
  const provider = smsProvider();
  const apiKey = provider === "smsir" ? process.env.SMSIR_API_KEY : process.env.KAVENEGAR_API_KEY;
  const template = patternFor(provider, input.patternKey);
  const receptor = normalizePhone(toEnDigits(input.receptor));

  if (!apiKey || !template) {
    return { ok: false, status: "not_configured", response: "کلید API یا شناسه پترن تنظیم نشده است." };
  }
  if (!/^0\d{10}$/.test(receptor)) {
    return { ok: false, status: "invalid_receptor", response: "شماره گیرنده نامعتبر است." };
  }

  try {
    let response: Response;
    if (provider === "smsir") {
      response = await fetch("https://api.sms.ir/v1/send/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          mobile: receptor.replace(/^0/, ""),
          templateId: Number(template),
          parameters: input.params.map((param, index) => ({
            name: param.name || `param${index + 1}`,
            value: sanitizeText(param.value, 200),
          })),
        }),
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
    } else {
      const tokens = tokenize(input.params);
      const search = new URLSearchParams({
        receptor,
        template,
        ...tokens,
      });
      response = await fetch(`https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}/verify/lookup.json`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: search.toString(),
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
    }
    const text = await response.text();
    const ok = response.ok;
    return { ok, status: ok ? "sent" : "failed", response: text.slice(0, 800) };
  } catch (error) {
    return { ok: false, status: "failed", response: error instanceof Error ? error.message : "network error" };
  }
}

export async function sendPatternSms(input: {
  receptor: string;
  patternKey: PatternKey;
  params: SmsParam[];
  context?: string;
}): Promise<{ ok: boolean; status: string }> {
  const provider = smsProvider();
  let result: { ok: boolean; status: string; response: string };
  try {
    result = await deliver(input);
  } catch (error) {
    result = { ok: false, status: "failed", response: error instanceof Error ? error.message : "unknown" };
  }
  try {
    await db.insert(smsLogs).values({
      provider,
      pattern: patternFor(provider, input.patternKey) || input.patternKey,
      receptor: sanitizeText(input.receptor, 20),
      status: result.status,
      context: sanitizeText(input.context ?? input.patternKey, 120),
      params: Object.fromEntries(input.params.map((param) => [param.name || "value", sanitizeText(param.value, 200)])),
      response: result.response,
    });
  } catch (error) {
    console.error("[sms] log insert failed", error);
  }
  return { ok: result.ok, status: result.status };
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: "تأیید شد",
  rejected: "رد شد",
  cancelled: "لغو شد",
  awaiting_review: "در حال بررسی",
  pending_payment: "در انتظار پیش‌پرداخت",
};

export async function notifyAdminNewBooking(booking: Booking): Promise<void> {
  const adminPhone = process.env.ADMIN_SMS_PHONE ?? process.env.ADMIN_PHONE ?? "";
  if (!adminPhone) return;
  await sendPatternSms({
    receptor: adminPhone,
    patternKey: "admin_new_booking",
    context: `booking-${booking.id}`,
    params: [
      { name: "name", value: booking.guestName },
      { name: "service", value: booking.serviceLabel || "اقامت" },
      { name: "date", value: booking.checkIn },
      { name: "code", value: booking.trackingCode },
    ],
  });
}

export async function notifyGuestReservation(booking: Booking): Promise<void> {
  await sendPatternSms({
    receptor: booking.phone,
    patternKey: "guest_reservation",
    context: `booking-${booking.id}`,
    params: [
      { name: "name", value: booking.guestName },
      { name: "code", value: booking.reservationCode ?? booking.trackingCode },
      { name: "date", value: booking.checkIn },
    ],
  });
}

export async function notifyGuestStatus(booking: Booking): Promise<void> {
  await sendPatternSms({
    receptor: booking.phone,
    patternKey: "guest_status",
    context: `booking-${booking.id}-${booking.status}`,
    params: [
      { name: "name", value: booking.guestName },
      { name: "status", value: STATUS_LABEL[booking.status] ?? booking.status },
      { name: "code", value: booking.reservationCode ?? booking.trackingCode },
    ],
  });
}
