import { cache } from "react";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { ensureSeeded } from "./seed";

export const defaultSettings = {
  hotelName: "هتل آتالار",
  hotelNameEn: "Atalar Hotel",
  tagline: "آرامشی گرم در دامنه سبلان",
  stars: "4",
  foundedYear: "1398",
  phone: "045-32223344",
  mobile: "0914-123-4567",
  email: "info@atalarhotel.ir",
  address: "اردبیل، سرعین، بلوار امام خمینی، جنب پارک جنگلی، هتل آتالار",
  lat: "38.1521",
  lng: "48.0762",
  checkInTime: "14:00",
  checkOutTime: "12:00",
  depositPercent: "30",
  cardNumber: "6037-9975-1234-5678",
  cardHolder: "شرکت گردشگری آتالار",
  bankName: "بانک ملی ایران",
  instagram: "atalar.hotel",
  telegram: "atalarhotel",
  whatsapp: "989141234567",
  demoMode: "1",
  /* customer club */
  clubEnabled: "1",
  tierSilver: "50000000",
  tierGold: "150000000",
  tierPlatinum: "400000000",
  pointsPer: "1000000",
  birthdayEnabled: "1",
  birthdayPercent: "20",
  birthdayValidDays: "30",
  birthdayDaysBefore: "2",
  birthdayMessage: "{name} عزیز، تولدتان پیشاپیش مبارک! 🎂 به همین مناسبت {percent}٪ تخفیف اقامت در {hotel} هدیه ماست. کد تخفیف: {code} (اعتبار تا {expires})",
  reviewInviteEnabled: "1",
  reviewInviteMessage: "{name} عزیز، از اقامت شما در {hotel} سپاسگزاریم. لطفاً تجربه خود را با ما در میان بگذارید: {link}",
  smsLineNumber: "",
  smsOptOutSuffix: "لغو۱۱",
  siteUrl: "",
  giftCardAmounts: "2000000,5000000,10000000,20000000",
  giftCardValidMonths: "12",
  giftCardMin: "1000000",
  /* in-house guests */
  stayPortalEnabled: "1",
  wifiName: "",
  wifiPassword: "",
  receptionExt: "0",
  tableSmsOnConfirm: "1",
  siteTemplate: "grand",
  palette: "champagne",
  logoUrl: "",
  city: "سرعین",
  seoDescription: "هتل آتالار سرعین با ۱۶ اتاق و سوئیت، استخر خانوادگی آب گرم معدنی، رستوران سنتی و رزرو آنلاین با صدور کد رزرو.",
  footerText: "اقامتی گرم و خانوادگی در قلب سرعین؛ با ۱۶ اتاق و سوئیت دنج، استخر خانوادگی اختصاصی و مهمان‌نوازی اصیل آذربایجانی.",
  moduleDining: "1",
  moduleServices: "1",
  moduleAmenities: "1",
  moduleAttractions: "1",
  moduleOffers: "1",
  moduleGallery: "1",
  moduleFaq: "1",
  floatingContact: "1",
  smsProvider: "none",
  smsApiKey: "",
  smsAdminMobiles: "",
  smsNotifyAdminOnRequest: "0",
  smsNotifyAdminOnPaid: "1",
  smsNotifyGuestOnRequest: "0",
  smsTplAdminReservation: "",
  smsTplGuestRequest: "",
  smsTplGuestConfirmed: "",
  smsTplGuestRejected: "",
  aboutTitle: "داستان آتالار",
  aboutText:
    "هتل آتالار در سال ۱۳۹۸ با هدف ارائه تجربه‌ای متفاوت از اقامت در قلب شهر توریستی سرعین افتتاح شد. «آتالار» در زبان ترکی به معنای «نیاکان» است؛ نامی که یادآور مهمان‌نوازی اصیل آذربایجانی است. ما با ۱۶ اتاق و سوئیت دنج و یک استخر خانوادگی اختصاصی، فضایی آرام، خصوصی و صمیمی برای خانواده‌ها فراهم کرده‌ایم تا خاطره‌ای گرم در دامنه کوه سبلان بسازند.",
};

export type SiteSettings = typeof defaultSettings;

/** Keys that must never be sent to the browser. */
export const SECRET_SETTING_KEYS = ["smsApiKey"] as const;

/** Uncached read. Does NOT wait for seeding (it is used by the seed itself → avoids a circular wait). */
export async function getSettingsFresh(): Promise<SiteSettings> {
  return loadSettings(false);
}

export const getSettings = cache(async (): Promise<SiteSettings> => loadSettings(true));

async function loadSettings(seed: boolean): Promise<SiteSettings> {
  if (seed) await ensureSeeded();
  const rows = await db.select().from(settings);
  const out: SiteSettings = { ...defaultSettings };
  for (const r of rows) {
    if (r.key in out) (out as Record<string, string>)[r.key] = r.value;
  }
  return out;
}
