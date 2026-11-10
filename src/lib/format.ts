const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(value: string | number): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)]);
}

export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return toFa("0");
  return toFa(new Intl.NumberFormat("en-US").format(Math.round(value)));
}

export function formatMoney(value: number | null | undefined): string {
  return `${formatNumber(value)} تومان`;
}

export function formatCompactMoney(value: number | null | undefined): string {
  const amount = value ?? 0;
  if (amount >= 1_000_000_000) return `${toFa((amount / 1_000_000_000).toFixed(1))} میلیارد`;
  if (amount >= 1_000_000) return `${toFa(Math.round(amount / 1_000_000))} میلیون`;
  if (amount >= 1_000) return `${toFa(Math.round(amount / 1_000))} هزار`;
  return toFa(amount);
}

const JALALI_MONTHS = [
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

const WEEK_DAYS = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

function toJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const gDaysInMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  let year = gy <= 1600 ? gy - 621 : gy - 1600;
  const gy2 = gm > 2 ? year + 1 : year;
  let days =
    365 * year +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    gDaysInMonth[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  year = jy;
  return [jy, jm, jd];
}

export function parseDateValue(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const normalized = toEnDigits(value).trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? `${normalized}T12:00:00` : normalized;
  const date = new Date(dateOnly);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatJalali(value: string | Date | null | undefined, withWeekDay = false): string {
  const date = parseDateValue(value);
  if (!date) return "—";
  const [jy, jm, jd] = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  const weekDay = withWeekDay ? `${WEEK_DAYS[date.getDay()]}، ` : "";
  return `${weekDay}${toFa(jd)} ${JALALI_MONTHS[jm - 1]} ${toFa(jy)}`;
}

export function formatJalaliShort(value: string | Date | null | undefined): string {
  const date = parseDateValue(value);
  if (!date) return "—";
  const [jy, jm, jd] = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return `${toFa(jy)}/${toFa(String(jm).padStart(2, "0"))}/${toFa(String(jd).padStart(2, "0"))}`;
}

export function formatDateTime(value: string | Date | null | undefined): string {
  const date = parseDateValue(value);
  if (!date) return "—";
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours < 12 ? "قبل‌ازظهر" : "بعدازظهر";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${formatJalali(date)} · ${toFa(hour12)}:${toFa(String(minutes).padStart(2, "0"))} ${period}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysISO(days: number, from: Date = new Date()): string {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = parseDateValue(checkIn);
  const end = parseDateValue(checkOut);
  if (!start || !end) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export function normalizePhone(phone: string): string {
  return toEnDigits(phone).replace(/[^\d+]/g, "");
}

export function maskPhone(phone: string): string {
  const value = toEnDigits(phone);
  if (value.length < 6) return toFa(value);
  return toFa(`${value.slice(0, 4)}***${value.slice(-3)}`);
}

/** Builds a dialable tel: href from Persian or English digit phone numbers. */
export function phoneHref(phone: string | null | undefined): string {
  if (!phone) return "tel:";
  const normalized = toEnDigits(phone).replace(/[^\d+]/g, "");
  if (!normalized) return "tel:";
  return `tel:${normalized.startsWith("+") ? normalized : `+98${normalized.replace(/^0/, "")}`}`;
}
