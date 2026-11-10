export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { findPaymentByAuthority, failPaymentAttempt, isValidPaymentCallbackToken, verifyAndSettlePayment } from "@/lib/payment-service";
import { limitPaymentCallback, redirectPaymentResult } from "@/lib/payment-callback";

export async function GET(request: Request) {
  const limited = await limitPaymentCallback(request, "zibal");
  if (limited) return limited;
  const url = new URL(request.url);
  const trackId = (url.searchParams.get("trackId") ?? "").slice(0, 40);
  const payment = trackId ? await findPaymentByAuthority(trackId, "zibal") : null;
  const orderId = url.searchParams.get("orderId") ?? "";
  if (!payment || (orderId && orderId !== String(payment.id)) || !(await isValidPaymentCallbackToken(payment.id, "zibal", url.searchParams.get("key") ?? ""))) return redirectPaymentResult(request, null, "failed");
  if (url.searchParams.get("success") !== "1") { await failPaymentAttempt(payment.id); return redirectPaymentResult(request, payment.id, "failed"); }
  try {
    const result = await verifyAndSettlePayment(payment.id, "zibal");
    return redirectPaymentResult(request, payment.id, result.status === "needs_refund" ? "refund" : result.status);
  } catch (error) {
    console.error("[payments/zibal/callback] verification failed", error);
    return redirectPaymentResult(request, payment.id, "processing");
  }
}
