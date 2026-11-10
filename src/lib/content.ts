import { cache } from "react";
import { normalizeOrder } from "./content-meta";
export { HOME_SECTIONS, normalizeOrder } from "./content-meta";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type MediaItem = { url: string; type: "video" | "image"; duration: number };
export type IconText = { icon: string; title: string; text: string };
export type Stat = { icon: string; value: string; label: string };
export type Step = { emoji: string; title: string; text: string };

export type HomeContent = {
  heroMedia: MediaItem[];
  heroOverlay: number;
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroText: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  stats: Stat[];
  showFeatures: boolean;
  features: IconText[];

  showRooms: boolean;
  roomsEyebrow: string;
  roomsTitle: string;
  roomsText: string;
  roomsCount: number;

  showPool: boolean;
  poolEyebrow: string;
  poolTitle: string;
  poolText: string;
  poolMedia: MediaItem[];
  poolFeatures: string[];
  poolBadgeTop: string;
  poolBadgeBottom: string;
  poolCta: string;

  spotlightServiceSlug: string;

  showDining: boolean;
  diningEyebrow: string;
  diningTitle: string;
  diningText: string;
  diningCta: string;

  sectionOrder: string[];

  showOffers: boolean;
  offersEyebrow: string;
  offersTitle: string;
  offersText: string;
  showGallery: boolean;
  galleryEyebrow: string;
  galleryTitle: string;
  showFaq: boolean;
  faqEyebrow: string;
  faqTitle: string;

  showAmenities: boolean;
  amenitiesEyebrow: string;
  amenitiesTitle: string;
  amenitiesText: string;

  showServices: boolean;
  servicesEyebrow: string;
  servicesTitle: string;

  showAttractions: boolean;
  attractionsEyebrow: string;
  attractionsTitle: string;
  attractionsText: string;

  showReviews: boolean;
  reviewsEyebrow: string;
  reviewsTitle: string;

  showTrack: boolean;
  trackTitle: string;
  trackText: string;

  showMap: boolean;
  mapEyebrow: string;
  mapTitle: string;
  mapCta: string;
};

export type BookingContent = {
  pageTitle: string;
  pageSubtitle: string;
  processTitle: string;
  processSubtitle: string;
  steps: Step[];
  notice: string;
  hotelRulesTitle: string;
  hotelRules: string[];
  requireRulesAccept: boolean;
  trackTitle: string;
  trackText: string;
};

const PEXELS_VIDEO = (id: number, file: string) => `https://videos.pexels.com/video-files/${id}/${file}`;

export const defaultHome: HomeContent = {
  heroMedia: [
    { url: PEXELS_VIDEO(4250075, "4250075-hd_1920_1080_30fps.mp4"), type: "video", duration: 0 },
    { url: "/images/hero.jpg", type: "image", duration: 6 },
    { url: PEXELS_VIDEO(4101507, "4101507-hd_1920_1080_25fps.mp4"), type: "video", duration: 0 },
  ],
  heroOverlay: 55,
  heroBadge: "هتل ۴ ستاره سرعین",
  heroTitle: "هتل آتالار",
  heroHighlight: "آرامشی گرم در دامنه سبلان",
  heroText:
    "۱۶ اتاق و سوئیت دنج، استخر خانوادگی اختصاصی با آب گرم معدنی و مهمان‌نوازی اصیل آذربایجانی؛ چند قدم تا آبگرم‌های سرعین.",
  heroPrimaryCta: "رزرو آنلاین",
  heroSecondaryCta: "مشاهده اتاق‌ها",
  stats: [
    { icon: "BedDouble", value: "۱۶", label: "اتاق و سوئیت" },
    { icon: "Thermometer", value: "۳۴°", label: "دمای آب استخر" },
    { icon: "Clock", value: "۲۴/۷", label: "پذیرش شبانه‌روزی" },
    { icon: "Star", value: "۴.۹", label: "رضایت مهمانان" },
  ],
  showFeatures: true,
  features: [
    { icon: "CalendarCheck", title: "رزرو آنلاین", text: "انتخاب تاریخ و سانس" },
    { icon: "ShieldCheck", title: "پیش‌پرداخت امن", text: "فقط ۳۰٪ مبلغ" },
    { icon: "KeyRound", title: "کد رزرو رسمی", text: "پس از تایید پذیرش" },
    { icon: "Users", title: "مناسب خانواده", text: "استخر اختصاصی" },
  ],

  showRooms: true,
  roomsEyebrow: "اقامتگاه‌ها",
  roomsTitle: "اتاق‌ها و سوئیت‌های آتالار",
  roomsText: "هر اتاق با دقت و عشق طراحی شده؛ از اتاق دبل دنج تا سوئیت رویال با تراس اختصاصی.",
  roomsCount: 6,

  showPool: true,
  poolEyebrow: "ویژه آتالار",
  poolTitle: "استخر خانوادگی",
  poolText:
    "استخر سرپوشیده آب گرم معدنی که در هر سانس فقط به یک خانواده اختصاص دارد؛ با جکوزی، سونای خشک و بخش ویژه کودکان.",
  poolMedia: [
    { url: PEXELS_VIDEO(18187089, "18187089-hd_1920_1080_30fps.mp4"), type: "video", duration: 0 },
    { url: "/images/pool.jpg", type: "image", duration: 6 },
  ],
  poolFeatures: ["آب گرم معدنی ۳۲ تا ۳۴ درجه", "جکوزی و سونای خشک", "بخش کم‌عمق کودکان", "رختکن و دوش اختصاصی"],
  poolBadgeTop: "هر سانس فقط",
  poolBadgeBottom: "یک خانواده",
  poolCta: "رزرو سانس استخر",
  spotlightServiceSlug: "",

  showDining: true,
  diningEyebrow: "رستوران و کافه",
  diningTitle: "طعم‌هایی که به خاطر می‌سپارید",
  diningText: "از صبحانه محلی تا شام سنتی و قهوه تخصصی؛ با مواد اولیه تازه و منوی متنوع.",
  diningCta: "مشاهده منو",

  sectionOrder: ["features", "rooms", "offers", "spotlight", "dining", "amenities", "services", "gallery", "attractions", "reviews", "faq", "track", "map"],

  showOffers: true,
  offersEyebrow: "پیشنهادهای ویژه",
  offersTitle: "پیشنهادهایی که نباید از دست بدهید",
  offersText: "با کدهای تخفیف ویژه رزرو مستقیم، اقامتی به‌صرفه‌تر داشته باشید.",
  showGallery: true,
  galleryEyebrow: "گالری",
  galleryTitle: "نگاهی به حال‌وهوای هتل",
  showFaq: true,
  faqEyebrow: "سوالات متداول",
  faqTitle: "پاسخ پرسش‌های پرتکرار",

  showAmenities: true,
  amenitiesEyebrow: "امکانات",
  amenitiesTitle: "همه چیز برای یک اقامت بی‌دغدغه",
  amenitiesText: "از وای‌فای پرسرعت تا آب گرم معدنی در حمام اتاق‌ها",

  showServices: true,
  servicesEyebrow: "خدمات",
  servicesTitle: "خدمات ویژه مهمانان",

  showAttractions: true,
  attractionsEyebrow: "گردشگری",
  attractionsTitle: "جاذبه‌های اطراف هتل",
  attractionsText: "آتالار نقطه شروع کشف زیباترین مناظر اردبیل و دامنه سبلان است.",

  showReviews: true,
  reviewsEyebrow: "نظر مهمانان",
  reviewsTitle: "خاطرات مهمانان ما",

  showTrack: true,
  trackTitle: "رزرو کرده‌اید؟ وضعیت آن را پیگیری کنید",
  trackText: "با وارد کردن کد پیگیری یا کد رزرو و شماره موبایل، وضعیت پرداخت، تایید پذیرش و کد رزرو خود را ببینید.",

  showMap: true,
  mapEyebrow: "موقعیت مکانی",
  mapTitle: "در قلب سرعین، نزدیک به همه چیز",
  mapCta: "همین حالا رزرو کنید",
};

export const defaultBooking: BookingContent = {
  pageTitle: "رزرو آنلاین",
  pageSubtitle: "اتاق یا سانس استخر خانوادگی را در چند قدم ساده رزرو کنید.",
  processTitle: "فرایند رزرو",
  processSubtitle: "از انتخاب تا دریافت کد رزرو، ۴ قدم",
  steps: [
    {
      emoji: "🔎",
      title: "انتخاب اتاق یا سانس استخر",
      text: "از میان ۱۶ اتاق و سوئیت یا سانس‌های استخر خانوادگی، گزینه مناسب خود را انتخاب کنید.",
    },
    {
      emoji: "📝",
      title: "ثبت درخواست رزرو",
      text: "تاریخ و تعداد مهمانان را وارد کنید و اطلاعات تماس خود را ثبت نمایید.",
    },
    {
      emoji: "💳",
      title: "پرداخت پیش‌پرداخت",
      text: "پیش‌پرداخت ۳۰٪ از مبلغ کل را پرداخت کنید تا درخواست به مرحله بررسی پذیرش برود.",
    },
    {
      emoji: "🔑",
      title: "تأیید پذیرش و دریافت کد رزرو",
      text: "پس از بررسی و تأیید پذیرش، کد رزرو صادر و به شماره شما پیامک می‌شود. تنها در این مرحله رزرو قطعی است.",
    },
  ],
  notice:
    "ثبت درخواست به تنهایی به معنی رزرو قطعی نیست. رزرو شما پس از پرداخت پیش‌پرداخت و تأیید پذیرش قطعی می‌شود و کد رزرو در همان مرحله صادر و پیامک می‌گردد.",
  hotelRulesTitle: "قوانین اقامت در هتل",
  hotelRules: [
    "ساعت تحویل اتاق ۱۴:۰۰ و ساعت تخلیه ۱۲:۰۰ است.",
    "ارائه کارت ملی یا شناسنامه برای تمامی مهمانان بزرگسال هنگام پذیرش الزامی است.",
    "برای زوج‌ها ارائه مدرک محرمیت (شناسنامه یا عقدنامه) الزامی است.",
    "کودکان زیر ۵ سال بدون سرویس اضافه رایگان هستند.",
    "استعمال دخانیات در اتاق‌ها و فضاهای سرپوشیده ممنوع است.",
    "لغو رزرو تا ۷۲ ساعت قبل از ورود با استرداد کامل پیش‌پرداخت، و کمتر از ۷۲ ساعت با کسر ۵۰٪ پیش‌پرداخت انجام می‌شود.",
    "ورود حیوانات خانگی به هتل امکان‌پذیر نیست.",
  ],
  requireRulesAccept: true,
  trackTitle: "پیگیری رزرو",
  trackText: "کد پیگیری (TR-...) یا کد رزرو (ATL-...) و شماره موبایلی که با آن رزرو کرده‌اید را وارد کنید.",
};

function merge<T extends object>(defaults: T, raw: string | undefined): T {
  if (!raw) return { ...defaults };
  try {
    const parsed = JSON.parse(raw) as Partial<T>;
    const out = { ...defaults } as Record<string, unknown>;
    for (const k of Object.keys(defaults)) {
      const v = (parsed as Record<string, unknown>)[k];
      if (v !== undefined && v !== null && typeof v === typeof (defaults as Record<string, unknown>)[k]) out[k] = v;
    }
    return out as T;
  } catch {
    return { ...defaults };
  }
}

export const getContent = cache(async () => {
  const rows = await db.select().from(settings).where(inArray(settings.key, ["content_home", "content_booking"]));
  const get = (k: string) => rows.find((r) => r.key === k)?.value;
  const home = merge(defaultHome, get("content_home"));
  home.sectionOrder = normalizeOrder(Array.isArray(home.sectionOrder) ? home.sectionOrder : []);
  return {
    home,
    booking: merge(defaultBooking, get("content_booking")),
  };
});

export function guessMediaType(url: string): "video" | "image" {
  return /\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(url) ? "video" : "image";
}
