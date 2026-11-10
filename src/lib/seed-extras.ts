import { sql } from "drizzle-orm";
import { db } from "@/db";
import { faqs, galleryItems, promotions, settings } from "@/db/schema";
import { addDaysISO, todayISO } from "./utils";
import { DINING_IMG } from "./seed-dining";

const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1200`;

const FAQ_SEED: [string, string, string][] = [
  ["اقامت", "ساعت تحویل و تخلیه اتاق چه زمانی است؟", "تحویل اتاق از ساعت ۱۴ و تخلیه تا ساعت ۱۲ ظهر است. در صورت خالی بودن اتاق، تحویل زودهنگام یا تخلیه دیرهنگام با هماهنگی پذیرش امکان‌پذیر است."],
  ["رزرو و پرداخت", "رزرو من چه زمانی قطعی می‌شود؟", "پس از ثبت درخواست و پرداخت پیش‌پرداخت، پذیرش رزرو را بررسی می‌کند و با تایید، «کد رزرو» صادر و برای شما پیامک می‌شود. رزرو فقط پس از صدور کد رزرو قطعی است."],
  ["رزرو و پرداخت", "پیش‌پرداخت چقدر است و مانده را چه زمانی پرداخت کنم؟", "پیش‌پرداخت درصدی از مبلغ کل است (معمولاً ۳۰٪). مانده مبلغ هنگام پذیرش در هتل دریافت می‌شود."],
  ["رزرو و پرداخت", "شرایط لغو رزرو چیست؟", "لغو تا ۷۲ ساعت قبل از ورود با استرداد کامل پیش‌پرداخت و کمتر از ۷۲ ساعت با کسر ۵۰٪ پیش‌پرداخت انجام می‌شود."],
  ["رزرو و پرداخت", "چطور از کد تخفیف استفاده کنم؟", "در فرم رزرو، کد تخفیف را در کادر «کد تخفیف» وارد کرده و «اعمال» را بزنید. مبلغ تخفیف بلافاصله از مبلغ کل و پیش‌پرداخت کم می‌شود."],
  ["اقامت", "آیا صبحانه در قیمت اتاق لحاظ شده است؟", "بله، صبحانه بوفه برای همه مهمانان رایگان است. وعده‌های ناهار و شام را می‌توانید هنگام رزرو به‌عنوان گزینه اضافه کنید."],
  ["اقامت", "آیا کودکان هزینه جداگانه دارند؟", "کودکان زیر ۵ سال بدون سرویس اضافه رایگان هستند. برای بیش از ظرفیت استاندارد اتاق، هزینه نفر اضافه طبق جدول قیمت محاسبه می‌شود."],
  ["امکانات", "آیا هتل پارکینگ دارد؟", "بله، پارکینگ اختصاصی و رایگان برای مهمانان هتل در نظر گرفته شده است."],
  ["امکانات", "آیا ورود حیوانات خانگی مجاز است؟", "متأسفانه امکان پذیرش حیوانات خانگی در هتل وجود ندارد."],
];

export async function insertExtrasDemo() {
  const s = Object.fromEntries((await db.select().from(settings)).map((r) => [r.key, r.value]));
  const isAtalar = (s.hotelName ?? "هتل آتالار").includes("آتالار");
  const today = todayISO();

  await db
    .insert(promotions)
    .values([
      {
        code: "SUMMER20",
        title: "اقامت فصلی با ۲۰٪ تخفیف",
        description: "برای اقامت‌های دو شب و بیشتر، ۲۰٪ از مبلغ اتاق کم می‌شود. فرصتی عالی برای یک سفر آرام.",
        image: px(6434592),
        kind: "percent" as const,
        value: 20,
        maxDiscount: 3_000_000,
        minNights: 2,
        appliesTo: "rooms" as const,
        validTo: addDaysISO(today, 90),
        sortOrder: 0,
        isDemo: true,
      },
      {
        code: "STAY3",
        title: "سه شب بمانید، ۱۵٪ تخفیف بگیرید",
        description: "با رزرو حداقل سه شب، ۱۵٪ تخفیف روی کل صورتحساب اتاق دریافت کنید.",
        image: px(24461266),
        kind: "percent" as const,
        value: 15,
        minNights: 3,
        appliesTo: "rooms" as const,
        sortOrder: 1,
        isDemo: true,
      },
      {
        code: "SERVICE300",
        title: "۳۰۰ هزار تومان تخفیف رزرو سانس",
        description: isAtalar ? "تخفیف ویژه رزرو آنلاین سانس استخر خانوادگی و سایر خدمات قابل رزرو هتل." : "تخفیف ویژه رزرو آنلاین سالن جلسات و سایر خدمات قابل رزرو هتل.",
        image: isAtalar ? "/images/pool.jpg" : DINING_IMG.lobby,
        kind: "fixed" as const,
        value: 300_000,
        appliesTo: "services" as const,
        validTo: addDaysISO(today, 60),
        sortOrder: 2,
        isDemo: true,
      },
      {
        code: "WELCOME10",
        title: "کد خوش‌آمد (خصوصی)",
        description: "کد خصوصی برای ارسال به مهمانان وفادار؛ در سایت نمایش داده نمی‌شود.",
        kind: "percent" as const,
        value: 10,
        maxUses: 50,
        isPublic: false,
        sortOrder: 3,
        isDemo: true,
      },
    ])
    .onConflictDoNothing();

  await db.insert(faqs).values(FAQ_SEED.map(([category, question, answer], i) => ({ category, question, answer, sortOrder: i, isDemo: true })));

  const hero = isAtalar ? "/images/hero.jpg" : "/images/city-hotel.jpg";
  const gallery: [string, string, string][] = [
    [hero, "نمای بیرونی هتل", "هتل"],
    [px(12391805), "لابی و پذیرش", "هتل"],
    [px(40317538), "میز پذیرش", "هتل"],
    [px(6434592), "اتاق دبل", "اتاق‌ها"],
    [px(40624479), "سوئیت کلاسیک", "اتاق‌ها"],
    [px(8082217), "اتاق خانوادگی", "اتاق‌ها"],
    [px(7507131), "آرامش در اتاق", "اتاق‌ها"],
    [DINING_IMG.restaurantHall, "سالن رستوران", "رستوران و کافه"],
    [DINING_IMG.kebab2, "غذای امضای سرآشپز", "رستوران و کافه"],
    [DINING_IMG.coffee1, "قهوه و دسر", "رستوران و کافه"],
    [DINING_IMG.cafe2, "فضای کافه", "رستوران و کافه"],
    ...(isAtalar
      ? ([
          ["/images/pool.jpg", "استخر خانوادگی", "استخر و تفریح"],
          [px(4146757), "طبیعت اطراف", "اطراف هتل"],
          [px(7438793), "مناظر کوهستان", "اطراف هتل"],
        ] as [string, string, string][])
      : ([
          [px(15886871), "بازار تاریخی", "اطراف هتل"],
          [px(16651521), "خانه‌های تاریخی", "اطراف هتل"],
        ] as [string, string, string][])),
  ];
  await db.insert(galleryItems).values(gallery.map(([url, caption, category], i) => ({ url, caption, category, sortOrder: i, isDemo: true })));
}

/**
 * Upgrade path: add sample offers, FAQs and gallery once – only while the site is in demo mode
 * and the tables are empty. Never touches real data.
 */
export async function ensureExtrasDemo() {
  const flag = await db.select().from(settings).where(sql`${settings.key} = 'seed_extras_v1'`);
  if (flag.length) return;
  const done = () => db.insert(settings).values({ key: "seed_extras_v1", value: "1" }).onConflictDoNothing();
  if (process.env.DEMO_MODE === "false" || process.env.SEED_DEMO === "false") return done();
  const demo = await db.select().from(settings).where(sql`${settings.key} = 'demoMode'`);
  if (demo[0] && demo[0].value !== "1") return done();
  const [{ p }] = await db.select({ p: sql<number>`count(*)::int` }).from(promotions);
  const [{ f }] = await db.select({ f: sql<number>`count(*)::int` }).from(faqs);
  const [{ g }] = await db.select({ g: sql<number>`count(*)::int` }).from(galleryItems);
  if (p === 0 && f === 0 && g === 0) await insertExtrasDemo();
  await done();
}
