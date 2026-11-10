import { defaultSettings, getSettings, type SiteSettings } from "./data";

export const TEMPLATES = [
  {
    key: "opus",
    title: "شاهکار (سینمایی و تعاملی)",
    desc: "تایپوگرافی عظیم با کلمات متحرک، منوی تمام‌صفحه، اتاق‌های آکاردئونی، رستوران با پیش‌نمایش تصویر، تایم‌لاین تجربه، شمارنده‌های متحرک، پیشنهادهای ویژه، گالری، آب‌وهوای زنده و انیمیشن‌های اسکرول.",
  },
  {
    key: "grand",
    title: "گرند (فاخر و مدرن)",
    desc: "هدر با لوگوی مرکزی، تایپوگرافی درشت و نازک، جستجوی تاریخ روی تصویر اصلی، اسلایدر اتاق‌ها و بخش رستوران تب‌دار. مناسب هتل‌های ۴ ستاره.",
  },
  {
    key: "glass",
    title: "گلس (شیشه‌ای و بنتو)",
    desc: "پنل‌های شیشه‌ای مات روی پس‌زمینه رنگی متحرک، صفحه اول با چیدمان بنتو (کاشی‌ای)، کاوشگر اتاق‌ها و جاذبه‌ها روی نقشه. مدرن و چشم‌نواز برای هتل‌های ۴ ستاره.",
  },
  {
    key: "soft",
    title: "نئومورفیسم (نرم و لمسی)",
    desc: "سطوح هم‌رنگ زمینه که با نور و سایه برجسته یا فرورفته می‌شوند؛ دکمه‌ها و کارت‌های لمسی و آرام. مدرن و متفاوت، مناسب هتل‌های ۴ ستاره شهری.",
  },
  {
    key: "luxe",
    title: "لوکس (تیره و سینمایی)",
    desc: "هدر شیشه‌ای روی ویدیو تمام‌صفحه، رنگ‌های عمیق و کارت‌های شناور. مناسب هتل‌های ۴ و ۵ ستاره و ریزورت‌ها.",
  },
  {
    key: "boutique",
    title: "بوتیک (روشن و مجله‌ای)",
    desc: "زمینه روشن کاغذی، چیدمان دو ستونه و تایپوگرافی مجله‌ای. مناسب هتل‌های شهری ۳ و ۴ ستاره و هتل‌های بوتیک.",
  },
] as const;

export type TemplateKey = (typeof TEMPLATES)[number]["key"];

export const PALETTES = [
  { key: "jade", title: "زمرد و رزگلد", colors: ["#022c22", "#065f46", "#34d399", "#eab8a3"] },
  { key: "champagne", title: "اسپرسو و شامپاینی", colors: ["#151210", "#574b3b", "#a69276", "#dcc48c"] },
  { key: "pearl", title: "مرواریدی و نیلی", colors: ["#1c1c4a", "#3a3ac8", "#a3b2fc", "#ffab8a"] },
  { key: "aurora", title: "شفق (بنفش و فیروزه‌ای)", colors: ["#3b0764", "#7e22ce", "#c084fc", "#67e8f9"] },
  { key: "atalar", title: "فیروزه‌ای و طلایی", colors: ["#062826", "#17665e", "#42baa7", "#e9bb57"] },
  { key: "navy", title: "سرمه‌ای و مسی", colors: ["#0f1a30", "#234177", "#5a85c9", "#e39b6a"] },
  { key: "olive", title: "زیتونی و کاهگلی", colors: ["#181f10", "#44542a", "#8fa65d", "#e6a274"] },
  { key: "burgundy", title: "زرشکی و شامپاینی", colors: ["#33111c", "#7d2f46", "#cc718a", "#e5c88a"] },
  { key: "slate", title: "خاکستری و کهربایی", colors: ["#1c2029", "#424e62", "#8595ab", "#fbbf4b"] },
] as const;

export type PaletteKey = (typeof PALETTES)[number]["key"];

export const templateOf = (s: Pick<SiteSettings, "siteTemplate">): TemplateKey =>
  TEMPLATES.some((t) => t.key === s.siteTemplate) ? (s.siteTemplate as TemplateKey) : "grand";

export const paletteOf = (s: Pick<SiteSettings, "palette">): PaletteKey =>
  PALETTES.some((p) => p.key === s.palette) ? (s.palette as PaletteKey) : "champagne";

/** Never throws – falls back to defaults (e.g. during `next build` without a database). */
export async function getSettingsSafe(): Promise<SiteSettings> {
  // never touch the database while building: migrations only run when the server starts
  if (process.env.NEXT_PHASE === "phase-production-build") return { ...defaultSettings };
  try {
    return await getSettings();
  } catch {
    return { ...defaultSettings };
  }
}

/** First letter used as text logo when no logo image is uploaded. */
export function logoLetter(name: string) {
  const cleaned = name.replace(/^(هتل|هتل‌|مهمانسرا|اقامتگاه)\s*/u, "").trim();
  return (cleaned || name || "H").charAt(0);
}

export const starsLabel = (n: number) => ["", "یک", "دو", "سه", "چهار", "پنج"][n] ?? String(n);
