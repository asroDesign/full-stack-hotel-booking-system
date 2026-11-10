import type { Settings } from "@/db/schema";
import { hasPaymentCredential } from "@/lib/payment-settings";

export type PaymentGatewayId = "zarinpal" | "zibal" | "saman" | "mellat";
export type PaymentGatewayOption = { id: PaymentGatewayId; label: string };

export function getPaymentGatewayOptions(settings: Settings): PaymentGatewayOption[] {
  const options: PaymentGatewayOption[] = [];
  if (settings.paymentZarinpalEnabled && (hasPaymentCredential(settings.zarinpalMerchantId) || process.env.ZARINPAL_MERCHANT_ID?.trim())) options.push({ id: "zarinpal", label: "زرین‌پال" });
  if (settings.paymentZibalEnabled && (hasPaymentCredential(settings.zibalMerchant) || process.env.ZIBAL_MERCHANT?.trim())) options.push({ id: "zibal", label: "زیبال" });
  if (settings.paymentSamanEnabled && settings.samanTerminalId.trim()) options.push({ id: "saman", label: "سامان" });
  if (settings.paymentMellatEnabled && settings.mellatTerminalId.trim() && hasPaymentCredential(settings.mellatUsername) && hasPaymentCredential(settings.mellatPassword)) options.push({ id: "mellat", label: "به‌پرداخت ملت" });
  return options;
}
