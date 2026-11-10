import { db } from "@/db";
import { amenities, attractions, rooms, services, settings, testimonials } from "@/db/schema";
import { cityBookingContent, cityHomeContent } from "./presets";
import { CITY_VENUES, DINING_IMG, insertVenues } from "./seed-dining";

const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280`;
const ROOM_IMGS = [6434592, 40624479, 97083, 7507131, 2736384, 24461266, 8082217, 6466496].map(px);

/** Demo data for a 3-star city hotel (HOTEL_PRESET=city). Runs only on an empty database. */
export async function seedCityPreset() {
  const name = process.env.HOTEL_NAME?.trim() || "هتل نارون";
  const brand = name.replace(/^هتل\s*/, "");
  const city = process.env.HOTEL_CITY?.trim() || "تبریز";

  const s: Record<string, string> = {
    hotelName: name,
    hotelNameEn: "Narvan Hotel",
    tagline: "اقامتی دنج در قلب شهر",
    stars: "3",
    city,
    foundedYear: "1395",
    phone: "041-35550000",
    mobile: "0914-000-0000",
    email: "info@narvanhotel.ir",
    address: `${city}، خیابان امام خمینی، نرسیده به بازار بزرگ، ${name}`,
    lat: "38.0786",
    lng: "46.2937",
    siteTemplate: "boutique",
    palette: "navy",
    moduleDining: "1",
    moduleServices: "1",
    moduleAmenities: "1",
    moduleAttractions: "1",
    seoDescription: `${name} ${city}؛ هتل سه ستاره در مرکز شهر با کافه، رستوران تبریزی و رزرو آنلاین.`,
    footerText: `${name} در قلب ${city}، چند قدم تا بازار تاریخی؛ با اتاق‌های آرام، کافه‌ای دنج و رستورانی با طعم‌های اصیل تبریزی.`,
    aboutTitle: `داستان ${name}`,
    aboutText: `${name} در سال ۱۳۹۵ در یکی از خانه‌های قدیمی بازسازی‌شده مرکز ${city} افتتاح شد. ما با ۲۰ اتاق و سوئیت، کافه‌ای که پاتوق اهالی محله است و رستورانی با آشپزخانه باز، تلاش می‌کنیم تجربه‌ای صمیمی و اصیل از سفر به ${city} بسازیم.`,
    checkInTime: "14:00",
    checkOutTime: "12:00",
    depositPercent: "30",
    instagram: "narvan.hotel",
    telegram: "narvanhotel",
  };
  for (const [key, value] of Object.entries(s)) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  await db.insert(settings).values({ key: "content_home", value: JSON.stringify(cityHomeContent(name, city, 3)) }).onConflictDoNothing();
  await db.insert(settings).values({ key: "content_booking", value: JSON.stringify(cityBookingContent()) }).onConflictDoNothing();

  const templates = [
    { type: "یک‌نفره", numbers: ["101", "102", "103", "104"], floor: 1, capacity: 1, extra: 0, beds: "یک تخت یک‌نفره بزرگ", size: 16, view: "نمای حیاط", price: 1600000, features: ["میز کار", "تلویزیون هوشمند", "اینترنت پرسرعت", "کتری و چای‌ساز"] },
    { type: "دبل", numbers: ["105", "106", "201", "202", "203", "204"], floor: 2, capacity: 2, extra: 1, beds: "یک تخت دونفره کوئین", size: 22, view: "نمای شهر", price: 2300000, features: ["تخت کوئین", "تلویزیون هوشمند", "یخچال کوچک", "اینترنت پرسرعت", "سشوار"] },
    { type: "توئین", numbers: ["205", "206", "301", "302"], floor: 3, capacity: 2, extra: 1, beds: "دو تخت یک‌نفره", size: 23, view: "نمای شهر", price: 2300000, features: ["دو تخت سینگل", "میز کار", "تلویزیون هوشمند", "اینترنت پرسرعت"] },
    { type: "سه‌تخته", numbers: ["303", "304", "305"], floor: 3, capacity: 3, extra: 1, beds: "یک تخت دونفره + یک تخت یک‌نفره", size: 28, view: "نمای بازار", price: 2900000, features: ["مبلمان راحتی", "یخچال", "تلویزیون هوشمند", "اینترنت پرسرعت"] },
    { type: "سوئیت خانوادگی", numbers: ["401", "402", "403"], floor: 4, capacity: 4, extra: 2, beds: "یک تخت دونفره + دو تخت یک‌نفره", size: 42, view: "نمای پانوراما شهر", price: 3900000, features: ["اتاق خواب مجزا", "نشیمن", "آشپزخانه کوچک", "وان حمام", "دو تلویزیون"] },
  ];
  let idx = 0;
  const roomRows: (typeof rooms.$inferInsert)[] = [];
  for (const t of templates) {
    for (const n of t.numbers) {
      roomRows.push({
        name: `اتاق ${t.type} ${n}`,
        slug: `room-${n}`,
        roomNumber: n,
        type: t.type,
        floor: t.floor,
        capacity: t.capacity,
        extraBeds: t.extra,
        beds: t.beds,
        size: t.size,
        view: t.view,
        pricePerNight: t.price,
        holidayPrice: Math.round((t.price * 1.2) / 10000) * 10000,
        peakPrice: Math.round((t.price * 1.1) / 10000) * 10000,
        extraGuestPrice: 400000,
        shortDescription: `اتاق ${t.type} آرام و تمیز با ${t.beds}، مناسب سفرهای کاری و تفریحی.`,
        description: `اتاق ${n} در طبقه ${t.floor} قرار دارد و با دکوراسیونی ساده و گرم، الهام‌گرفته از معماری آجری ${city} طراحی شده است.\n\nصبحانه بوفه و اینترنت پرسرعت در قیمت اتاق لحاظ شده است.`,
        features: t.features,
        images: [ROOM_IMGS[idx % 8], ROOM_IMGS[(idx + 3) % 8], ROOM_IMGS[(idx + 5) % 8]],
        options: [
          { id: "bf", title: "صبحانه بوفه", price: 0, unit: "per_person_night", included: true },
          { id: "dinner", title: "شام در رستوران", price: 450000, unit: "per_person_night", included: false },
          { id: "late", title: "تحویل دیرهنگام اتاق (تا ساعت ۱۸)", price: 700000, unit: "per_stay", included: false },
          { id: "transfer", title: "ترانسفر فرودگاه", price: 900000, unit: "per_stay", included: false },
        ],
        isFeatured: ["101", "201", "205", "303", "401", "402"].includes(n),
        sortOrder: idx++,
      });
    }
  }
  await db.insert(rooms).values(roomRows);

  await db.insert(services).values([
    {
      name: "سالن جلسات",
      slug: "meeting-room",
      icon: "Briefcase",
      shortDescription: "سالن جلسات ۲۰ نفره با ویدیوپروژکتور، اینترنت و پذیرایی.",
      description: "سالن جلسات هتل برای جلسات کاری، کارگاه‌ها و مصاحبه‌ها با تجهیزات کامل صوتی و تصویری در اختیار مهمانان و سازمان‌هاست. پذیرایی از کافه هتل قابل سفارش است.",
      image: DINING_IMG.lobby,
      gallery: [DINING_IMG.lobby],
      price: 2500000,
      priceUnit: "هر سانس ۳ ساعته",
      workingHours: "همه روزه ۸ تا ۲۲",
      rules: ["رزرو حداقل ۲۴ ساعت قبل", "ظرفیت حداکثر ۲۰ نفر", "پذیرایی جداگانه محاسبه می‌شود"],
      timeSlots: ["09:00-12:00", "13:00-16:00", "17:00-20:00"],
      slotPrices: { "09:00-12:00": 2500000, "13:00-16:00": 2500000, "17:00-20:00": 3000000 },
      includedGuests: 10,
      extraGuestPrice: 150000,
      maxGuests: 20,
      isBookable: true,
      sortOrder: 0,
    },
    {
      name: "ترانسفر فرودگاه و راه‌آهن",
      slug: "transfer",
      icon: "Plane",
      shortDescription: "رفت‌وبرگشت از فرودگاه و راه‌آهن با خودروی هتل.",
      description: "راننده هتل در فرودگاه یا ایستگاه راه‌آهن منتظر شما خواهد بود.",
      image: DINING_IMG.lobby,
      price: 900000,
      priceUnit: "هر مسیر",
      workingHours: "۲۴ ساعته",
      rules: ["رزرو حداقل ۱۲ ساعت قبل", "ظرفیت هر خودرو ۴ نفر"],
      timeSlots: ["06:00", "10:00", "14:00", "18:00", "22:00"],
      maxGuests: 4,
      includedGuests: 4,
      isBookable: true,
      sortOrder: 1,
    },
    { name: "تور شهرگردی", slug: "city-tour", icon: "Landmark", shortDescription: "تور پیاده بازار و بناهای تاریخی با راهنمای محلی.", description: "هر روز صبح تور پیاده‌روی بازار تاریخی و بناهای اطراف با راهنمای محلی از لابی هتل آغاز می‌شود.", image: "https://images.pexels.com/photos/15886871/pexels-photo-15886871.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280", workingHours: "همه روزه ساعت ۹ صبح", sortOrder: 2 },
    { name: "خشکشویی و اتوشویی", slug: "laundry", icon: "Shirt", shortDescription: "تحویل در کمتر از ۲۴ ساعت.", description: "لباس‌های خود را به پذیرش تحویل دهید؛ ظرف ۲۴ ساعت شسته و اتو شده تحویل می‌گیرید.", image: px(6466496), workingHours: "۸ تا ۲۰", sortOrder: 3 },
  ]);

  await db.insert(amenities).values(
    [
      ["کافه و رستوران", "Coffee", "قهوه تخصصی و غذای محلی", "پذیرایی"],
      ["صبحانه بوفه رایگان", "Utensils", "ایرانی و اروپایی", "پذیرایی"],
      ["اینترنت پرسرعت رایگان", "Wifi", "فیبر نوری در همه فضاها", "عمومی"],
      ["موقعیت مرکز شهر", "MapPin", "پیاده تا بازار و جاذبه‌ها", "عمومی"],
      ["پذیرش ۲۴ ساعته", "ConciergeBell", "همیشه در خدمت شما", "عمومی"],
      ["سالن جلسات", "Briefcase", "مجهز به ویدیوپروژکتور", "کسب‌وکار"],
      ["پارکینگ", "Car", "پارکینگ اختصاصی مهمانان", "عمومی"],
      ["آسانسور", "Building2", "دسترسی به همه طبقات", "عمومی"],
      ["تلویزیون هوشمند", "Tv", "در همه اتاق‌ها", "اتاق‌ها"],
      ["سیستم سرمایش و گرمایش", "Snowflake", "قابل تنظیم در هر اتاق", "اتاق‌ها"],
      ["خشکشویی", "Shirt", "تحویل ۲۴ ساعته", "خدمات"],
      ["ترانسفر", "Plane", "فرودگاه و راه‌آهن", "خدمات"],
    ].map(([title, icon, description, category], i) => ({ title, icon, description, category, sortOrder: i })),
  );

  await db.insert(attractions).values([
    { name: "بازار تاریخی تبریز", category: "تاریخی", description: "بزرگ‌ترین بازار سرپوشیده جهان و ثبت‌شده در فهرست میراث جهانی یونسکو.", image: "https://images.pexels.com/photos/15886871/pexels-photo-15886871.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280", distanceKm: 0.4, travelTime: "۵ دقیقه پیاده", lat: 38.0806, lng: 46.2931, sortOrder: 0 },
    { name: "خانه بهنام", category: "تاریخی", description: "خانه‌ای زیبا از دوره قاجار با حیاط و حوض‌های دلنشین.", image: "https://images.pexels.com/photos/16651521/pexels-photo-16651521.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280", distanceKm: 1.2, travelTime: "۱۵ دقیقه پیاده", lat: 38.0771, lng: 46.3018, sortOrder: 1 },
    { name: "مسجد کبود", category: "تاریخی", description: "شاهکار کاشی‌کاری فیروزه‌ای دوره قراقویونلوها.", image: "https://images.pexels.com/photos/31085604/pexels-photo-31085604.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280", distanceKm: 1.6, travelTime: "۵ دقیقه با خودرو", lat: 38.0752, lng: 46.3047, sortOrder: 2 },
    { name: "ارگ علیشاه", category: "تاریخی", description: "بنای آجری عظیم از دوره ایلخانی در مرکز شهر.", image: "https://images.pexels.com/photos/14537427/pexels-photo-14537427.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280", distanceKm: 1.0, travelTime: "۱۲ دقیقه پیاده", lat: 38.0716, lng: 46.2882, sortOrder: 3 },
    { name: "ائل‌گلی", category: "تفریحی", description: "باغ و استخر تاریخی بزرگ با عمارت کلاه‌فرنگی؛ تفرجگاه محبوب شهر.", image: px(39463383), distanceKm: 6, travelTime: "۱۵ دقیقه با خودرو", lat: 38.0262, lng: 46.3647, sortOrder: 4 },
    { name: "روستای کندوان", category: "روستایی", description: "روستای صخره‌ای منحصربه‌فرد با خانه‌های کندویی در دامنه سهند.", image: px(4146757), distanceKm: 55, travelTime: "۱ ساعت با خودرو", lat: 37.7944, lng: 46.2489, sortOrder: 5 },
  ]);

  await insertVenues(CITY_VENUES(brand), true);

  if (process.env.SEED_DEMO !== "false") {
    await db.insert(testimonials).values([
      { name: "نیلوفر صمدی", city: "تهران", rating: 5, body: "موقعیت عالی کنار بازار و کافه‌ای فوق‌العاده. صبحانه هم کامل و تازه بود.", isDemo: true },
      { name: "بهروز قاسمی", city: "اصفهان", rating: 4, body: "برای سفر کاری انتخاب خوبی بود؛ اینترنت سریع و اتاق ساکت. کوفته تبریزی رستوران را حتماً امتحان کنید.", isDemo: true },
      { name: "آیدا رستمی", city: "شیراز", rating: 5, body: "پرسنل خیلی مهربان و اتاق تمیز. فرایند رزرو آنلاین و دریافت کد رزرو هم ساده بود.", isDemo: true },
    ]);
  }
}
