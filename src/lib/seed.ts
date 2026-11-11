import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  admins,
  sessions,
  rooms,
  services,
  amenities,
  attractions,
  reservations,
  messages,
  testimonials,
} from "@/db/schema";
import { hashPassword, verifyPassword } from "./auth";
import { createVoucher, dateToISO, ensureAccounts } from "./accounting";
import { ensureCalendar } from "./pricing";
import { ATALAR_VENUES, insertVenues } from "./seed-dining";
import { seedCityPreset } from "./seed-city";
import { seedEspinasPreset } from "./seed-espinas";
import { ensureExtrasDemo } from "./seed-extras";
import { ensureStayPackageExamples } from "./seed-stay-packages";
import { diningVenues, journalEntries, settings } from "@/db/schema";
import { addDaysISO, todayISO, genReservationCode, genTrackingCode } from "./utils";

const px = (id: number) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280`;

export const IMG = {
  hero: "/images/hero.jpg",
  pool: "/images/pool.jpg",
  rooms: [6434592, 40624479, 97083, 7507131, 2736384, 24461266, 8082217, 6466496].map(px),
  poolStock: [261041, 20705879, 7222170].map(px),
  lobby: px(12391805),
  buffet: px(28999498),
  buffet2: px(28999503),
  corridor: px(5371557),
  reception: px(40317538),
  nature: [4146757, 7438793, 13650002, 39965284, 39965282, 6058205, 39463383, 38371730].map(px),
  heritage: [31085604, 34326547, 33739030].map(px),
};

export const VIDEO_POOL = "https://videos.pexels.com/video-files/18187089/18187089-hd_1920_1080_30fps.mp4";
export const VIDEO_MOUNTAIN = "https://videos.pexels.com/video-files/4250075/4250075-hd_1920_1080_30fps.mp4";
export const VIDEO_ROOM = "https://videos.pexels.com/video-files/4101507/4101507-hd_1920_1080_25fps.mp4";

let seeding: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seeding) {
    seeding = runSeed()
      .then(async () => {
        await ensureAccounts();
        await ensureCalendar();
        await ensureDiningDemo();
        await ensureExtrasDemo();
        await ensureStayPackageExamples();
      })
      .catch((e) => {
      seeding = null;
      throw e;
    });
  }
  return seeding;
}

async function runSeed() {
  const existing = await db.select({ c: sql<number>`count(*)::int` }).from(admins);
  if ((existing[0]?.c ?? 0) > 0) {
    if (process.env.NODE_ENV === "production") {
      const legacy = (await db.select().from(admins)).filter((admin) => verifyPassword("admin123", admin.passwordHash));
      if (legacy.length) {
        const password = process.env.ADMIN_PASSWORD ?? "";
        if (password.length < 12 || password === "admin123") {
          throw new Error("حساب مدیر هنوز از رمز پیش‌فرض admin123 استفاده می‌کند؛ ADMIN_PASSWORD قوی با حداقل ۱۲ نویسه را تنظیم کنید تا هنگام شروع سرور جایگزین شود.");
        }
        await db.transaction(async (tx) => {
          for (const admin of legacy) {
            await tx.update(admins).set({ passwordHash: hashPassword(password) }).where(eq(admins.id, admin.id));
            await tx.delete(sessions).where(eq(sessions.adminId, admin.id));
          }
        });
      }
    }
    return;
  }

  // Production installs: set a valid ADMIN_EMAIL and a strong ADMIN_PASSWORD (≥ 12 chars) before the first start.
  const envEmail = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const envPassword = process.env.ADMIN_PASSWORD ?? "";
  const useEnv = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(envEmail) && envPassword.length >= 12;
  if (process.env.NODE_ENV === "production" && !useEnv) {
    throw new Error("برای ساخت مدیر در محیط تولید، ADMIN_EMAIL معتبر و ADMIN_PASSWORD با حداقل ۱۲ نویسه را تنظیم کنید.");
  }
  await db
    .insert(admins)
    .values({
      name: process.env.ADMIN_NAME?.trim() || "مدیر هتل",
      email: useEnv ? envEmail : process.env.HOTEL_PRESET === "atalar" ? "admin@atalar.ir" : "admin@espinas.ir",
      passwordHash: hashPassword(useEnv ? envPassword : "admin123"),
    })
    .onConflictDoNothing();

  const roomCount = await db.select({ c: sql<number>`count(*)::int` }).from(rooms);
  if ((roomCount[0]?.c ?? 0) > 0) return;

  // HOTEL_PRESET=city → seed a 3-star city hotel (boutique template, café & restaurant, no pool)
  if (process.env.HOTEL_PRESET === "city") {
    await seedCityPreset();
    await db.insert(settings).values({ key: "seed_dining_v1", value: "1" }).onConflictDoNothing();
    return;
  }

  // default (no HOTEL_PRESET or HOTEL_PRESET=espinas) → Espinas Palace Tehran. HOTEL_PRESET=atalar keeps the original resort demo.
  if (process.env.HOTEL_PRESET !== "atalar") {
    await seedEspinasPreset();
    for (const key of ["seed_dining_v1", "seed_extras_v1", "seed_customers_v1"]) await db.insert(settings).values({ key, value: "1" }).onConflictDoNothing();
    await ensureAccounts();
    const { syncReservationVouchers } = await import("./accounting");
    for (const r of await db.select().from(reservations)) if (r.paidAt || r.status === "confirmed") await syncReservationVouchers(r);
    const { recomputeCustomer } = await import("./crm");
    const { customers } = await import("@/db/schema");
    for (const cu of await db.select().from(customers)) await recomputeCustomer(cu.id);
    return;
  }

  const templates = [
    {
      type: "دبل استاندارد",
      numbers: ["101", "102", "103", "104"],
      floor: 1,
      capacity: 2,
      extraBeds: 1,
      beds: "یک تخت دونفره کوئین",
      size: 24,
      view: "نمای باغ",
      price: 2800000,
      short: "اتاقی دنج و گرم با تخت دونفره کوئین، مناسب زوج‌ها و سفرهای کوتاه.",
      features: ["تخت کوئین", "تلویزیون هوشمند ۴۳ اینچ", "یخچال کوچک", "سرویس بهداشتی فرنگی", "دوش آب گرم معدنی", "اینترنت پرسرعت", "کتری برقی و چای‌ساز", "سشوار"],
    },
    {
      type: "توئین",
      numbers: ["105", "106", "107"],
      floor: 1,
      capacity: 2,
      extraBeds: 1,
      beds: "دو تخت یک‌نفره",
      size: 26,
      view: "نمای شهر",
      price: 2900000,
      short: "دو تخت مجزای یک‌نفره، مناسب همسفران و دوستان.",
      features: ["دو تخت سینگل", "میز کار", "تلویزیون هوشمند", "یخچال", "اینترنت پرسرعت", "گاوصندوق", "سرویس فرنگی و ایرانی"],
    },
    {
      type: "سه‌تخته",
      numbers: ["201", "202", "203"],
      floor: 2,
      capacity: 3,
      extraBeds: 1,
      beds: "یک تخت دونفره + یک تخت یک‌نفره",
      size: 32,
      view: "نمای کوه سبلان",
      price: 3600000,
      short: "اتاقی جادار با نمای کوه سبلان برای خانواده‌های سه‌نفره.",
      features: ["نمای سبلان", "بالکن اختصاصی", "تلویزیون هوشمند ۵۰ اینچ", "یخچال", "مبلمان راحتی", "اینترنت پرسرعت", "کتری و چای‌ساز"],
    },
    {
      type: "خانوادگی",
      numbers: ["204", "205", "206"],
      floor: 2,
      capacity: 4,
      extraBeds: 1,
      beds: "یک تخت دونفره + دو تخت یک‌نفره",
      size: 40,
      view: "نمای کوه سبلان",
      price: 4500000,
      short: "انتخاب محبوب خانواده‌ها؛ فضای بزرگ، بالکن و نشیمن کوچک.",
      features: ["نشیمن مجزا", "بالکن رو به کوه", "دو تلویزیون", "یخچال بزرگ", "آشپزخانه کوچک", "وان حمام", "اینترنت پرسرعت", "تخت نوزاد در صورت درخواست"],
    },
    {
      type: "سوئیت جونیور",
      numbers: ["301", "302"],
      floor: 3,
      capacity: 4,
      extraBeds: 2,
      beds: "یک تخت کینگ + کاناپه تختخواب‌شو",
      size: 55,
      view: "نمای پانوراما",
      price: 6200000,
      short: "سوئیتی شیک با اتاق خواب مجزا، نشیمن و نمای پانورامای سرعین.",
      features: ["اتاق خواب مجزا", "نشیمن لوکس", "تخت کینگ", "جکوزی", "آشپزخانه مجهز", "تلویزیون ۶۵ اینچ", "دستگاه قهوه‌ساز", "حوله و دمپایی لوکس", "ورود زودهنگام رایگان"],
    },
    {
      type: "سوئیت رویال آتالار",
      numbers: ["303"],
      floor: 3,
      capacity: 5,
      extraBeds: 2,
      beds: "تخت کینگ + دو تخت یک‌نفره",
      size: 75,
      view: "نمای پانوراما سبلان",
      price: 8900000,
      short: "لوکس‌ترین اقامتگاه آتالار؛ تراس اختصاصی، جکوزی و سانس رایگان استخر.",
      features: ["تراس اختصاصی ۲۰ متری", "دو اتاق خواب", "جکوزی سنگی", "شومینه", "آشپزخانه کامل", "یک سانس رایگان استخر خانوادگی", "صبحانه در اتاق", "ترانسفر رایگان", "مینی‌بار"],
    },
  ];

  const roomRows: (typeof rooms.$inferInsert)[] = [];
  let idx = 0;
  for (const t of templates) {
    for (const n of t.numbers) {
      const imgs = [
        IMG.rooms[idx % IMG.rooms.length],
        IMG.rooms[(idx + 3) % IMG.rooms.length],
        IMG.rooms[(idx + 5) % IMG.rooms.length],
        IMG.corridor,
      ];
      roomRows.push({
        name: `${t.type} ${n}`,
        slug: `room-${n}`,
        roomNumber: n,
        type: t.type,
        floor: t.floor,
        capacity: t.capacity,
        extraBeds: t.extraBeds,
        beds: t.beds,
        size: t.size,
        view: t.view,
        pricePerNight: t.price,
        holidayPrice: Math.round((t.price * 1.25) / 10000) * 10000,
        peakPrice: Math.round((t.price * 1.15) / 10000) * 10000,
        extraGuestPrice: t.type.startsWith("سوئیت") ? 600000 : 450000,
        options: [
          { id: "bf", title: "صبحانه بوفه محلی", price: 0, unit: "per_person_night" as const, included: true },
          { id: "lunch", title: "ناهار", price: 450000, unit: "per_person_night" as const, included: false },
          { id: "dinner", title: "شام", price: 400000, unit: "per_person_night" as const, included: false },
          { id: "transfer", title: "ترانسفر فرودگاه (رفت و برگشت)", price: 1500000, unit: "per_stay" as const, included: false },
        ],
        shortDescription: t.short,
        description: `${t.short}\n\nاتاق ${n} در طبقه ${t.floor} هتل آتالار قرار دارد و با دکوراسیونی الهام‌گرفته از معماری آذربایجان، چوب گردو و پارچه‌های دست‌بافت طراحی شده است. لوله‌کشی آب گرم معدنی سرعین مستقیماً به حمام اتاق متصل است تا تجربه‌ای آرامش‌بخش پس از یک روز گردش داشته باشید.\n\nصبحانه بوفه محلی شامل عسل سبلان، پنیر لیقوان و نان تازه تنوری در قیمت اتاق لحاظ شده است.`,
        features: t.features,
        images: imgs,
        videoUrl: idx % 3 === 0 ? VIDEO_ROOM : "",
        isActive: true,
        isFeatured: ["101", "204", "301", "303", "201", "105"].includes(n),
        sortOrder: idx,
      });
      idx++;
    }
  }
  const insertedRooms = await db.insert(rooms).values(roomRows).returning();

  const insertedServices = await db
    .insert(services)
    .values([
      {
        name: "استخر خانوادگی",
        slug: "family-pool",
        icon: "Waves",
        shortDescription: "استخر سرپوشیده آب گرم معدنی، به‌صورت اختصاصی برای هر خانواده در هر سانس.",
        description:
          "استخر خانوادگی آتالار با آب گرم معدنی طبیعی سرعین تغذیه می‌شود و دمای آب همیشه بین ۳۲ تا ۳۴ درجه است. هر سانس فقط به یک خانواده اختصاص دارد تا با آرامش و حریم کامل از شنا، جکوزی و سونای خشک لذت ببرید.\n\nاستخر دارای بخش کم‌عمق ویژه کودکان، جکوزی ۶ نفره، سونای خشک، رختکن و دوش اختصاصی، حوله و کلاه شنا است.",
        image: IMG.pool,
        gallery: [IMG.pool, ...IMG.poolStock],
        videoUrl: "",
        price: 1500000,
        priceUnit: "هر سانس ۹۰ دقیقه‌ای",
        workingHours: "همه‌روزه ۹ صبح تا ۱۲ شب",
        rules: [
          "هر سانس فقط به یک خانواده اختصاص دارد (حداکثر ۸ نفر).",
          "استفاده از کلاه شنا الزامی است.",
          "کودکان زیر ۱۲ سال فقط با همراهی والدین.",
          "لطفاً ۱۰ دقیقه قبل از شروع سانس حضور داشته باشید.",
          "ورود خوراکی به محوطه استخر ممنوع است.",
        ],
        timeSlots: ["09:00-10:30", "11:00-12:30", "13:00-14:30", "15:00-16:30", "17:00-18:30", "19:00-20:30", "21:00-22:30"],
        slotPrices: {
          "09:00-10:30": 1200000,
          "11:00-12:30": 1200000,
          "13:00-14:30": 1400000,
          "15:00-16:30": 1500000,
          "17:00-18:30": 1800000,
          "19:00-20:30": 1800000,
          "21:00-22:30": 1600000,
        },
        includedGuests: 4,
        extraGuestPrice: 250000,
        maxGuests: 8,
        isBookable: true,
        isActive: true,
        sortOrder: 0,
      },
      {
        name: "رستوران سنتی آتالار",
        slug: "restaurant",
        icon: "UtensilsCrossed",
        shortDescription: "غذاهای اصیل آذربایجانی و ایرانی با مواد اولیه محلی.",
        description:
          "در رستوران آتالار می‌توانید طعم آش دوغ اردبیل، کوفته تبریزی، کباب بره و حلوای سیاه را در فضایی گرم و سنتی تجربه کنید. صبحانه بوفه محلی برای مهمانان رایگان است.",
        image: IMG.buffet2,
        gallery: [IMG.buffet2, IMG.buffet, IMG.lobby],
        price: 0,
        priceUnit: "",
        workingHours: "صبحانه ۷ تا ۱۰ | ناهار ۱۲ تا ۱۵ | شام ۱۹ تا ۲۳",
        rules: [],
        timeSlots: [],
        isBookable: false,
        sortOrder: 1,
      },
      {
        name: "سونا و جکوزی",
        slug: "spa",
        icon: "Flame",
        shortDescription: "سونای خشک، بخار و جکوزی آب معدنی برای رفع خستگی سفر.",
        description: "مجموعه سونا و جکوزی آتالار در کنار استخر خانوادگی قرار دارد و در سانس‌های رزرو شده استخر به‌صورت رایگان در اختیار شماست.",
        image: IMG.poolStock[1],
        gallery: [IMG.poolStock[1], IMG.poolStock[2]],
        price: 0,
        priceUnit: "",
        workingHours: "همراه با سانس‌های استخر",
        rules: [],
        timeSlots: [],
        isBookable: false,
        sortOrder: 2,
      },
      {
        name: "ترانسفر فرودگاه",
        slug: "transfer",
        icon: "Plane",
        shortDescription: "رفت‌وبرگشت از فرودگاه و ترمینال اردبیل با خودروی هتل.",
        description: "با رزرو ترانسفر، راننده هتل در فرودگاه یا ترمینال اردبیل منتظر شما خواهد بود. فاصله فرودگاه اردبیل تا هتل حدود ۳۵ دقیقه است.",
        image: IMG.reception,
        gallery: [IMG.reception],
        price: 900000,
        priceUnit: "هر مسیر",
        workingHours: "۲۴ ساعته با هماهنگی",
        rules: ["رزرو حداقل ۲۴ ساعت قبل", "ظرفیت هر خودرو ۴ نفر"],
        timeSlots: ["08:00", "12:00", "16:00", "20:00"],
        maxGuests: 4,
        isBookable: true,
        sortOrder: 3,
      },
      {
        name: "تورهای گردشگری",
        slug: "tours",
        icon: "Mountain",
        shortDescription: "تورهای یک‌روزه سبلان، شورابیل، آلوارس و روستای ویلادره.",
        description: "کارشناسان گردشگری هتل برای شما تورهای یک‌روزه با راهنمای محلی برگزار می‌کنند. برای اطلاع از برنامه با پذیرش تماس بگیرید.",
        image: IMG.nature[0],
        gallery: [IMG.nature[0], IMG.nature[3]],
        price: 0,
        priceUnit: "",
        workingHours: "با هماهنگی پذیرش",
        rules: [],
        timeSlots: [],
        isBookable: false,
        sortOrder: 4,
      },
      {
        name: "کافه لابی",
        slug: "cafe",
        icon: "Coffee",
        shortDescription: "قهوه تخصصی، چای آتشی و شیرینی‌های محلی در لابی هتل.",
        description: "کافه لابی آتالار مکانی دلنشین برای گفت‌وگو و استراحت است؛ با منوی قهوه تخصصی، دمنوش‌های کوهستانی سبلان و شیرینی محلی اردبیل.",
        image: IMG.lobby,
        gallery: [IMG.lobby],
        price: 0,
        priceUnit: "",
        workingHours: "۸ صبح تا ۱ بامداد",
        rules: [],
        timeSlots: [],
        isBookable: false,
        sortOrder: 5,
      },
    ])
    .returning();

  await db.insert(amenities).values(
    [
      ["استخر خانوادگی اختصاصی", "Waves", "آب گرم معدنی با سانس‌های خصوصی", "تفریحی"],
      ["اینترنت پرسرعت رایگان", "Wifi", "وای‌فای فیبر نوری در تمام فضاها", "عمومی"],
      ["پارکینگ سرپوشیده", "Car", "پارکینگ رایگان و امن با دوربین", "عمومی"],
      ["صبحانه بوفه محلی", "Coffee", "عسل سبلان، پنیر لیقوان و نان تنوری", "پذیرایی"],
      ["رستوران سنتی", "UtensilsCrossed", "غذاهای اصیل آذربایجانی", "پذیرایی"],
      ["پذیرش ۲۴ ساعته", "ConciergeBell", "همیشه در خدمت شما هستیم", "عمومی"],
      ["آب گرم معدنی در اتاق", "Droplets", "حمام‌ها متصل به آب معدنی سرعین", "اتاق‌ها"],
      ["سیستم گرمایش از کف", "Flame", "گرمای مطبوع در زمستان سرد سبلان", "اتاق‌ها"],
      ["فضای بازی کودکان", "Baby", "اتاق بازی امن برای کودکان", "تفریحی"],
      ["خشکشویی و لباسشویی", "Shirt", "سرویس شست‌وشو در کمتر از ۲۴ ساعت", "خدمات"],
      ["ترانسفر فرودگاه", "Plane", "رفت‌وبرگشت از فرودگاه اردبیل", "خدمات"],
      ["امنیت و دوربین مداربسته", "ShieldCheck", "امنیت کامل در تمام ساعات", "عمومی"],
      ["دسترسی ویلچر", "Accessibility", "آسانسور و رمپ ویژه", "عمومی"],
      ["تلویزیون هوشمند", "Tv", "شبکه‌های ماهواره و نتفلیکس", "اتاق‌ها"],
    ].map(([title, icon, description, category], i) => ({ title, icon, description, category, sortOrder: i })),
  );

  await db.insert(attractions).values([
    {
      name: "آبگرم‌های سرعین",
      category: "طبیعی",
      description: "چشمه‌های آب گرم معدنی سرعین با خواص درمانی برای بیماری‌های پوستی، روماتیسم و رفع خستگی؛ مشهورترین جاذبه منطقه.",
      image: IMG.poolStock[0],
      distanceKm: 0.8,
      travelTime: "۱۰ دقیقه پیاده",
      lat: 38.1497,
      lng: 48.0717,
      sortOrder: 0,
    },
    {
      name: "تله‌کابین سبلان (آلوارس)",
      category: "تفریحی",
      description: "یکی از طولانی‌ترین تله‌کابین‌های ایران با چشم‌اندازی بی‌نظیر از دامنه‌های سبلان و دشت اردبیل.",
      image: IMG.nature[3],
      distanceKm: 18,
      travelTime: "۲۵ دقیقه با خودرو",
      lat: 38.2005,
      lng: 47.9286,
      sortOrder: 1,
    },
    {
      name: "قله سبلان",
      category: "طبیعی",
      description: "سومین قله بلند ایران با ارتفاع ۴۸۱۱ متر و دریاچه‌ای زیبا در دهانه آتشفشانی؛ مقصد کوهنوردان حرفه‌ای.",
      image: IMG.nature[2],
      distanceKm: 32,
      travelTime: "۵۰ دقیقه تا شابیل",
      lat: 38.2667,
      lng: 47.8167,
      sortOrder: 2,
    },
    {
      name: "دریاچه شورابیل",
      category: "طبیعی",
      description: "دریاچه‌ای زیبا در جنوب شهر اردبیل با امکانات قایق‌سواری، تله‌کابین و رستوران‌های ساحلی.",
      image: IMG.nature[6],
      distanceKm: 26,
      travelTime: "۳۰ دقیقه با خودرو",
      lat: 38.2276,
      lng: 48.3065,
      sortOrder: 3,
    },
    {
      name: "بقعه شیخ صفی‌الدین اردبیلی",
      category: "تاریخی",
      description: "مجموعه‌ای تاریخی از دوره صفویه و ثبت‌شده در فهرست میراث جهانی یونسکو با کاشی‌کاری‌های بی‌نظیر.",
      image: IMG.heritage[0],
      distanceKm: 27,
      travelTime: "۳۵ دقیقه با خودرو",
      lat: 38.2485,
      lng: 48.2934,
      sortOrder: 4,
    },
    {
      name: "دریاچه نئور",
      category: "طبیعی",
      description: "بزرگ‌ترین دریاچه کوهستانی ایران در ارتفاع ۲۵۰۰ متری، با مراتع سرسبز و عشایر کوچ‌رو.",
      image: IMG.nature[1],
      distanceKm: 58,
      travelTime: "۱ ساعت و ۱۰ دقیقه",
      lat: 37.9617,
      lng: 48.56,
      sortOrder: 5,
    },
    {
      name: "آبشار سردابه",
      category: "طبیعی",
      description: "آبشاری زیبا در روستای سردابه با مسیر پیاده‌روی دلنشین میان دره‌ای سرسبز.",
      image: IMG.nature[7],
      distanceKm: 14,
      travelTime: "۲۰ دقیقه با خودرو",
      lat: 38.1856,
      lng: 47.9843,
      sortOrder: 6,
    },
    {
      name: "روستای ویلادره",
      category: "روستایی",
      description: "روستایی پلکانی در دامنه سبلان با چشمه آب گرم، خانه‌های سنگی و صنایع دستی محلی.",
      image: IMG.nature[5],
      distanceKm: 6,
      travelTime: "۱۰ دقیقه با خودرو",
      lat: 38.1395,
      lng: 48.038,
      sortOrder: 7,
    },
  ]);

  // Demo transactions (reservations, messages, reviews, sample vouchers).
  // Skipped on production installs with SEED_DEMO=false.
  if (process.env.SEED_DEMO === "false") return;

  await db.insert(testimonials).values([
    { name: "مریم احمدی", city: "تهران", rating: 5, body: "استخر خانوادگی واقعاً فوق‌العاده بود؛ تمیز، خصوصی و آب گرم. بچه‌ها اصلاً دلشان نمی‌خواست بیرون بیایند!" },
    { name: "رضا کریمی", city: "تبریز", rating: 5, body: "پرسنل بسیار مهمان‌نواز و اتاق‌ها تمیز و گرم. صبحانه محلی با عسل سبلان را هرگز فراموش نمی‌کنم." },
    { name: "سارا محمدی", city: "اصفهان", rating: 4, body: "سوئیت رویال با نمای سبلان بی‌نظیر بود. فرایند رزرو و دریافت کد رزرو هم خیلی شفاف و سریع انجام شد." },
    { name: "علی نوروزی", city: "مشهد", rating: 5, body: "موقعیت عالی نزدیک آبگرم‌ها و بازار. حتماً دوباره به آتالار برمی‌گردیم." },
  ]);

  const today = todayISO();
  const pool = insertedServices[0];
  const r = (n: string) => insertedRooms.find((x) => x.roomNumber === n)!;
  const mk = (
    room: typeof insertedRooms[number],
    guestName: string,
    phone: string,
    offset: number,
    nights: number,
    status: "pending_payment" | "paid" | "confirmed" | "rejected" | "cancelled",
    guests: number,
  ) => {
    const total = room.pricePerNight * nights;
    return {
      trackingCode: genTrackingCode(),
      reservationCode: status === "confirmed" ? genReservationCode() : null,
      kind: "room" as const,
      roomId: room.id,
      itemName: room.name,
      guestName,
      phone,
      email: "",
      nationalId: "",
      guests,
      checkIn: addDaysISO(today, offset),
      checkOut: addDaysISO(today, offset + nights),
      nights,
      totalPrice: total,
      depositAmount: Math.round((total * 0.3) / 1000) * 1000,
      paymentMethod: status === "pending_payment" ? "" : "card",
      paymentRef: status === "pending_payment" ? "" : String(100000 + Math.floor(Math.random() * 899999)),
      paidAt: status === "pending_payment" ? null : new Date(),
      status,
      confirmedAt: status === "confirmed" ? new Date() : null,
    };
  };

  await db.insert(reservations).values([
    mk(r("204"), "حسین رضایی", "09121234567", 2, 3, "confirmed", 4),
    mk(r("101"), "نگار شریفی", "09351112233", 5, 2, "paid", 2),
    mk(r("303"), "امیر حسینی", "09141239876", 10, 4, "confirmed", 5),
    mk(r("201"), "فاطمه جعفری", "09193334455", 1, 1, "pending_payment", 3),
    mk(r("105"), "محمد صادقی", "09127778899", -3, 2, "confirmed", 2),
    mk(r("301"), "زهرا کاظمی", "09381212121", 7, 3, "rejected", 3),
    mk(r("205"), "کامران عباسی", "09145556677", 4, 2, "paid", 4),
    {
      trackingCode: genTrackingCode(),
      reservationCode: genReservationCode(),
      kind: "service" as const,
      serviceId: pool.id,
      itemName: pool.name,
      guestName: "حسین رضایی",
      phone: "09121234567",
      guests: 4,
      checkIn: addDaysISO(today, 3),
      timeSlot: "17:00-18:30",
      nights: 1,
      totalPrice: pool.price,
      depositAmount: Math.round((pool.price * 0.3) / 1000) * 1000,
      paymentMethod: "gateway",
      paymentRef: "784512",
      paidAt: new Date(),
      status: "confirmed" as const,
      confirmedAt: new Date(),
    },
    {
      trackingCode: genTrackingCode(),
      kind: "service" as const,
      serviceId: pool.id,
      itemName: pool.name,
      guestName: "لیلا مرادی",
      phone: "09367654321",
      guests: 5,
      checkIn: addDaysISO(today, 1),
      timeSlot: "19:00-20:30",
      nights: 1,
      totalPrice: pool.price,
      depositAmount: Math.round((pool.price * 0.3) / 1000) * 1000,
      paymentMethod: "card",
      paymentRef: "551209",
      paidAt: new Date(),
      status: "paid" as const,
    },
  ]);

  // demo bookkeeping: opening capital and a few operating expenses
  await ensureAccounts();
  const d = (offset: number) => dateToISO(new Date(Date.now() + offset * 86400000));
  const demo: [string, string, string, string, number][] = [
    [d(-25), "واریز سرمایه اولیه به حساب بانکی", "110201", "310101", 1_500_000_000],
    [d(-20), "پرداخت حقوق کارکنان", "510101", "110201", 186_000_000],
    [d(-15), "قبوض آب، برق و گاز", "510201", "110201", 24_500_000],
    [d(-10), "خرید مواد غذایی رستوران", "510401", "110101", 38_000_000],
    [d(-7), "سرویس دوره‌ای و مواد ضدعفونی استخر", "510302", "110101", 12_800_000],
    [d(-4), "تبلیغات اینترنتی", "520101", "110201", 9_500_000],
    [d(-2), "فروش رستوران به مهمانان غیرمقیم", "110101", "420101", 17_400_000],
  ];
  for (const [date, description, dr, cr, amount] of demo) {
    await createVoucher({
      date,
      description,
      source: description.startsWith("فروش") ? "income" : description.startsWith("واریز") ? "manual" : "expense",
      createdBy: "مدیر هتل",
      lines: [
        { code: dr, debit: amount, credit: 0 },
        { code: cr, debit: 0, credit: amount },
      ],
    });
  }

  await db.insert(messages).values([
    { name: "پریسا نادری", phone: "09125550000", email: "parisa@example.com", subject: "سؤال درباره استخر", body: "سلام، آیا امکان رزرو دو سانس پشت سر هم استخر خانوادگی وجود دارد؟ ما ۶ نفر هستیم." },
    { name: "مهدی فرهادی", phone: "09141110000", email: "", subject: "تخفیف گروهی", body: "برای یک گروه ۱۲ نفره در اواخر شهریور، چه تخفیفی در نظر می‌گیرید؟" },
    { name: "Elena Petrova", phone: "", email: "elena@example.com", subject: "English speaking staff", body: "Hello, do you have English speaking staff at reception? We plan to visit in autumn.", isRead: true },
  ]);

  await insertVenues(ATALAR_VENUES, true);
  await db.insert(settings).values({ key: "seed_dining_v1", value: "1" }).onConflictDoNothing();
  // everything created above on an empty database is demo data
  await markAllDemo();
}

export async function markAllDemo() {
  await db.update(reservations).set({ isDemo: true });
  await db.update(messages).set({ isDemo: true });
  await db.update(testimonials).set({ isDemo: true });
  await db.update(journalEntries).set({ isDemo: true });
}

/**
 * Upgrade path for sites installed before the dining module:
 * add the sample restaurant & café once – only while the site is still in demo mode.
 */
export async function ensureDiningDemo() {
  const flag = await db.select().from(settings).where(sql`${settings.key} = 'seed_dining_v1'`);
  if (flag.length) return;
  const done = () => db.insert(settings).values({ key: "seed_dining_v1", value: "1" }).onConflictDoNothing();
  if (process.env.DEMO_MODE === "false" || process.env.SEED_DEMO === "false") return done();
  const demo = await db.select().from(settings).where(sql`${settings.key} = 'demoMode'`);
  if (demo[0] && demo[0].value !== "1") return done();
  const [{ c }] = await db.select({ c: sql<number>`count(*)::int` }).from(diningVenues);
  if (c === 0) await insertVenues(ATALAR_VENUES, true);
  await done(); // only after a successful insert
}
