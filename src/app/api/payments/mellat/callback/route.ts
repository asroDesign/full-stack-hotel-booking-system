export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { findPaymentById, failPaymentAttempt, isValidPaymentCallbackToken, savePaymentCallbackData, verifyAndSettlePayment } from "@/lib/payment-service";
import { limitPaymentCallback, parsePaymentCallbackForm, redirectPaymentResult } from "@/lib/payment-callback";

const field = (form: FormData, key: string, max = 200) => { const value = form.get(key); return typeof value === "string" ? value.trim().slice(0, max) : ""; };

export async function POST(request: Request) {
  const limited = await limitPaymentCallback(request, "mellat");
  if (limited) return limited;
  const form = await parsePaymentCallbackForm(request);
  if (!form) return redirectPaymentResult(request, null, "failed");
  const rawOrderId = field(form, "SaleOrderId", 20);
  const saleOrderId = /^\d{1,10}$/.test(rawOrderId) ? Number(rawOrderId) : 0;
  const payment = saleOrderId ? await findPaymentById(saleOrderId, "mellat") : null;
  if (!payment || !(await isValidPaymentCallbackToken(payment.id, "mellat", new URL(request.url).searchParams.get("key") ?? ""))) return redirectPaymentResult(request, null, "failed");
  const responseCode = field(form, "ResCode", 20);
  const refId = field(form, "RefId", 100);
  const saleReferenceId = Number(field(form, "SaleReferenceId", 30));
  if (responseCode !== "0" || !refId || refId !== payment.authority || !Number.isSafeInteger(saleReferenceId) || saleReferenceId < 1) {
    await failPaymentAttempt(payment.id);
    return redirectPaymentResult(request, payment.id, "failed");
  }
  try {
    const data = { saleOrderId, saleReferenceId };
    await savePaymentCallbackData(payment.id, data);
    const result = await verifyAndSettlePayment(payment.id, "mellat", data);
    return redirectPaymentResult(request, payment.id, result.status === "needs_refund" ? "refund" : result.status);
  } catch (error) {
    console.error("[payments/mellat/callback] verification failed", error);
    return redirectPaymentResult(request, payment.id, "processing");
  }
}
