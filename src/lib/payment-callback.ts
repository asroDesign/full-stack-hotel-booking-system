import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { giftCards, paymentTransactions, reservations } from "@/db/schema";
import { clientIp } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { getPaymentAppOrigin } from "@/lib/payment-providers";
import { grantPublicAccess } from "@/lib/public-access";
import type { PaymentReturnStatus } from "./payment-callback-types";

export async function limitPaymentCallback(request: Request, provider: string) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (request.method === "POST" && length > 16 * 1024) return new Response("درخواست بیش از حد بزرگ است.", { status: 413 });
  const limited = await rateLimit(`payment-callback:${provider}:${await clientIp()}`, 30, 60);
  return limited.ok ? null : NextResponse.json({ error: "درخواست‌های بازگشت درگاه بیش از حد مجاز است." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
}

export async function parsePaymentCallbackForm(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/x-www-form-urlencoded\b/i.test(contentType)) return null;
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > 16 * 1024) return null;
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16 * 1024) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const fields = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    const form = new FormData();
    fields.forEach((value, key) => form.set(key, value));
    return form;
  } catch { return null; }
}

export async function redirectPaymentResult(_request: Request, paymentId: number | null, result: PaymentReturnStatus) {
  const [payment] = paymentId ? await db.select().from(paymentTransactions).where(eq(paymentTransactions.id, paymentId)).limit(1) : [];
  let path = "/track";
  const params = new URLSearchParams({ payment: result });
  if (payment?.reservationId) {
    const [reservation] = await db.select({ trackingCode: reservations.trackingCode, phone: reservations.phone }).from(reservations).where(eq(reservations.id, payment.reservationId)).limit(1);
    if (reservation) { await grantPublicAccess("reservation", reservation.trackingCode, reservation.phone); path = `/track/${encodeURIComponent(reservation.trackingCode)}`; }
  } else if (payment?.giftCardId) {
    const [gift] = await db.select({ id: giftCards.id, purchaserPhone: giftCards.purchaserPhone }).from(giftCards).where(eq(giftCards.id, payment.giftCardId)).limit(1);
    if (gift) { await grantPublicAccess("gift", gift.id, gift.purchaserPhone); path = `/gift-cards/order/${gift.id}`; }
  }
  let origin: string;
  try { origin = getPaymentAppOrigin(); }
  catch { return NextResponse.json({ error: "دامنهٔ HTTPS سایت تنظیم نشده است." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  const url = new URL(path, origin);
  url.search = params.toString();
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
