import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  amenities,
  attractions,
  campaigns,
  customerGroupMembers,
  customerGroups,
  customers,
  giftCards,
  guestRequestMessages,
  guestRequests,
  partners,
  reservationGuests,
  reservations,
  rooms,
  services,
  settings,
  smsTemplates,
  tableBookings,
  testimonials,
  type ReservationSource,
} from "@/db/schema";
import { defaultBooking, defaultHome } from "./content";
import { DINING_IMG, insertVenues } from "./seed-dining";
import { insertExtrasDemo } from "./seed-extras";
import { addDaysISO, genReservationCode, genTrackingCode, todayISO } from "./utils";

const px = (id: number) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280`;
const ROOM_IMGS = [8082217, 6434592, 40624479, 24461266, 97083, 7507131, 2736384, 6466496].map(px);
const HERO = "/images/espinas-hero.jpg";

/** Espinas Palace Tehran – default dataset for empty databases. */
export async function seedEspinasPreset() {
  const name = process.env.HOTEL_NAME?.trim() || "هتل اسپیناس پالاس";
  const s: Record<string, string> = {
    hotelName: name,
    hotelNameEn: "Espinas Palace Hotel",
    tagline: "شکوه مهمان‌نوازی در دامنه البرز",
    stars: "5",
    city: "تهران",
    foundedYear: "1394",
    phone: "021-00000000",
    mobile: "0912-000-0000",
    email: "info@espinaspalace.example",
    address: "تهران، سعادت‌آباد، میدان بهرود، خیابان عابدی، خیابان ۳۳، هتل اسپیناس پالاس",
    lat: "35.7863",
    lng: "51.3587",
    checkInTime: "14:00",
    checkOutTime: "12:00",
    depositPercent: "30",
    siteTemplate: "opus",
    palette: "champagne",
    moduleDining: "1",
    moduleServices: "1",
    moduleAmenities: "1",
    moduleAttractions: "1",
    moduleOffers: "1",
    moduleGallery: "1",
    moduleFaq: "1",
    instagram: "",
    telegram: "",
    whatsapp: "",
    seoDescription: `${name} تهران؛ هتلی لوکس در سعادت‌آباد با چشم‌انداز البرز، سوئیت‌های مجلل، رستوران‌ها و اسکای لانژ، اسپا و سالن‌های همایش، همراه با رزرو آنلاین.`,
    footerText: `${name} در شمال غرب تهران و منطقه آرام سعادت‌آباد؛ با اتاق‌ها و سوئیت‌های مجلل، رستوران‌های متنوع، اسکای لانژ با چشم‌انداز تهران و البرز، اسپا و سالن‌های همایش.`,
    aboutTitle: `داستان ${name}`,
    aboutText: `${name} با معماری مدرن و چشم‌اندازی بی‌نظیر به رشته‌کوه البرز و شهر تهران، در منطقه سعادت‌آباد میزبان مسافران تجاری، خانواده‌ها و مهمانان ویژه است. اتاق‌ها و سوئیت‌های متنوع، رستوران‌های ایرانی و بین‌المللی، اسکای لانژ طبقه بالا، مرکز اسپا و سالن‌های همایش مجهز، تجربه‌ای کامل از اقامت لوکس را فراهم می‌کنند.`,
    wifiName: "Espinas-Guest",
    wifiPassword: "welcome2025",
    receptionExt: "0",
    cardNumber: "6037-0000-0000-0000",
    cardHolder: name,
    bankName: "بانک ملی ایران",
  };
  for (const [key, value] of Object.entries(s)) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value } });
  }

  const home = {
    ...defaultHome,
    heroMedia: [
      { url: HERO, type: "image" as const, duration: 7 },
      { url: "https://videos.pexels.com/video-files/4101507/4101507-hd_1920_1080_25fps.mp4", type: "video" as const, duration: 0 },
      { url: px(12391805), type: "image" as const, duration: 6 },
    ],
    heroBadge: `هتل ۵ ستاره تهران`,
    heroTitle: name.replace(/^هتل\s*/, ""),
    heroHighlight: "شکوه مهمان‌نوازی",
    heroText: "اقامتی مجلل در سعادت‌آباد تهران با چشم‌انداز البرز؛ سوئیت‌های لوکس، اسکای لانژ، اسپا و رستوران‌هایی با طعم‌های ایرانی و بین‌المللی.",
    heroPrimaryCta: "رزرو آنلاین",
    heroSecondaryCta: "اتاق‌ها و سوئیت‌ها",
    stats: [
      { icon: "BedDouble", value: "۳۲", label: "اتاق و سوئیت" },
      { icon: "UtensilsCrossed", value: "۴", label: "رستوران و لانژ" },
      { icon: "Briefcase", value: "۳", label: "سالن همایش" },
      { icon: "Star", value: "۴.۸", label: "رضایت مهمانان" },
    ],
    features: [
      { icon: "Mountain", title: "چشم‌انداز البرز", text: "نمای پانورامای تهران" },
      { icon: "UtensilsCrossed", title: "اسکای لانژ", text: "طبقه بالای هتل" },
      { icon: "Droplets", title: "اسپا و استخر", text: "سونا، جکوزی، ماساژ" },
      { icon: "KeyRound", title: "رزرو قطعی", text: "با صدور کد رزرو" },
    ],
    roomsEyebrow: "اقامتگاه‌ها",
    roomsTitle: "اتاق‌ها و سوئیت‌های مجلل",
    roomsText: "از دبل دلوکس تا سوئیت پرزیدنتال؛ همه با صبحانه بوفه بین‌المللی، اینترنت پرسرعت و خدمات ۲۴ ساعته.",
    poolEyebrow: "اسپا و ولنس",
    poolTitle: "مرکز اسپا و ماساژ",
    poolText: "استخر سرپوشیده، سونای خشک و بخار، جکوزی و اتاق‌های ماساژ تخصصی؛ لحظاتی آرام در قلب تهران.",
    poolMedia: [{ url: px(261041), type: "image" as const, duration: 6 }, { url: px(20705879), type: "image" as const, duration: 6 }],
    poolFeatures: ["استخر سرپوشیده", "سونای خشک و بخار", "جکوزی", "ماساژ تخصصی"],
    poolBadgeTop: "رزرو آنلاین",
    poolBadgeBottom: "سانس ماساژ",
    poolCta: "رزرو سانس اسپا",
    spotlightServiceSlug: "spa",
    diningEyebrow: "رستوران‌ها و لانژ",
    diningTitle: "از صبحانه بوفه تا شام در اسکای لانژ",
    diningText: "رستوران‌های ایرانی و بین‌المللی، کافه لابی و اسکای لانژ با چشم‌انداز شبانه تهران؛ میز خود را آنلاین رزرو کنید.",
    diningCta: "منو و رزرو میز",
    attractionsTitle: "جاذبه‌های نزدیک هتل در تهران",
    attractionsText: "هتل در دسترسی آسان به برج میلاد، پل طبیعت، کاخ سعدآباد و مراکز خرید شمال تهران قرار دارد.",
    mapTitle: "سعادت‌آباد، میدان بهرود",
    sectionOrder: ["features", "rooms", "offers", "dining", "spotlight", "amenities", "gallery", "services", "attractions", "reviews", "faq", "track", "map"],
  };
  await db.insert(settings).values({ key: "content_home", value: JSON.stringify(home) }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(home) } });
  const booking = {
    ...defaultBooking,
    steps: [
      { emoji: "🔎", title: "انتخاب اتاق یا خدمت", text: "از میان اتاق‌ها و سوئیت‌های هتل یا سانس‌های اسپا و سالن همایش، گزینه مناسب را انتخاب کنید." },
      ...defaultBooking.steps.slice(1),
    ],
  };
  await db.insert(settings).values({ key: "content_booking", value: JSON.stringify(booking) }).onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(booking) } });

  /* ---------- rooms ---------- */
  const T = [
    { type: "دبل دلوکس", n: ["501", "502", "503", "504", "505", "601", "602", "603"], floor: 5, cap: 2, extra: 1, beds: "یک تخت کینگ", size: 32, view: "نمای شهر", price: 14_500_000, f: ["تخت کینگ", "تلویزیون هوشمند ۵۵ اینچ", "مینی‌بار", "دستگاه قهوه‌ساز", "گاوصندوق", "حمام با دوش باران‌دار", "اینترنت پرسرعت"] },
    { type: "توئین دلوکس", n: ["604", "605", "606", "701", "702", "703"], floor: 6, cap: 2, extra: 1, beds: "دو تخت یک‌نفره کوئین", size: 32, view: "نمای شهر", price: 14_500_000, f: ["دو تخت کوئین", "میز کار", "تلویزیون هوشمند", "مینی‌بار", "گاوصندوق", "اینترنت پرسرعت"] },
    { type: "اگزکیوتیو", n: ["704", "705", "801", "802", "803", "804"], floor: 8, cap: 2, extra: 1, beds: "یک تخت کینگ", size: 40, view: "نمای البرز", price: 18_500_000, f: ["نمای البرز", "دسترسی به لانژ اگزکیوتیو", "نشیمن کوچک", "وان و دوش مجزا", "دستگاه اسپرسو", "ترنس‌لیت و حوله لوکس"] },
    { type: "جونیور سوئیت", n: ["901", "902", "903", "904"], floor: 9, cap: 3, extra: 1, beds: "تخت کینگ + کاناپه تخت‌خواب‌شو", size: 58, view: "نمای پانوراما", price: 26_000_000, f: ["نشیمن مجزا", "نمای پانوراما", "وان جکوزی", "دو تلویزیون", "پذیرایی ویژه ورود", "ورود زودهنگام (در صورت امکان)"] },
    { type: "سوئیت اگزکیوتیو", n: ["1001", "1002", "1003"], floor: 10, cap: 4, extra: 2, beds: "تخت کینگ + دو تخت یک‌نفره", size: 85, view: "نمای البرز", price: 34_000_000, f: ["اتاق خواب و نشیمن مجزا", "میز ناهارخوری", "آشپزخانه کوچک", "جکوزی", "دسترسی لانژ اگزکیوتیو", "صبحانه در اتاق"] },
    { type: "سوئیت رویال", n: ["1101", "1102"], floor: 11, cap: 4, extra: 2, beds: "دو اتاق خواب", size: 140, view: "نمای پانوراما ۳۶۰", price: 52_000_000, f: ["دو اتاق خواب", "نشیمن و ناهارخوری مجلل", "تراس اختصاصی", "جکوزی و سونای خصوصی", "خدمات باتلر", "ترانسفر رایگان فرودگاه"] },
    { type: "سوئیت پرزیدنتال", n: ["1201", "1202", "1203"], floor: 12, cap: 6, extra: 2, beds: "سه اتاق خواب", size: 210, view: "نمای پانوراما ۳۶۰", price: 95_000_000, f: ["سه اتاق خواب", "اتاق جلسات خصوصی", "تراس بزرگ", "اسپای خصوصی", "خدمات باتلر ۲۴ ساعته", "ورود VIP و ترانسفر لوکس"] },
  ];
  let idx = 0;
  const roomRows: (typeof rooms.$inferInsert)[] = [];
  for (const t of T) {
    for (const n of t.n) {
      roomRows.push({
        name: `${t.type} ${n}`,
        slug: `room-${n}`,
        roomNumber: n,
        type: t.type,
        floor: Number(n.slice(0, -2)) || t.floor,
        capacity: t.cap,
        extraBeds: t.extra,
        beds: t.beds,
        size: t.size,
        view: t.view,
        pricePerNight: t.price,
        holidayPrice: Math.round((t.price * 1.15) / 100000) * 100000,
        peakPrice: Math.round((t.price * 1.1) / 100000) * 100000,
        extraGuestPrice: t.price >= 26_000_000 ? 2_500_000 : 1_800_000,
        shortDescription: `${t.type} با ${t.beds} و ${t.view}؛ ${t.size} متر مربع فضای مجلل.`,
        description: `${t.type} ${n} در طبقه ${Number(n.slice(0, -2))} ${name} قرار دارد و با مبلمان سفارشی، نورپردازی گرم و ${t.view}، فضایی آرام برای اقامت تجاری یا تفریحی فراهم می‌کند.\n\nصبحانه بوفه بین‌المللی، اینترنت پرسرعت، استفاده از باشگاه بدنسازی و پارکینگ در قیمت اتاق لحاظ شده است.`,
        features: t.f,
        images: [ROOM_IMGS[idx % 8], ROOM_IMGS[(idx + 3) % 8], ROOM_IMGS[(idx + 5) % 8], DINING_IMG.lobby],
        options: [
          { id: "bf", title: "صبحانه بوفه بین‌المللی", price: 0, unit: "per_person_night", included: true },
          { id: "dinner", title: "شام در رستوران", price: 1_400_000, unit: "per_person_night", included: false },
          { id: "spa", title: "یک سانس اسپا و ماساژ", price: 3_500_000, unit: "per_person", included: false },
          { id: "transfer", title: "ترانسفر فرودگاه امام (یک‌طرفه)", price: 3_000_000, unit: "per_stay", included: false },
          { id: "late", title: "تخلیه دیرهنگام تا ساعت ۱۸", price: 4_000_000, unit: "per_stay", included: false },
        ],
        isFeatured: ["501", "604", "801", "901", "1001", "1101", "1201"].includes(n),
        sortOrder: idx++,
      });
    }
  }
  const insertedRooms = await db.insert(rooms).values(roomRows).returning();

  /* ---------- services ---------- */
  await db.insert(services).values([
    {
      name: "اسپا و ماساژ",
      slug: "spa",
      icon: "Droplets",
      shortDescription: "سانس‌های ماساژ تخصصی، سونا و جکوزی با رزرو آنلاین.",
      description: "مرکز اسپای هتل شامل استخر سرپوشیده، سونای خشک و بخار، جکوزی و اتاق‌های ماساژ با درمانگران مجرب است. هر سانس شامل استفاده از سونا و جکوزی است.",
      image: px(20705879),
      gallery: [px(20705879), px(261041), px(7222170)],
      price: 3_500_000,
      priceUnit: "هر سانس ۶۰ دقیقه‌ای",
      workingHours: "همه روزه ۱۰ تا ۲۲",
      rules: ["رزرو حداقل ۳ ساعت قبل", "لطفاً ۱۰ دقیقه قبل از سانس حضور داشته باشید", "ورود افراد زیر ۱۶ سال فقط با همراه"],
      timeSlots: ["10:00-11:00", "11:30-12:30", "14:00-15:00", "15:30-16:30", "17:00-18:00", "18:30-19:30", "20:00-21:00"],
      slotPrices: { "10:00-11:00": 3_000_000, "11:30-12:30": 3_000_000, "14:00-15:00": 3_500_000, "15:30-16:30": 3_500_000, "17:00-18:00": 4_000_000, "18:30-19:30": 4_000_000, "20:00-21:00": 3_800_000 },
      includedGuests: 1,
      extraGuestPrice: 2_800_000,
      maxGuests: 2,
      isBookable: true,
      sortOrder: 0,
    },
    {
      name: "سالن‌های همایش و جلسات",
      slug: "meeting",
      icon: "Briefcase",
      shortDescription: "سه سالن همایش ۲۰ تا ۲۵۰ نفره با تجهیزات کامل صوتی و تصویری.",
      description: "سالن‌های همایش هتل برای سمینار، جلسات هیئت‌مدیره، مراسم و رویدادهای سازمانی با پذیرایی اختصاصی آماده‌اند.",
      image: DINING_IMG.restaurantHall,
      gallery: [DINING_IMG.restaurantHall, DINING_IMG.lobby],
      price: 25_000_000,
      priceUnit: "هر سانس ۴ ساعته",
      workingHours: "همه روزه ۸ تا ۲۳",
      rules: ["رزرو حداقل ۴۸ ساعت قبل", "پذیرایی جداگانه محاسبه می‌شود"],
      timeSlots: ["08:00-12:00", "13:00-17:00", "18:00-22:00"],
      slotPrices: { "08:00-12:00": 25_000_000, "13:00-17:00": 25_000_000, "18:00-22:00": 32_000_000 },
      includedGuests: 50,
      extraGuestPrice: 300_000,
      maxGuests: 250,
      isBookable: true,
      sortOrder: 1,
    },
    { name: "ترانسفر فرودگاه", slug: "transfer", icon: "Plane", shortDescription: "ترانسفر لوکس از فرودگاه امام و مهرآباد.", description: "راننده هتل با خودروی لوکس در فرودگاه منتظر شماست.", image: DINING_IMG.lobby, price: 3_000_000, priceUnit: "هر مسیر", workingHours: "۲۴ ساعته", timeSlots: ["06:00", "10:00", "14:00", "18:00", "22:00", "02:00"], maxGuests: 4, includedGuests: 4, isBookable: true, sortOrder: 2 },
    { name: "باشگاه بدنسازی", slug: "fitness", icon: "Dumbbell", shortDescription: "باشگاه مجهز ۲۴ ساعته برای مهمانان.", description: "باشگاه بدنسازی با تجهیزات کاردیو و بدنسازی به‌صورت رایگان در اختیار مهمانان است.", image: px(7222168), workingHours: "۲۴ ساعته", sortOrder: 3 },
    { name: "خشکشویی و خدمات اتاق", slug: "laundry", icon: "Shirt", shortDescription: "خشکشویی سریع و سرویس اتاق ۲۴ ساعته.", description: "سرویس خشکشویی، اتوشویی و سرویس اتاق به‌صورت ۲۴ ساعته.", image: px(6466496), workingHours: "۲۴ ساعته", sortOrder: 4 },
  ]);

  await db.insert(amenities).values(
    [
      ["اسکای لانژ", "Mountain", "چشم‌انداز شبانه تهران و البرز", "پذیرایی"],
      ["رستوران‌های ایرانی و بین‌المللی", "UtensilsCrossed", "صبحانه، ناهار و شام", "پذیرایی"],
      ["اسپا، سونا و جکوزی", "Droplets", "با رزرو آنلاین سانس", "سلامت"],
      ["باشگاه بدنسازی ۲۴ ساعته", "Dumbbell", "رایگان برای مهمانان", "سلامت"],
      ["سالن‌های همایش", "Briefcase", "۲۰ تا ۲۵۰ نفر", "کسب‌وکار"],
      ["اینترنت پرسرعت رایگان", "Wifi", "فیبر نوری در همه فضاها", "عمومی"],
      ["پارکینگ سرپوشیده", "Car", "رایگان و امن", "عمومی"],
      ["پذیرش و کانسیرژ ۲۴ ساعته", "ConciergeBell", "همیشه در خدمت شما", "عمومی"],
      ["ترانسفر فرودگاه", "Plane", "امام و مهرآباد", "خدمات"],
      ["سرویس اتاق ۲۴ ساعته", "Coffee", "منوی کامل", "خدمات"],
      ["خشکشویی", "Shirt", "تحویل سریع", "خدمات"],
      ["دسترسی ویلچر", "Accessibility", "آسانسور و رمپ", "عمومی"],
    ].map(([title, icon, description, category], i) => ({ title, icon, description, category, sortOrder: i })),
  );

  await db.insert(attractions).values([
    { name: "برج میلاد", category: "تفریحی", description: "نماد تهران و یکی از بلندترین برج‌های مخابراتی جهان با رستوران گردان و عرشه دیدبانی.", image: px(13650002), distanceKm: 6, travelTime: "۱۵ دقیقه با خودرو", lat: 35.7448, lng: 51.3753, sortOrder: 0 },
    { name: "پارک جوانمردان (ژوراسیک)", category: "تفریحی", description: "پارک خانوادگی با باغ دایناسورها و فضای سبز گسترده در نزدیکی هتل.", image: px(39463383), distanceKm: 2, travelTime: "۵ دقیقه با خودرو", lat: 35.7787, lng: 51.3455, sortOrder: 1 },
    { name: "پل طبیعت", category: "تفریحی", description: "پل عابر پیاده سه‌طبقه زیبا بین پارک آب‌وآتش و پارک طالقانی.", image: px(6058205), distanceKm: 9, travelTime: "۲۰ دقیقه با خودرو", lat: 35.7537, lng: 51.4201, sortOrder: 2 },
    { name: "مجموعه کاخ سعدآباد", category: "تاریخی", description: "مجموعه‌ای از کاخ‌ها و موزه‌ها در باغی وسیع در دامنه البرز.", image: px(34326547), distanceKm: 10, travelTime: "۲۵ دقیقه با خودرو", lat: 35.817, lng: 51.4218, sortOrder: 3 },
    { name: "بازار تجریش", category: "خرید", description: "بازار سنتی و پرجنب‌وجوش شمال تهران کنار امامزاده صالح.", image: px(15467464), distanceKm: 11, travelTime: "۳۰ دقیقه با خودرو", lat: 35.8045, lng: 51.4339, sortOrder: 4 },
    { name: "دربند", category: "طبیعی", description: "مسیر کوهپیمایی و رستوران‌های سنتی در کنار رودخانه در دامنه توچال.", image: px(4146757), distanceKm: 13, travelTime: "۳۵ دقیقه با خودرو", lat: 35.8297, lng: 51.4235, sortOrder: 5 },
    { name: "بام تهران", category: "طبیعی", description: "تفرجگاه کوهستانی با چشم‌انداز کامل تهران و تله‌کابین توچال در نزدیکی.", image: px(7438793), distanceKm: 7, travelTime: "۲۰ دقیقه با خودرو", lat: 35.8177, lng: 51.377, sortOrder: 6 },
    { name: "مرکز خرید سعادت‌آباد", category: "خرید", description: "مراکز خرید و کافه‌های مدرن منطقه سعادت‌آباد و شهرک غرب.", image: px(36484101), distanceKm: 1.5, travelTime: "۵ دقیقه با خودرو", lat: 35.7801, lng: 51.3725, sortOrder: 7 },
  ]);

  /* ---------- dining ---------- */
  const brand = "اسپیناس";
  const I = DINING_IMG;
  await insertVenues(
    [
      { name: `اسکای لانژ ${brand}`, slug: "sky-lounge", kind: "rooftop", tagline: "شام با چشم‌انداز شبانه تهران و البرز", description: "اسکای لانژ در طبقه بالای هتل، با منوی بین‌المللی، نوشیدنی‌های ویژه و موسیقی زنده آخر هفته‌ها، مقصدی خاص برای شام‌های به‌یادماندنی است.", cuisine: "بین‌المللی و فیوژن", hours: [{ label: "همه روزه", time: "۱۸:۰۰ تا ۰۱:۰۰" }], images: [I.restaurantHall, I.coffee2, I.buffet], capacity: 90, priceLevel: 4, features: ["چشم‌انداز ۳۶۰ درجه", "موسیقی زنده آخر هفته", "رزرو آنلاین میز", "منوی کودک"], openToPublic: true, menu: [
        ["پیش‌غذا", "سالاد سزار با مرغ گریل", "کاهو رومانو، پارمزان، کروتان و سس سزار", 980000, undefined, ["popular"]],
        ["پیش‌غذا", "سوپ قارچ و خامه", "قارچ تازه و خامه، نان سیر", 650000, undefined, ["veg"]],
        ["غذای اصلی", "استیک فیله گوساله", "۲۵۰ گرم فیله با سس قارچ، سبزیجات و پوره", 3200000, I.kebab4, ["chef"], true],
        ["غذای اصلی", "ماهی سالمون گریل", "سالمون نروژی با سس لیمو و کره", 2900000, undefined, ["new"], true],
        ["غذای اصلی", "پاستا آلفردو", "پنه با مرغ، قارچ و سس آلفردو", 1450000, undefined, []],
        ["دسر", "سوفله شکلاتی", "با بستنی وانیل", 780000, I.coffee4, ["popular"], true],
        ["نوشیدنی", "موهیتو ویژه", "نعناع تازه، لیمو، سودا", 520000, undefined, []],
      ] },
      { name: `رستوران ایرانی ${brand}`, slug: "persian-restaurant", kind: "restaurant", tagline: "طعم اصیل آشپزی ایرانی", description: "رستوران ایرانی هتل با کباب‌های ذغالی، خورش‌های اصیل و دسرهای سنتی، در فضایی گرم و مجلل میزبان مهمانان هتل و عموم است.", cuisine: "ایرانی", hours: [{ label: "ناهار", time: "۱۲:۰۰ تا ۱۶:۰۰" }, { label: "شام", time: "۱۹:۰۰ تا ۲۳:۳۰" }], images: [I.kebab2, I.restaurantHall, I.kebab3], capacity: 120, priceLevel: 3, features: ["کباب ذغالی", "موسیقی سنتی پنجشنبه‌ها", "رزرو آنلاین میز"], openToPublic: true, menu: [
        ["غذای اصلی", "چلوکباب سلطانی", "یک سیخ برگ و یک سیخ کوبیده با برنج ایرانی", 2200000, I.kebab1, ["popular", "chef"], true],
        ["غذای اصلی", "باقالی‌پلو با ماهیچه", "ماهیچه گوسفندی با باقالی‌پلو زعفرانی", 2400000, I.kebab5, ["local"], true],
        ["غذای اصلی", "جوجه‌کباب زعفرانی", "سینه مرغ مزه‌دار با زعفران و لیمو", 1400000, I.kebab3, []],
        ["غذای اصلی", "خورش فسنجان", "مرغ با سس گردو و انار", 1350000, undefined, ["local"]],
        ["پیش‌غذا", "کشک بادمجان", "بادمجان کبابی و کشک محلی", 520000, undefined, ["veg"]],
        ["دسر", "شله‌زرد و بستنی سنتی", "", 450000, undefined, []],
      ] },
      { name: `کافه لابی ${brand}`, slug: "lobby-cafe", kind: "cafe", tagline: "قهوه تخصصی و کیک‌های خانگی در لابی", description: "کافه لابی هتل، مکانی آرام برای جلسات کاری و دیدارهای دوستانه با قهوه تخصصی، چای و کیک‌های تازه.", cuisine: "کافه و شیرینی", hours: [{ label: "همه روزه", time: "۰۸:۰۰ تا ۲۴:۰۰" }], images: [I.cafe1, I.coffee1, I.cafeBooks], capacity: 50, priceLevel: 3, features: ["قهوه تخصصی", "مناسب جلسات کاری", "رزرو میز"], openToPublic: true, menu: [
        ["قهوه گرم", "اسپرسو", "دابل شات عربیکا", 280000, undefined, []],
        ["قهوه گرم", "کاپوچینو", "", 360000, I.coffee3, ["popular"], true],
        ["قهوه سرد", "آیس لاته", "", 390000, undefined, []],
        ["کیک و شیرینی", "چیزکیک", "با سس توت‌فرنگی", 480000, I.coffee2, ["popular"], true],
        ["چای و دمنوش", "چای زعفرانی", "با نبات", 250000, undefined, ["local"]],
      ] },
      { name: "رستوران بوفه صبحانه", slug: "breakfast", kind: "breakfast", tagline: "بوفه صبحانه بین‌المللی", description: "بوفه صبحانه کامل ایرانی و بین‌المللی، رایگان برای مهمانان هتل.", cuisine: "بوفه", hours: [{ label: "همه روزه", time: "۰۶:۳۰ تا ۱۰:۳۰" }], images: [I.buffet2, I.buffet], capacity: 150, priceLevel: 2, features: ["رایگان برای مهمانان", "ایستگاه املت زنده"], openToPublic: false, menu: [] },
    ],
    true,
  );
  const { diningVenues } = await import("@/db/schema");
  await db.update(diningVenues).set({ bookingEnabled: true }).where(inArray(diningVenues.slug, ["sky-lounge", "persian-restaurant", "lobby-cafe"]));

  await db.insert(testimonials).values([
    { name: "مهندس فرهاد کیانی", city: "تهران", rating: 5, body: "برای یک همایش دو روزه از سالن‌ها و اتاق‌های هتل استفاده کردیم؛ هماهنگی عالی و خدمات بی‌نقص بود.", isDemo: true },
    { name: "سارا نیک‌پور", city: "شیراز", rating: 5, body: "شام در اسکای لانژ با منظره تهران فوق‌العاده بود. سوئیت جونیور هم بسیار تمیز و مجلل بود.", isDemo: true },
    { name: "Daniel Weber", city: "Berlin", rating: 4, body: "Excellent service and a great view of the mountains. Staff were very helpful with airport transfer.", isDemo: true },
    { name: "خانواده رضوانی", city: "مشهد", rating: 5, body: "اسپا و استخر عالی بود و بچه‌ها از پارک ژوراسیک نزدیک هتل خیلی لذت بردند.", isDemo: true },
  ]);

  await insertExtrasDemo();

  if (process.env.SEED_DEMO === "false") return;
  await seedEspinasOperations(insertedRooms.map((r) => ({ id: r.id, name: r.name, price: r.pricePerNight })));
}

/** Demo operations data: partners, customers, groups, reservations from all sources, gift cards, campaigns, table bookings, guest requests. */
async function seedEspinasOperations(roomList: { id: number; name: string; price: number }[]) {
  const today = todayISO();
  const [ag, site, ag2] = await db
    .insert(partners)
    .values([
      { name: "آژانس گردشگری آسمان آبی", type: "agency", contactName: "آقای مرادی", phone: "021-88000000", commissionPercent: 10, autoConfirm: true, secret: "demo", isDemo: true },
      { name: "سایت رزرو همکار (نمونه)", type: "site", contactName: "واحد فنی", email: "api@partner.example", commissionPercent: 12, autoConfirm: true, secret: "demo", isDemo: true },
      { name: "آژانس سفرهای تجاری پارس", type: "agency", contactName: "خانم احمدی", phone: "021-22000000", commissionPercent: 8, autoConfirm: false, secret: "demo", isDemo: true },
    ])
    .returning();

  const people: [string, string, string | null, string, string[]][] = [
    ["علی محمدی", "09121110001", "1365-05-10", "تهران", ["تجاری"]],
    ["مریم حسینی", "09121110002", "1370-08-21", "تهران", ["VIP"]],
    ["رضا کریمی", "09121110003", "1360-02-03", "اصفهان", []],
    ["نازنین رحیمی", "09121110004", "1372-11-15", "شیراز", ["ماه عسل"]],
    ["کامران صادقی", "09121110005", "1358-07-29", "تبریز", ["تجاری", "VIP"]],
    ["لیلا جعفری", "09121110006", null, "مشهد", ["خانوادگی"]],
    ["سعید نوری", "09121110007", "1368-01-12", "تهران", []],
    ["هانیه قربانی", "09121110008", "1375-09-02", "کرج", []],
    ["پیمان اکبری", "09121110009", "1363-04-18", "تهران", ["تجاری"]],
    ["الهام شریفی", "09121110010", "1369-12-25", "رشت", ["خانوادگی"]],
  ];
  const { jalaliToISO, isoToJalali } = await import("./utils");
  const custRows = await db
    .insert(customers)
    .values(
      people.map(([name, phone, bj, city, tags]) => {
        let birth: string | null = null;
        if (bj) {
          const [y, m, d] = bj.split("-").map(Number);
          birth = jalaliToISO(y, m, d);
        }
        return { name, phone, city, tags, birthDate: birth, isDemo: true, source: "website" };
      }),
    )
    .returning();
  // one customer with birthday in 2 days (to show birthday automation)
  const soon = isoToJalali(addDaysISO(today, 2));
  const { jalaliToISO: j2 } = await import("./utils");
  await db.update(customers).set({ birthDate: j2(soon.jy - 30, soon.jm, Math.min(soon.jd, 29)) }).where(eq(customers.id, custRows[6].id));

  const [gVip, gBiz, gBday, gLost] = await db
    .insert(customerGroups)
    .values([
      { name: "مهمانان VIP", description: "مشتریان ویژه (دستی)", kind: "static", color: "secondary" },
      { name: "مسافران تجاری", description: "برچسب «تجاری»", kind: "dynamic", rules: { tag: "تجاری" } },
      { name: "متولدین این ماه", description: "برای کمپین تولد", kind: "dynamic", rules: { birthdayMonth: isoToJalali(today).jm } },
      { name: "مشتریان غیرفعال", description: "بیش از ۹۰ روز بدون اقامت", kind: "dynamic", rules: { lastStayBeforeDays: 90 } },
    ])
    .returning();
  void gBiz;
  void gBday;
  void gLost;
  await db.insert(customerGroupMembers).values([custRows[1], custRows[4]].map((c) => ({ groupId: gVip.id, customerId: c.id })));

  const mk = (i: number, room: { id: number; name: string; price: number }, offset: number, nights: number, source: ReservationSource, status: "confirmed" | "paid" | "pending_payment", extra: Partial<typeof reservations.$inferInsert> = {}) => {
    const c = custRows[i % custRows.length];
    const total = room.price * nights;
    const partner = source === "agency" ? (i % 2 ? ag2 : ag) : source === "partner_site" ? site : null;
    const ci = addDaysISO(today, offset);
    return {
      trackingCode: genTrackingCode(),
      reservationCode: status === "confirmed" ? genReservationCode() : null,
      kind: "room" as const,
      roomId: room.id,
      itemName: room.name,
      guestName: c.name,
      phone: c.phone,
      guests: 2,
      checkIn: ci,
      checkOut: addDaysISO(ci, nights),
      nights,
      totalPrice: total,
      nightly: Array.from({ length: nights }, (_, k) => ({ date: addDaysISO(ci, k), price: room.price, kind: "normal" })),
      depositAmount: source === "website" ? Math.round((total * 0.3) / 1000) * 1000 : source === "walk_in" ? total : 0,
      paymentMethod: source === "website" ? "gateway" : source === "walk_in" ? "cash" : partner ? "partner" : "",
      paidAt: status !== "pending_payment" && (source === "website" || source === "walk_in") ? new Date() : null,
      status,
      confirmedAt: status === "confirmed" ? new Date() : null,
      source,
      partnerId: partner?.id ?? null,
      externalRef: partner ? `EXT-${1000 + i}` : "",
      commission: partner ? Math.round((total * partner.commissionPercent) / 100) : 0,
      customerId: c.id,
      isDemo: true,
      ...extra,
    };
  };
  const R = roomList;
  const now = new Date();
  const resRows = await db
    .insert(reservations)
    .values([
      mk(0, R[0], -2, 4, "website", "confirmed", { checkedInAt: now }),
      mk(1, R[20], -1, 3, "walk_in", "confirmed", { checkedInAt: now }),
      mk(2, R[9], 0, 2, "agency", "confirmed"),
      mk(3, R[24], 0, 3, "partner_site", "confirmed"),
      mk(4, R[27], -3, 3, "phone", "confirmed", { checkedInAt: now }),
      mk(5, R[2], 2, 2, "website", "paid"),
      mk(6, R[14], 3, 3, "agency", "paid"),
      mk(7, R[5], 5, 2, "website", "pending_payment"),
      mk(8, R[16], 7, 4, "partner_site", "confirmed"),
      mk(9, R[29], 10, 3, "phone", "confirmed"),
      mk(1, R[4], -12, 3, "website", "confirmed", { checkedInAt: new Date(Date.now() - 12 * 864e5), checkedOutAt: new Date(Date.now() - 9 * 864e5) }),
      mk(4, R[26], -30, 2, "walk_in", "confirmed", { checkedInAt: new Date(Date.now() - 30 * 864e5), checkedOutAt: new Date(Date.now() - 28 * 864e5) }),
      mk(0, R[11], -2, 2, "website", "confirmed", { checkedInAt: new Date(Date.now() - 2 * 864e5), checkedOutAt: now }),
    ])
    .returning();
  await db.insert(reservationGuests).values([
    { reservationId: resRows[0].id, fullName: "سمیرا محمدی", idNumber: "0012345678", relation: "همسر" },
    { reservationId: resRows[1].id, fullName: "آرمان حسینی", idNumber: "0098765432", relation: "همسر" },
    { reservationId: resRows[4].id, fullName: "John Smith", idNumber: "P12345678", nationality: "انگلیسی", relation: "همکار" },
  ]);
  const [q1] = await db.insert(guestRequests).values({ reservationId: resRows[0].id, category: "housekeeping", status: "in_progress", unreadStaff: false, unreadGuest: true, isDemo: true }).returning();
  await db.insert(guestRequestMessages).values([
    { requestId: q1.id, sender: "guest", body: "سلام، لطفاً دو حوله اضافه و یک بالش برای اتاق بفرستید." },
    { requestId: q1.id, sender: "staff", body: "سلام، حتماً. تا ۱۰ دقیقه دیگر خدمه خانه‌داری خدمت می‌رسند." },
  ]);
  const [q2] = await db.insert(guestRequests).values({ reservationId: resRows[4].id, category: "transfer", isDemo: true }).returning();
  await db.insert(guestRequestMessages).values({ requestId: q2.id, sender: "guest", body: "برای فردا ساعت ۶ صبح یک تاکسی به فرودگاه امام نیاز دارم." });

  const venueRows = await db.execute<{ id: number; slug: string }>(sql`select id, slug from dining_venues`);
  const vid = (slug: string) => venueRows.rows.find((v) => v.slug === slug)?.id;
  const sky = vid("sky-lounge");
  const persian = vid("persian-restaurant");
  if (sky && persian)
    await db.insert(tableBookings).values([
      { venueId: sky, name: "امیر رستمی", phone: "09121110021", date: today, time: "21:00", guests: 4, notes: "سالگرد ازدواج – میز کنار پنجره", isDemo: true },
      { venueId: persian, name: "نگار فاضلی", phone: "09121110022", date: addDaysISO(today, 1), time: "13:30", guests: 6, status: "confirmed", isDemo: true },
      { venueId: sky, name: "بهزاد امینی", phone: "09121110023", date: addDaysISO(today, 2), time: "20:30", guests: 2, isDemo: true },
    ]);

  const { activateGiftCard } = await import("./giftcards");
  const gcs = await db
    .insert(giftCards)
    .values([
      { code: "GC-DEMO-5000", initialAmount: 5_000_000, purchaserName: "مریم حسینی", purchaserPhone: "09121110002", recipientName: "نازنین رحیمی", recipientPhone: "09121110004", message: "تولدت مبارک!", issuedBy: "online", paymentMethod: "gateway", paymentRef: "GW1001", isDemo: true },
      { code: "GC-DEMO-PEND", initialAmount: 10_000_000, purchaserName: "سعید نوری", purchaserPhone: "09121110007", issuedBy: "online", paymentMethod: "card", paymentRef: "889911", isDemo: true },
    ])
    .returning();
  await activateGiftCard(gcs[0].id, { silent: true });

  await db.insert(smsTemplates).values([
    { title: "تخفیف آخر هفته", body: "{name} عزیز، اقامت آخر هفته در {hotel} با {code} درصد… کد تخفیف شما: {code}" },
    { title: "دعوت مشتریان غیرفعال", body: "{name} عزیز، دلمان برایتان تنگ شده! با کد {code} از ۱۵٪ تخفیف اقامت در {hotel} بهره‌مند شوید." },
    { title: "اطلاع‌رسانی رویداد", body: "شب موسیقی زنده اسکای لانژ {hotel}، پنجشنبه ساعت ۲۱. رزرو میز: سایت هتل" },
  ]);
  await db.insert(campaigns).values([
    { name: "کمپین بازگشت مشتریان غیرفعال", audience: { groupIds: [gLost.id] }, message: "{name} عزیز، دلمان برایتان تنگ شده! با کد اختصاصی {code} از ۱۵٪ تخفیف اقامت در {hotel} تا {expires} بهره‌مند شوید.", promoMode: "unique", promoKind: "percent", promoValue: 15, promoValidDays: 30, status: "draft", isDemo: true },
    { name: "شب یلدا در اسکای لانژ", audience: { all: true }, message: "شب یلدا را در اسکای لانژ {hotel} با منوی ویژه و موسیقی زنده جشن بگیرید. کد تخفیف رزرو اتاق: {code}", promoMode: "shared", promoCode: "YALDA10", promoKind: "percent", promoValue: 10, promoValidDays: 20, status: "sent", recipients: 248, sent: 241, failed: 7, sentAt: new Date(Date.now() - 6 * 864e5), isDemo: true },
  ]);
}
