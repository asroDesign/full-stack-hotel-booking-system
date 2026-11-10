import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import type { SiteSettings as Settings } from "@/lib/data";

const PRIVATE_PAYMENT_FIELDS = ["zarinpalMerchantId", "zibalMerchant", "mellatUsername", "mellatPassword"] as const;

export function redactPaymentCredentials(settings: Settings): Settings {
  return { ...settings, zarinpalMerchantId: "", zibalMerchant: "", mellatUsername: "", mellatPassword: "" };
}

export function isPrivatePaymentField(field: string): boolean {
  return (PRIVATE_PAYMENT_FIELDS as readonly string[]).includes(field);
}

function encryptionKey() {
  const encoded = process.env.PAYMENT_CREDENTIALS_KEY?.trim();
  if (!encoded) throw new Error("برای ذخیره امن اطلاعات درگاه، PAYMENT_CREDENTIALS_KEY را تنظیم کنید.");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("PAYMENT_CREDENTIALS_KEY باید کلید ۳۲ بایتی Base64 باشد.");
  return key;
}

export function encryptPaymentCredential(value: string) {
  if (!value) return "";
  const key = encryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["enc", "v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function readPaymentCredential(value: string) {
  if (!value.startsWith("enc:v1:")) return value;
  const [, , ivText, tagText, encryptedText] = value.split(":");
  if (!ivText || !tagText || !encryptedText) throw new Error("اطلاعات درگاه رمزگذاری‌شده معتبر نیست.");
  const key = encryptionKey();
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivText, "base64url"));
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8");
  } catch {
    throw new Error("رمزگشایی اطلاعات درگاه انجام نشد؛ کلید PAYMENT_CREDENTIALS_KEY را بررسی کنید.");
  }
}

export function hasPaymentCredential(value: string) {
  if (!value.trim()) return false;
  try { return Boolean(readPaymentCredential(value).trim()); }
  catch { return false; }
}
