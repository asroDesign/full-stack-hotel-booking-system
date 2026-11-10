import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, paymentTransactions } from "@/db/schema";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { getPaymentAppOrigin } from "@/lib/payment-providers";

export type PaymentReturnStatus = "success" | "processing" | "failed" | "refund";

export function limitPaymentCallback(request: Request, provider: string) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (request.method === "POST" && length > 16 * 1024) {
    return new Response("درخواست بیش از حد بزرگ است.", { status: 413 });
  }
  const limited = rateLimit(`payment-callback:${provider}:${clientIp(request)}`, 30, 60_000);
  return limited.ok ? null : tooManyRequests(limited.retryAfter);
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
      if (size > 16 * 1024) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const fields = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    const form = new FormData();
    fields.forEach((value, key) => form.set(key, value));
    return form;
  } catch {
    return null;
  }
}

export async function redirectPaymentResult(_request: Request, paymentId: number | null, result: PaymentReturnStatus) {
  const [payment] = paymentId ? await db.select({ bookingId: paymentTransactions.bookingId }).from(paymentTransactions).where(eq(paymentTransactions.id, paymentId)).limit(1) : [];
  const [booking] = payment?.bookingId ? await db.select({ trackingCode: bookings.trackingCode }).from(bookings).where(eq(bookings.id, payment.bookingId)).limit(1) : [];
  const path = booking?.trackingCode ? `/booking/${encodeURIComponent(booking.trackingCode)}` : "/booking";
  let origin: string;
  try { origin = getPaymentAppOrigin(); }
  catch { return NextResponse.json({ error: "دامنهٔ HTTPS سایت تنظیم نشده است." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
  const url = new URL(path, origin);
  url.searchParams.set("payment", result);
  return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
