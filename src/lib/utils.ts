import * as jalaali from "jalaali-js";
import { safeUrl } from "./sanitize";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const faDigits = "۰۱۲۳۴۵۶۷۸۹";
export function faNum(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return "";
  return String(input).replace(/[0-9]/g, (d) => faDigits[Number(d)]);
}

export function toEnDigits(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function formatPrice(amount: number): string {
  return faNum(amount.toLocaleString("en-US")).replace(/,/g, "٬");
}

export const jMonths = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const weekDays = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISO(): string {
  const now = new Date();
  const local = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return toISODate(local);
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function diffDays(fromISO: string, toISO: string): number {
  return Math.round(
    (parseISODate(toISO).getTime() - parseISODate(fromISO).getTime()) / 86400000,
  );
}

export function isoToJalali(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return jalaali.toJalaali(y, m, d);
}

export function jalaliToISO(jy: number, jm: number, jd: number): string {
  const g = jalaali.toGregorian(jy, jm, jd);
  return `${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`;
}

export function formatJalali(iso: string | null | undefined, withWeekday = false): string {
  if (!iso) return "—";
  const { jy, jm, jd } = isoToJalali(iso);
  let out = `${faNum(jd)} ${jMonths[jm - 1]} ${faNum(jy)}`;
  if (withWeekday) {
    const wd = parseISODate(iso).getUTCDay(); // 0 sunday
    const names = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
    out = `${names[wd]} ${out}`;
  }
  return out;
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function relativeTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "همین الان";
  if (diff < 3600) return `${faNum(Math.floor(diff / 60))} دقیقه پیش`;
  if (diff < 86400) return `${faNum(Math.floor(diff / 3600))} ساعت پیش`;
  if (diff < 86400 * 30) return `${faNum(Math.floor(diff / 86400))} روز پیش`;
  return formatDateTime(date);
}

export function slugify(text: string): string {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || `item-${Date.now()}`;
}

function randomChars(len: number, alphabet: string) {
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export function genTrackingCode() {
  return `TR-${randomChars(6, "23456789ABCDEFGHJKMNPQRSTUVWXYZ")}`;
}

export function genReservationCode() {
  return `ATL-${randomChars(4, "0123456789")}-${randomChars(3, "ABCDEFGHJKMNPQRSTUVWXYZ")}`;
}

export type VideoSource =
  | { kind: "iframe"; src: string }
  | { kind: "file"; src: string }
  | null;

export function parseVideo(url: string | null | undefined): VideoSource {
  if (!url) return null;
  const u = url.trim();
  if (!u) return null;
  const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,20})/);
  if (yt) return { kind: "iframe", src: `https://www.youtube.com/embed/${yt[1]}` };
  const ap = u.match(/aparat\.com\/(?:v|video\/video\/embed\/videohash)\/([\w]{3,20})/);
  if (ap) return { kind: "iframe", src: `https://www.aparat.com/video/video/embed/videohash/${ap[1]}/vt/frame` };
  // arbitrary <iframe> embed codes are NOT accepted (XSS / clickjacking risk)
  const safe = safeUrl(u);
  if (!safe) return null;
  return { kind: "file", src: safe };
}

export const statusMeta: Record<string, { label: string; badge: string; dot: string }> = {
  pending_payment: { label: "در انتظار پیش‌پرداخت", badge: "badge-warning", dot: "status-warning" },
  paid: { label: "پرداخت شده - در انتظار تایید", badge: "badge-info", dot: "status-info" },
  confirmed: { label: "قطعی - کد رزرو صادر شد", badge: "badge-success", dot: "status-success" },
  rejected: { label: "رد شده", badge: "badge-error", dot: "status-error" },
  cancelled: { label: "لغو شده", badge: "badge-neutral", dot: "status-neutral" },
};

export function linesToArray(v: FormDataEntryValue | null): string[] {
  return String(v ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
