export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { findPaymentById, failPaymentAttempt, isValidPaymentCallbackToken, savePaymentCallbackData, verifyAndSettlePayment } from "@/lib/payment-service";
import { limitPaymentCallback, parsePaymentCallbackForm, redirectPaymentResult } from "@/lib/payment-callback";

const field = (form: FormData, key: string, max = 200) => { const value = form.get(key); return typeof value === "string" ? value.trim().slice(0, max) : ""; };

export async function POST(request: Request) {
  const limited = await limitPaymentCallback(request, "saman");
  if (limited) return limited;
  const form = await parsePaymentCallbackForm(request);
  if (!form) return redirectPaymentResult(request, null, "failed");
  const rawId = field(form, "ResNum", 20);
  const id = /^\d{1,10}$/.test(rawId) ? Number(rawId) : 0;
  const payment = id ? await findPaymentById(id, "saman") : null;
  if (!payment || !(await isValidPaymentCallbackToken(payment.id, "saman", new URL(request.url).searchParams.get("key") ?? ""))) return redirectPaymentResult(request, null, "failed");
  const state = field(form, "State", 20).toUpperCase();
  const refNum = field(form, "RefNum", 200);
  const terminalId = field(form, "TerminalId", 40) || field(form, "MID", 40);
  const rawAmount = field(form, "Amount", 30);
  const amount = rawAmount ? Number(rawAmount) : undefined;
  if (state !== "OK" || !refNum || (amount !== undefined && !Number.isSafeInteger(amount))) {
    await failPaymentAttempt(payment.id);
    return redirectPaymentResult(request, payment.id, "failed");
  }
  try {
    const data = { refNum, terminalId, amount };
    await savePaymentCallbackData(payment.id, data);
    const result = await verifyAndSettlePayment(payment.id, "saman", data);
    return redirectPaymentResult(request, payment.id, result.status === "needs_refund" ? "refund" : result.status);
  } catch (error) {
    console.error("[payments/saman/callback] verification failed", error);
    return redirectPaymentResult(request, payment.id, "processing");
  }
}
