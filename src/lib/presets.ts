import type { BookingContent, HomeContent } from "./content";
import { defaultBooking, defaultHome } from "./content";

export type PresetKey = "opus4" | "glass4" | "soft4" | "grand4" | "resort4" | "city3" | "boutique4" | "business4";

export const PRESETS: {
  key: PresetKey;
  title: string;
  desc: string;
  settings: Record<string, string>;
  show: Partial<Record<keyof HomeContent, boolean>>;
  order: string[];
}[] = [
  {
    key: "opus4",
    title: "شاهکار ۴ ستاره",
    desc: "قالب سینمایی و تعاملی با پالت زمرد و رزگلد؛ همه سکشن‌ها شامل پیشنهادهای ویژه، گالری و سوالات متداول.",
    settings: { siteTemplate: "opus", palette: "jade", stars: "4", moduleDining: "1", moduleServices: "1", moduleAmenities: "1", moduleAttractions: "1", moduleOffers: "1", moduleGallery: "1", moduleFaq: "1" },
    show: { showPool: true, showDining: true, showFeatures: true, showAttractions: true, showReviews: true, showServices: true, showOffers: true, showGallery: true, showFaq: true },
    order: ["features", "rooms", "offers", "spotlight", "dining", "amenities", "gallery", "services", "attractions", "reviews", "faq", "track", "map"],
  },
  {
    key: "glass4",
    title: "هتل ۴ ستاره شیشه‌ای",
    desc: "قالب گلس با پالت شفق؛ صفحه اول بنتو، پنل‌های شیشه‌ای مات و پس‌زمینه رنگی متحرک.",
    settings: { siteTemplate: "glass", palette: "aurora", stars: "4", moduleDining: "1", moduleServices: "1", moduleAmenities: "1", moduleAttractions: "1" },
    show: { showPool: true, showDining: true, showFeatures: true, showAttractions: true, showReviews: true, showServices: true },
    order: ["features", "rooms", "dining", "spotlight", "services", "amenities", "attractions", "reviews", "track", "map"],
  },
  {
    key: "soft4",
    title: "هتل ۴ ستاره نئومورفیک",
    desc: "قالب نئومورفیسم با رنگ مرواریدی و نیلی؛ کارت‌ها و دکمه‌های نرم و لمسی، رستوران تب‌دار و جستجوی تاریخ.",
    settings: { siteTemplate: "soft", palette: "pearl", stars: "4", moduleDining: "1", moduleServices: "1", moduleAmenities: "1", moduleAttractions: "1" },
    show: { showPool: true, showDining: true, showFeatures: true, showAttractions: true, showReviews: true, showServices: true },
    order: ["features", "rooms", "spotlight", "dining", "amenities", "services", "attractions", "reviews", "track", "map"],
  },
  {
    key: "grand4",
    title: "هتل ۴ ستاره گرند",
    desc: "قالب گرند با رنگ اسپرسو و شامپاینی، جستجوی تاریخ روی تصویر اصلی، اسلایدر اتاق‌ها و رستوران برجسته.",
    settings: { siteTemplate: "grand", palette: "champagne", stars: "4", moduleDining: "1", moduleServices: "1", moduleAmenities: "1", moduleAttractions: "1" },
    show: { showPool: true, showDining: true, showFeatures: true, showAttractions: true, showReviews: true, showServices: true },
    order: ["features", "rooms", "dining", "spotlight", "amenities", "services", "reviews", "attractions", "track", "map"],
  },
  {
    key: "resort4",
    title: "ریزورت ۴ ستاره با استخر",
    desc: "قالب لوکس، ویدیو تمام‌صفحه، سکشن ویژه استخر و رستوران. (حالت فعلی آتالار)",
    settings: { siteTemplate: "luxe", palette: "atalar", stars: "4", moduleDining: "1", moduleServices: "1", moduleAmenities: "1", moduleAttractions: "1" },
    show: { showPool: true, showDining: true, showFeatures: true, showAttractions: true, showReviews: true, showServices: true },
    order: ["features", "rooms", "spotlight", "dining", "amenities", "services", "attractions", "reviews", "track", "map"],
  },
  {
    key: "city3",
    title: "هتل شهری ۳ ستاره با کافه و رستوران",
    desc: "قالب بوتیک روشن، بدون استخر، رستوران و کافه در مرکز توجه، رنگ سرمه‌ای و مسی.",
    settings: { siteTemplate: "boutique", palette: "navy", stars: "3", moduleDining: "1", moduleServices: "1", moduleAmenities: "1", moduleAttractions: "1" },
    show: { showPool: false, showDining: true, showFeatures: true, showAttractions: true, showReviews: true, showServices: true },
    order: ["features", "rooms", "dining", "amenities", "attractions", "reviews", "services", "track", "map"],
  },
  {
    key: "boutique4",
    title: "هتل بوتیک ۴ ستاره",
    desc: "قالب بوتیک با رنگ زرشکی و شامپاینی، رستوران امضادار و سکشن ویژه (اسپا یا روف‌گاردن).",
    settings: { siteTemplate: "boutique", palette: "burgundy", stars: "4", moduleDining: "1", moduleServices: "1", moduleAmenities: "1", moduleAttractions: "1" },
    show: { showPool: true, showDining: true, showFeatures: true, showAttractions: true, showReviews: true, showServices: true },
    order: ["features", "rooms", "dining", "spotlight", "amenities", "reviews", "attractions", "services", "track", "map"],
  },
  {
    key: "business4",
    title: "هتل تجاری ۴ ستاره",
    desc: "قالب لوکس با رنگ خاکستری و کهربایی، تمرکز بر اتاق‌ها، خدمات و موقعیت مکانی.",
    settings: { siteTemplate: "luxe", palette: "slate", stars: "4", moduleDining: "1", moduleServices: "1", moduleAmenities: "1", moduleAttractions: "0" },
    show: { showPool: false, showDining: true, showFeatures: true, showAttractions: false, showReviews: true, showServices: true },
    order: ["features", "rooms", "services", "dining", "amenities", "reviews", "track", "map", "spotlight", "attractions"],
  },
];

/** Generic (pool-free) homepage texts for a city hotel. */
export function cityHomeContent(hotelName: string, city: string, stars: number): HomeContent {
  return {
    ...defaultHome,
    heroMedia: [
      { url: "/images/city-hotel.jpg", type: "image", duration: 7 },
      { url: "https://images.pexels.com/photos/36484101/pexels-photo-36484101.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920", type: "image", duration: 6 },
      { url: "https://images.pexels.com/photos/6434592/pexels-photo-6434592.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1080&w=1920", type: "image", duration: 6 },
    ],
    heroOverlay: 35,
    heroBadge: `هتل ${["", "یک", "دو", "سه", "چهار", "پنج"][stars] ?? stars} ستاره ${city}`,
    heroTitle: hotelName,
    heroHighlight: "اقامتی دنج در قلب شهر",
    heroText: `چند قدم تا بازار و جاذبه‌های تاریخی ${city}؛ اتاق‌هایی آرام و تمیز، کافه‌ای دلنشین و رستورانی با طعم‌های اصیل محلی.`,
    heroPrimaryCta: "رزرو اتاق",
    heroSecondaryCta: "مشاهده اتاق‌ها",
    stats: [
      { icon: "BedDouble", value: "۲۰", label: "اتاق و سوئیت" },
      { icon: "MapPin", value: "۵ دقیقه", label: "تا بازار" },
      { icon: "Coffee", value: "۱۷ ساعت", label: "کافه باز است" },
      { icon: "Star", value: "۴.۷", label: "رضایت مهمانان" },
    ],
    features: [
      { icon: "MapPin", title: "مرکز شهر", text: "دسترسی پیاده به جاذبه‌ها" },
      { icon: "Coffee", title: "کافه و رستوران", text: "صبحانه رایگان" },
      { icon: "Wifi", title: "اینترنت پرسرعت", text: "رایگان در همه فضاها" },
      { icon: "KeyRound", title: "رزرو قطعی", text: "با صدور کد رزرو" },
    ],
    roomsEyebrow: "اقامت",
    roomsTitle: "اتاق‌هایی برای هر سفر",
    roomsText: "از اتاق یک‌نفره برای سفرهای کاری تا سوئیت خانوادگی؛ همه با صبحانه و اینترنت رایگان.",
    showPool: false,
    diningEyebrow: "کافه و رستوران",
    diningTitle: "از قهوه صبح تا شام تبریزی",
    diningText: "کافه و رستوران هتل برای مهمانان و اهالی شهر باز است؛ منو را ببینید و طعم‌های محلی را امتحان کنید.",
    amenitiesTitle: "امکاناتی که سفر را راحت می‌کند",
    amenitiesText: "خدمات و امکانات رفاهی هتل",
    attractionsTitle: `جاذبه‌های نزدیک هتل در ${city}`,
    attractionsText: "هتل در فاصله پیاده‌روی از مهم‌ترین جاذبه‌های شهر قرار دارد.",
    mapTitle: "در قلب شهر، نزدیک به همه چیز",
    sectionOrder: ["features", "rooms", "dining", "amenities", "attractions", "reviews", "services", "track", "map", "spotlight"],
  };
}

export function cityBookingContent(): BookingContent {
  return {
    ...defaultBooking,
    pageSubtitle: "اتاق مورد نظر خود را در چند قدم ساده رزرو کنید.",
    steps: [
      { emoji: "🔎", title: "انتخاب اتاق", text: "اتاق متناسب با تعداد همراهان و تاریخ سفر خود را انتخاب کنید." },
      { emoji: "📝", title: "ثبت درخواست رزرو", text: "تاریخ ورود و خروج، تعداد مهمانان و اطلاعات تماس خود را ثبت نمایید." },
      defaultBooking.steps[2],
      defaultBooking.steps[3],
    ],
  };
}
