import type { SiteSettings as Settings } from "@/lib/data";
import type { PaymentGatewayId } from "@/lib/payment-gateways";
import { readPaymentCredential } from "@/lib/payment-settings";

const SEP_TOKEN_URL = "https://sep.shaparak.ir/onlinepg/onlinepg";
const SEP_PAYMENT_URL = "https://sep.shaparak.ir/OnlinePG/OnlinePG";
const SEP_VERIFY_URL = "https://sep.shaparak.ir/verifyTxnRandomSessionkey/ipg/VerifyTransaction";
const MELLAT_SERVICE_URL = "https://bpm.shaparak.ir/pgwchannel/services/pgw";
const MELLAT_PAYMENT_URL = "https://bpm.shaparak.ir/pgwchannel/startpay.mellat";
const MELLAT_NS = "http://interfaces.core.sw.bps.com/";

export type GatewayRedirect = { url: string; redirectMethod?: "POST"; redirectFields?: Record<string, string> };

export function getPaymentAppOrigin() {
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!configured) throw new Error("آدرس عمومی سایت تنظیم نشده است؛ APP_URL را روی دامنهٔ HTTPS قرار دهید.");
  const value = configured.includes("://") ? configured : `https://${configured}`;
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("آدرس عمومی سایت باید یک دامنهٔ HTTPS معتبر باشد.");
  return url.origin;
}

async function readLimitedResponse(response: Response, maxBytes: number, provider: string) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error(`پاسخ ${provider} بیش از حد بزرگ است.`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(15_000),
  });
  const text = await readLimitedResponse(response, 64_000, "درگاه");
  if (!response.ok) throw new Error(`سرویس درگاه پاسخ HTTP ${response.status} داد.`);
  try { return JSON.parse(text) as T; }
  catch { throw new Error("پاسخ درگاه قابل خواندن نیست."); }
}

function callbackUrl(origin: string, path: string) {
  const url = new URL(path, origin);
  if (url.protocol !== "https:" || url.username || url.password) throw new Error("برای پرداخت واقعی، دامنهٔ عمومی HTTPS لازم است.");
  return url.toString();
}

function rialAmount(amountToman: number) {
  const amount = amountToman * 10;
  if (!Number.isSafeInteger(amount) || amount < 1) throw new Error("مبلغ پرداخت معتبر نیست.");
  return amount;
}

function zarinpalHost(settings: Settings) {
  return settings.zarinpalSandbox === "1" ? "https://sandbox.zarinpal.com" : "https://payment.zarinpal.com";
}

function zarinpalMerchant(settings: Settings) {
  return readPaymentCredential(settings.zarinpalMerchantId).trim() || process.env.ZARINPAL_MERCHANT_ID?.trim() || "";
}

function zibalMerchant(settings: Settings) {
  return readPaymentCredential(settings.zibalMerchant).trim() || process.env.ZIBAL_MERCHANT?.trim() || "";
}

function xml(value: string | number) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function decodeXml(value: string) {
  return value.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
}

async function mellatSoap(settings: Settings, method: string, values: Record<string, string | number>) {
  const username = readPaymentCredential(settings.mellatUsername).trim();
  const password = readPaymentCredential(settings.mellatPassword);
  if (!/^\d{1,15}$/.test(settings.mellatTerminalId.trim()) || !username || !password) throw new Error("اطلاعات پایانهٔ به‌پرداخت ملت کامل نیست.");
  const entries = Object.entries({ terminalId: settings.mellatTerminalId.trim(), userName: username, userPassword: password, ...values });
  const args = entries.map(([key, value]) => `<ns:${key}>${xml(value)}</ns:${key}>`).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ns="${MELLAT_NS}"><soap:Header/><soap:Body><ns:${method}>${args}</ns:${method}></soap:Body></soap:Envelope>`;
  const response = await fetch(MELLAT_SERVICE_URL, {
    method: "POST",
    headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""', Accept: "text/xml" },
    body,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await readLimitedResponse(response, 128_000, "به‌پرداخت");
  if (!response.ok) throw new Error(`سرویس به‌پرداخت پاسخ HTTP ${response.status} داد.`);
  const fault = /<(?:\w+:)?faultstring[^>]*>([\s\S]*?)<\/(?:\w+:)?faultstring>/i.exec(text);
  if (fault) throw new Error(`خطای سرویس به‌پرداخت: ${decodeXml(fault[1].replace(/<[^>]+>/g, "").trim()).slice(0, 200)}`);
  const result = /<(?:\w+:)?return(?:\s[^>]*)?>([\s\S]*?)<\/(?:\w+:)?return>/i.exec(text);
  if (!result) throw new Error("پاسخ سرویس به‌پرداخت قابل خواندن نیست.");
  return decodeXml(result[1].replace(/<[^>]+>/g, "").trim());
}

function mellatDateTime() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (key: string) => parts.find((part) => part.type === key)?.value ?? "00";
  return { date: `${get("year")}${get("month")}${get("day")}`, time: `${get("hour")}${get("minute")}${get("second")}` };
}

export async function createGatewayPayment(provider: PaymentGatewayId, settings: Settings, input: {
  paymentId: number;
  amountToman: number;
  callbackToken: string;
  origin: string;
  trackingCode: string;
  description?: string;
  phone: string;
  email: string | null;
}): Promise<GatewayRedirect & { authority: string }> {
  const amount = rialAmount(input.amountToman);
  const callback = (path: string) => callbackUrl(input.origin, `${path}?key=${encodeURIComponent(input.callbackToken)}`);
  if (provider === "zarinpal") {
    const merchantId = zarinpalMerchant(settings);
    if (!merchantId) throw new Error("شناسه پذیرنده زرین‌پال در تنظیمات وارد نشده است.");
    const host = zarinpalHost(settings);
    const result = await postJson<{ data?: { code?: number; authority?: string }; errors?: { code?: number; message?: string } }>(`${host}/pg/v4/payment/request.json`, {
      merchant_id: merchantId,
      amount,
      callback_url: callback("/api/payments/zarinpal/callback"),
      description: (input.description ?? `پیش‌پرداخت رزرو ${input.trackingCode}`).slice(0, 250),
      metadata: { mobile: input.phone, ...(input.email ? { email: input.email } : {}), order_id: String(input.paymentId) },
    });
    if (result.data?.code !== 100 || !result.data.authority) throw new Error(`ساخت تراکنش زرین‌پال ناموفق بود${result.errors?.code ? ` (${result.errors.code})` : ""}.`);
    return { authority: result.data.authority, url: `${host}/pg/StartPay/${encodeURIComponent(result.data.authority)}` };
  }

  if (provider === "zibal") {
    const merchant = zibalMerchant(settings);
    if (!merchant) throw new Error("شناسه مرچنت زیبال در تنظیمات وارد نشده است.");
    const result = await postJson<{ result?: number; message?: string; trackId?: number }>("https://gateway.zibal.ir/v1/request", {
      merchant,
      amount,
      callbackUrl: callback("/api/payments/zibal/callback"),
      description: (input.description ?? `پیش‌پرداخت رزرو ${input.trackingCode}`).slice(0, 250),
      mobile: input.phone,
      orderId: String(input.paymentId),
    });
    if (result.result !== 100 || !result.trackId) throw new Error(`ساخت تراکنش زیبال ناموفق بود${result.message ? `: ${result.message.slice(0, 160)}` : ""}.`);
    return { authority: String(result.trackId), url: `https://gateway.zibal.ir/start/${result.trackId}` };
  }

  if (provider === "saman") {
    const terminalId = settings.samanTerminalId.trim();
    if (!/^\d{1,15}$/.test(terminalId) || !Number.isSafeInteger(Number(terminalId))) throw new Error("شناسه پایانه سامان معتبر نیست.");
    const result = await postJson<{ status?: number; token?: string; errorCode?: number | string; errorDesc?: string }>(SEP_TOKEN_URL, {
      action: "token",
      TerminalId: terminalId,
      Amount: amount,
      ResNum: String(input.paymentId),
      RedirectUrl: callback("/api/payments/saman/callback"),
      ...(input.phone ? { CellNumber: input.phone } : {}),
    });
    const token = String(result.token ?? "");
    if (Number(result.status) !== 1 || !token || token.length > 512 || /[\u0000-\u001f\u007f]/.test(token)) throw new Error(String(result.errorDesc || `ساخت تراکنش سامان ناموفق بود (${result.errorCode ?? "خطا"}).`).slice(0, 250));
    return { authority: token, url: SEP_PAYMENT_URL, redirectMethod: "POST", redirectFields: { Token: token } };
  }

  const paymentId = input.paymentId;
  if (!Number.isSafeInteger(paymentId) || paymentId < 1 || paymentId > 9_999_999_999) throw new Error("شماره تراکنش برای به‌پرداخت معتبر نیست.");
  const { date, time } = mellatDateTime();
  const result = await mellatSoap(settings, "bpPayRequest", {
    orderId: paymentId,
    amount,
    localDate: date,
    localTime: time,
    additionalData: (input.description ?? `پیش‌پرداخت رزرو ${input.trackingCode}`).slice(0, 500),
    callBackUrl: callback("/api/payments/mellat/callback"),
    payerId: 0,
  });
  const [code, refId] = result.split(",").map((item) => item.trim());
  if (code !== "0" || !refId || !/^[A-Za-z0-9]+$/.test(refId)) throw new Error(`ساخت تراکنش به‌پرداخت ناموفق بود${code ? ` (کد ${code})` : ""}.`);
  return { authority: refId, url: `${MELLAT_PAYMENT_URL}?RefId=${encodeURIComponent(refId)}` };
}

export async function verifyGatewayPayment(provider: PaymentGatewayId, settings: Settings, input: {
  paymentId: number;
  amountToman: number;
  authority: string;
  callback?: { refNum?: string; terminalId?: string; amount?: number; saleOrderId?: number; saleReferenceId?: number };
}): Promise<string> {
  const expectedAmount = rialAmount(input.amountToman);
  if (provider === "zarinpal") {
    const merchantId = zarinpalMerchant(settings);
    const result = await postJson<{ data?: { code?: number; ref_id?: number | string }; errors?: { code?: number } }>(`${zarinpalHost(settings)}/pg/v4/payment/verify.json`, {
      merchant_id: merchantId,
      amount: expectedAmount,
      authority: input.authority,
    });
    const code = result.data?.code ?? result.errors?.code ?? 0;
    if (![100, 101].includes(code)) throw new Error(`تأیید پرداخت زرین‌پال ناموفق بود (${code}).`);
    return String(result.data?.ref_id ?? input.authority);
  }

  if (provider === "zibal") {
    const merchant = zibalMerchant(settings);
    const trackId = Number(input.authority);
    if (!Number.isSafeInteger(trackId) || trackId < 1) throw new Error("شناسه تراکنش زیبال معتبر نیست.");
    const result = await postJson<{ result?: number; message?: string; status?: number; amount?: number; refNumber?: string | number }>("https://gateway.zibal.ir/v1/verify", { merchant, trackId });
    if (![100, 201].includes(Number(result.result)) || Number(result.status) !== 1 || Number(result.amount) !== expectedAmount) throw new Error(result.message || "مبلغ یا نتیجهٔ پرداخت زیبال تأیید نشد.");
    return String(result.refNumber ?? input.authority);
  }

  if (provider === "saman") {
    const callback = input.callback;
    const terminalId = settings.samanTerminalId.trim();
    if (!callback?.refNum || !/^\d{1,15}$/.test(terminalId) || callback.terminalId !== terminalId) throw new Error("اطلاعات بازگشت سامان معتبر نیست.");
    if (callback.amount !== undefined && callback.amount !== expectedAmount) throw new Error("مبلغ بازگشت سامان با رزرو مطابقت ندارد.");
    const result = await postJson<{
      Success?: boolean;
      ResultCode?: number;
      ResultDescription?: string;
      TransactionDetail?: Record<string, unknown>;
    }>(SEP_VERIFY_URL, { RefNum: callback.refNum, TerminalNumber: Number(terminalId) });
    const detail = result.TransactionDetail;
    if (result.Success !== true || Number(result.ResultCode) !== 0 || !detail) throw new Error(String(result.ResultDescription || "تأیید پرداخت سامان ناموفق بود.").slice(0, 250));
    const verifiedAmount = Number(detail.OriginalAmount ?? detail.OrginalAmount ?? detail.Amount);
    if (!Number.isSafeInteger(verifiedAmount) || verifiedAmount !== expectedAmount || String(detail.ResNum ?? "") !== String(input.paymentId)) throw new Error("مبلغ یا شمارهٔ سفارش تأییدشدهٔ سامان مطابقت ندارد.");
    if (detail.RefNum && String(detail.RefNum) !== callback.refNum) throw new Error("رسید تأییدشدهٔ سامان با تراکنش مطابقت ندارد.");
    return String(detail.RRN ?? detail.Rrn ?? detail.TraceNo ?? detail.TraceNumber ?? callback.refNum);
  }

  const callback = input.callback;
  if (!callback || callback.saleOrderId !== input.paymentId || !callback.saleReferenceId || input.authority.length < 1) throw new Error("اطلاعات بازگشت به‌پرداخت معتبر نیست.");
  const keys = { orderId: input.paymentId, saleOrderId: callback.saleOrderId, saleReferenceId: callback.saleReferenceId };
  const verifyCode = await mellatSoap(settings, "bpVerifyRequest", keys);
  if (verifyCode !== "0") {
    const inquiry = await mellatSoap(settings, "bpInquiryRequest", keys);
    if (inquiry !== "0") throw new Error(`تأیید تراکنش به‌پرداخت ناموفق بود (کد ${verifyCode}).`);
  }
  const settleCode = await mellatSoap(settings, "bpSettleRequest", keys);
  if (settleCode !== "0") {
    const inquiry = await mellatSoap(settings, "bpInquiryRequest", keys);
    if (inquiry !== "0") throw new Error(`تسویهٔ تراکنش به‌پرداخت ناموفق بود (کد ${settleCode}).`);
  }
  return String(callback.saleReferenceId);
}
