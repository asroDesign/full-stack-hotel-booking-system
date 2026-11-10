export type BookingStatus =
  | "pending_payment"
  | "awaiting_review"
  | "confirmed"
  | "rejected"
  | "cancelled";

export const BOOKING_STATUS: Record<
  BookingStatus,
  { label: string; short: string; tone: string; dot: string; description: string }
> = {
  pending_payment: {
    label: "در انتظار پیش‌پرداخت",
    short: "پیش‌پرداخت",
    tone: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-500",
    description: "درخواست ثبت شده اما تا تکمیل پیش‌پرداخت قطعی نیست.",
  },
  awaiting_review: {
    label: "در انتظار تأیید پذیرش",
    short: "در حال بررسی",
    tone: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    description: "پیش‌پرداخت دریافت شد و درخواست در صف تأیید پذیرش است.",
  },
  confirmed: {
    label: "تأییدشده و قطعی",
    short: "تأییدشده",
    tone: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    description: "رزرو قطعی شده و کد رزرو برای مهمان صادر شده است.",
  },
  rejected: {
    label: "رد شده",
    short: "رد شده",
    tone: "bg-rose-50 text-rose-800 ring-rose-200",
    dot: "bg-rose-500",
    description: "درخواست به دلیل نبود ظرفیت یا پرداخت نامعتبر رد شده است.",
  },
  cancelled: {
    label: "لغو شده",
    short: "لغو",
    tone: "bg-stone-100 text-stone-700 ring-stone-200",
    dot: "bg-stone-400",
    description: "این درخواست توسط مهمان یا پذیرش لغو شده است.",
  },
};

export const BOOKING_STATUS_ORDER: BookingStatus[] = [
  "pending_payment",
  "awaiting_review",
  "confirmed",
  "rejected",
  "cancelled",
];

export const MESSAGE_STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: "جدید", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  read: { label: "خوانده‌شده", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  replied: { label: "پاسخ داده‌شده", tone: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
};

export const SERVICE_TYPE: Record<string, { label: string; icon: string }> = {
  room: { label: "اقامت در اتاق", icon: "🛏️" },
  pool: { label: "استخر خانوادگی", icon: "🏊" },
};

export const POOL_SLOTS = [
  "۰۸:۰۰ تا ۱۱:۰۰",
  "۱۲:۰۰ تا ۱۵:۰۰",
  "۱۶:۰۰ تا ۱۹:۰۰",
  "۲۰:۰۰ تا ۲۳:۰۰",
];

export const ROOM_RULES = [
  "ورود به اتاق از ساعت ۱۴:۰۰ و تخلیه تا ساعت ۱۲:۰۰ روز خروج است.",
  "همراه داشتن کارت شناسایی معتبر برای همه مهمانان الزامی است.",
  "رزرو اتاق تنها با پرداخت پیش‌پرداخت ۳۰٪ و تأیید پذیرش قطعی می‌شود.",
  "استفاده از اتاق برای تعداد نفرات بیشتر از ظرفیت، مشمول هزینه نفر اضافه است.",
  "استعمال دخانیات در اتاق‌ها ممنوع است؛ بالکن و محوطه باغ مجاز است.",
  "لغو رزرو تا ۷۲ ساعت قبل از ورود با کسر ۱۰٪ هزینه انجام می‌شود.",
];

export const POOL_RULES = [
  "هر سانس سه ساعته و به صورت خصوصی برای یک خانواده رزرو می‌شود.",
  "ظرفیت پایه هر سانس ۸ نفر است؛ هر نفر اضافه تا سقف ۱۲ نفر هزینه جداگانه دارد.",
  "همراه داشتن مایو و کلاه شنا الزامی است.",
  "کودکان زیر ۶ سال باید با همراه بزرگسال در بخش کم‌عمق باشند.",
  "ورود نوشیدنی و غذای بیرون به محوطه استخر مجاز نیست.",
  "رزرو سانس تنها با پیش‌پرداخت ۳۰٪ و تأیید پذیرش قطعی می‌شود.",
  "لغو سانس تا ۴۸ ساعت قبل، با کسر ۱۰٪ هزینه انجام می‌شود.",
];

export const ROOM_CATEGORIES = [
  "دو نفره دلوکس",
  "سه نفره خانوادگی",
  "سوئیت خانوادگی",
  "سوئیت رویال",
];

export const FACILITY_CATEGORIES = ["رفاهی", "خدماتی", "تفریحی", "پذیرایی"];
export const ATTRACTION_CATEGORIES = ["طبیعت‌گردی", "تاریخی", "دریایی", "روستاگردی", "خرید"];
