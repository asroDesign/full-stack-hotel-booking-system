export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { findPaymentById, failPaymentAttempt, isValidPaymentCallbackToken, savePaymentCallbackData, verifyAndSettlePayment } from "@/lib/payment-service";
import { limitPaymentCallback, parsePaymentCallbackForm, redirectPaymentResult } from "@/lib/payment-callback";

function field(form: FormData, key: string, max = 200) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const limited = limitPaymentCallback(request, "saman");
  if (limited) return limited;
  const form = await parsePaymentCallbackForm(request);
  if (!form) return redirectPaymentResult(request, null, "failed");
  const resNum = field(form, "ResNum", 20);
  const id = /^\d{1,10}$/.test(resNum) ? Number(resNum) : 0;
  const payment = id ? await findPaymentById(id, "saman") : null;
  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!payment || !(await isValidPaymentCallbackToken(payment.id, "saman", key))) return redirectPaymentResult(request, null, "failed");
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
    await savePaymentCallbackData(payment.id, { refNum, terminalId, amount });
    const result = await verifyAndSettlePayment(payment.id, "saman", { refNum, terminalId, amount });
    return redirectPaymentResult(request, payment.id, result.status === "needs_refund" ? "refund" : result.status);
  } catch (error) {
    console.error("[payments/saman/callback] verification failed", error);
    return redirectPaymentResult(request, payment.id, "processing");
  }
}
