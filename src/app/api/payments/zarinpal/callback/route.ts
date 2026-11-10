import { findPaymentByAuthority, failPaymentAttempt, isValidPaymentCallbackToken, verifyAndSettlePayment } from "@/lib/payment-service";
import { limitPaymentCallback, redirectPaymentResult } from "@/lib/payment-callback";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const limited = await limitPaymentCallback(request, "zarinpal");
  if (limited) return limited;
  const url = new URL(request.url);
  const authority = (url.searchParams.get("Authority") ?? "").slice(0, 120);
  const status = (url.searchParams.get("Status") ?? "").slice(0, 20).toUpperCase();
  const payment = authority ? await findPaymentByAuthority(authority, "zarinpal") : null;
  if (!payment || !(await isValidPaymentCallbackToken(payment.id, "zarinpal", url.searchParams.get("key") ?? ""))) return redirectPaymentResult(request, null, "failed");
  if (status !== "OK") { await failPaymentAttempt(payment.id); return redirectPaymentResult(request, payment.id, "failed"); }
  try {
    const result = await verifyAndSettlePayment(payment.id, "zarinpal");
    return redirectPaymentResult(request, payment.id, result.status === "needs_refund" ? "refund" : result.status);
  } catch (error) {
    console.error("[payments/zarinpal/callback] verification failed", error);
    return redirectPaymentResult(request, payment.id, "processing");
  }
}
