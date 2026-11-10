export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { findPaymentByAuthority, failPaymentAttempt, isValidPaymentCallbackToken, verifyAndSettlePayment } from "@/lib/payment-service";
import { limitPaymentCallback, redirectPaymentResult } from "@/lib/payment-callback";

export async function GET(request: Request) {
  const limited = limitPaymentCallback(request, "zibal");
  if (limited) return limited;
  const url = new URL(request.url);
  const trackId = (url.searchParams.get("trackId") ?? "").slice(0, 40);
  const succeeded = url.searchParams.get("success") === "1";
  const key = url.searchParams.get("key") ?? "";
  const payment = trackId ? await findPaymentByAuthority(trackId, "zibal") : null;
  if (!payment || !(await isValidPaymentCallbackToken(payment.id, "zibal", key))) return redirectPaymentResult(request, null, "failed");
  if (!succeeded) {
    await failPaymentAttempt(payment.id);
    return redirectPaymentResult(request, payment.id, "failed");
  }
  try {
    const result = await verifyAndSettlePayment(payment.id, "zibal");
    return redirectPaymentResult(request, payment.id, result.status === "needs_refund" ? "refund" : result.status);
  } catch (error) {
    console.error("[payments/zibal/callback] verification failed", error);
    return redirectPaymentResult(request, payment.id, "processing");
  }
}
