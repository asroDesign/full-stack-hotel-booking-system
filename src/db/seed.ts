import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  admins,
  attractions,
  bookings,
  facilities,
  gallery,
  events,
  menuItems,
  messages,
  offers,
  poolSlots,
  promoCodes,
  reviews,
  roomDailyPrices,
  rooms,
  settings,
  specialDays,
  testimonials,
  journalEntries,
} from "@/db/schema";
import { createJournalEntry, ensureChartOfAccounts, postBookingRevenue } from "@/lib/accounting";
import { demoAdminCredentials, isDemoMode, productionAdminCredentials } from "@/lib/runtime-mode";
import { KAJ_ATTRACTIONS, KAJ_FACILITIES, KAJ_GALLERY, KAJ_MENU, KAJ_SETTINGS, KAJ_TESTIMONIALS } from "@/db/kaj-content";
import { applySpecialDaysToRooms } from "@/lib/pricing";
import { hashPassword } from "@/lib/auth";
import { addDaysISO } from "@/lib/format";

const IMG = {
  roomA: "https://images.pexels.com/photos/2736384/pexels-photo-2736384.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomB: "https://images.pexels.com/photos/14547139/pexels-photo-14547139.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomC: "https://images.pexels.com/photos/2736388/pexels-photo-2736388.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomD: "https://images.pexels.com/photos/35747339/pexels-photo-35747339.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomE: "https://images.pexels.com/photos/6434582/pexels-photo-6434582.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomF: "https://images.pexels.com/photos/6394574/pexels-photo-6394574.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomG: "https://images.pexels.com/photos/29000312/pexels-photo-29000312.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomH: "https://images.pexels.com/photos/6434592/pexels-photo-6434592.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomI: "https://images.pexels.com/photos/3688261/pexels-photo-3688261.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  roomJ: "https://images.pexels.com/photos/39338444/pexels-photo-39338444.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  poolNight: "https://images.pexels.com/photos/37108959/pexels-photo-37108959.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  resortLights: "https://images.pexels.com/photos/14002992/pexels-photo-14002992.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=1900",
  poolTwilight: "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  poolDome: "https://images.pexels.com/photos/9119782/pexels-photo-9119782.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  poolLights: "https://images.pexels.com/photos/12387870/pexels-photo-12387870.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  poolVilla: "https://images.pexels.com/photos/12307498/pexels-photo-12307498.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  poolGreen: "https://images.pexels.com/photos/2983472/pexels-photo-2983472.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  poolTropical: "https://images.pexels.com/photos/37526152/pexels-photo-37526152.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  familyPool: "https://images.pexels.com/photos/27594326/pexels-photo-27594326.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  kidsPool: "https://images.pexels.com/photos/11266606/pexels-photo-11266606.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  lobby: "https://images.pexels.com/photos/14036253/pexels-photo-14036253.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  lobbyArt: "https://images.pexels.com/photos/14036246/pexels-photo-14036246.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  lobbyPeacock: "https://images.pexels.com/photos/14036245/pexels-photo-14036245.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  stair: "https://images.pexels.com/photos/3926482/pexels-photo-3926482.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  spa: "https://images.pexels.com/photos/29000034/pexels-photo-29000034.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  restaurant: "https://images.pexels.com/photos/12391805/pexels-photo-12391805.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  service: "https://images.pexels.com/photos/5371557/pexels-photo-5371557.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  lobbyModern: "https://images.pexels.com/photos/38197473/pexels-photo-38197473.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  lounge: "https://images.pexels.com/photos/1001965/pexels-photo-1001965.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  seaside: "https://images.pexels.com/photos/20566194/pexels-photo-20566194.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  forestAutumn: "https://images.pexels.com/photos/37441371/pexels-photo-37441371.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  waterfallBig: "https://images.pexels.com/photos/26871908/pexels-photo-26871908.png?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  waterfallForest: "https://images.pexels.com/photos/5046379/pexels-photo-5046379.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  waterfallMoss: "https://images.pexels.com/photos/13908543/pexels-photo-13908543.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  forestRiver: "https://images.pexels.com/photos/14266420/pexels-photo-14266420.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  tower: "https://images.pexels.com/photos/29963843/pexels-photo-29963843.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  castle: "https://images.pexels.com/photos/21617723/pexels-photo-21617723.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  waterfallMountain: "https://images.pexels.com/photos/8671206/pexels-photo-8671206.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
};

const VIDEO = {
  room1: "https://videos.pexels.com/video-files/4101507/4101507-hd_1920_1080_25fps.mp4",
  room2: "https://videos.pexels.com/video-files/36088242/15305351_3840_2160_25fps.mp4",
  room3: "https://videos.pexels.com/video-files/36088243/15305333_3840_2160_25fps.mp4",
  room4: "https://videos.pexels.com/video-files/34402450/14574394_3840_2160_60fps.mp4",
  pool: "https://videos.pexels.com/video-files/34639660/14681681_3840_2160_30fps.mp4",
};

const ROOM_TYPES = [
  {
    roomType: "دو نفره دلوکس",
    slugBase: "deluxe-double",
    floor: 1,
    capacity: 2,
    size: 28,
    bedType: "تخت کینگ دو نفره",
    view: "منظره حیاط تاریخی",
    price: 2850000,
    cover: IMG.roomA,
    gallery: [IMG.roomA, IMG.roomD, IMG.roomH],
    video: VIDEO.room1,
    description:
      "اتاقی دنج و روشن با پنجره‌ای رو به درختان بلند حیاط، مناسب زوج‌ها و سفرهای دو نفره.",
    longDescription:
      "اتاق‌های دو نفره دلوکس هتل کاج با متراژ ۲۸ مترمربع، تخت کینگ با تشک طبی، میز کار چوبی و بالکن اختصاصی طراحی شده‌اند. نور طبیعی صبحگاهی از سمت شرق وارد اتاق می‌شود و چشم‌انداز درختان حیاط تا انتهای افق ادامه دارد.",
    amenities: [
      "وای‌فای پرسرعت",
      "تلویزیون هوشمند ۵۵ اینچ",
      "مینی‌بار",
      "ست چای و قهوه",
      "تهویه مطبوع",
      "حمام با دوش باران",
      "گاوصندوق دیجیتال",
      "بالکن مبله",
    ],
  },
  {
    roomType: "سه نفره خانوادگی",
    slugBase: "family-triple",
    floor: 2,
    capacity: 3,
    size: 34,
    bedType: "یک تخت دو نفره + یک تخت یک نفره",
    view: "منظره حیاط و کافه",
    price: 3650000,
    cover: IMG.roomC,
    gallery: [IMG.roomC, IMG.roomI, IMG.roomF],
    video: VIDEO.room2,
    description:
      "فضایی وسیع برای خانواده‌های سه نفره با چیدمانی راحت و چشم‌اندازی رو به باغ و استخر خانوادگی.",
    longDescription:
      "اتاق‌های سه نفره خانوادگی با ۳۴ مترمربع فضا، تخت اضافه استاندارد و میز مطالعه برای فرزندان طراحی شده‌اند. پنجره‌های بزرگ رو به باغ میوه هتل باز می‌شوند و فاصله کوتاهی تا استخر خانوادگی دارند.",
    amenities: [
      "وای‌فای پرسرعت",
      "تلویزیون هوشمند",
      "یخچال کوچک",
      "کتری برقی",
      "تهویه مطبوع",
      "حمام اختصاصی",
      "تخت اضافه",
      "سرویس روزانه اتاق",
    ],
  },
  {
    roomType: "سوئیت خانوادگی",
    slugBase: "family-suite",
    floor: 3,
    capacity: 4,
    size: 46,
    bedType: "دو تخت دو نفره",
    view: "منظره پانوراما بافت تاریخی",
    price: 4950000,
    cover: IMG.roomG,
    gallery: [IMG.roomG, IMG.roomE, IMG.roomB],
    video: VIDEO.room3,
    description:
      "سوئیتی دو اتاقه با نشیمن مستقل، مناسب خانواده‌های چهار نفره که به حریم خصوصی اهمیت می‌دهند.",
    longDescription:
      "سوئیت خانوادگی کاج شامل اتاق خواب اصلی، اتاق فرزندان و نشیمن مجزا با مبل راحتی است. آشپزخانه کوچک با مایکروویو و سینک، امکان پذیرایی سبک را فراهم می‌کند. بالکن پانوراما رو به حیاط، بهترین نقطه برای غروب‌های شمال است.",
    amenities: [
      "دو اتاق خواب مجزا",
      "نشیمن اختصاصی",
      "آشپزخانه کوچک",
      "وای‌فای پرسرعت",
      "دو تلویزیون هوشمند",
      "حمام و سرویس مجزا",
      "بالکن پانوراما",
      "صبحانه بوفه برای چهار نفر",
    ],
  },
  {
    roomType: "سوئیت رویال",
    slugBase: "royal-suite",
    floor: 4,
    capacity: 4,
    size: 62,
    bedType: "تخت کینگ + نشیمن و تخت کمکی",
    view: "منظره پانوراما شهر",
    price: 7400000,
    cover: IMG.roomE,
    gallery: [IMG.roomE, IMG.roomJ, IMG.roomH, IMG.poolGreen],
    video: VIDEO.room4,
    description:
      "بالاترین طبقه هتل با تراس اختصاصی، طراحی مینیمال و چشم‌انداز کامل به حیاط و کوه‌های اطراف.",
    longDescription:
      "سوئیت رویال در طبقه چهارم هتل واقع شده و با ۶۲ مترمربع فضا، لوکس‌ترین اقامتگاه کاج است. تراس اختصاصی با مبلمان راتان، وان مستقل، سرویس پذیرایی اختصاصی و امکان رزرو شام شخصی روی تراس از خدمات این سوئیت است.",
    amenities: [
      "تراس اختصاصی",
      "وان مستقل",
      "سرویس پذیرایی اختصاصی",
      "قهوه‌ساز اسپرسو",
      "سیستم صوتی بلوتوث",
      "وای‌فای پرسرعت",
      "صبحانه در اتاق",
      "پارکینگ اختصاصی",
    ],
  },
];

function buildRooms() {
  const list: (typeof rooms.$inferInsert)[] = [];
  let order = 0;
  ROOM_TYPES.forEach((type, typeIndex) => {
    for (let i = 1; i <= 4; i += 1) {
      order += 1;
      const number = `${type.floor}0${i}`;
      list.push({
        slug: `${type.slugBase}-${typeIndex + 1}${i}`,
        name: `اتاق ${number} — ${type.roomType}`,
        roomNumber: number,
        roomType: type.roomType,
        floor: type.floor,
        capacity: type.capacity,
        size: type.size + i,
        bedType: type.bedType,
        view: type.view,
        description: type.description,
        longDescription: type.longDescription,
        pricePerNight: type.price + (i - 1) * 95000,
        prepaymentPercent: 30,
        coverImage: type.cover,
        gallery: type.gallery,
        amenities: type.amenities,
        videoUrl: type.video,
        featured: typeIndex >= 2 && i <= 2,
        active: true,
        sortOrder: order,
      });
    }
  });
  return list;
}

const FACILITIES: (typeof facilities.$inferInsert)[] = [
  {
    slug: "family-pool",
    title: "استخر خانوادگی کاج",
    subtitle: "آب گرم، محیط خصوصی، مناسب همه اعضای خانواده",
    description:
      "استخر سرپوشیده خانوادگی کاج با آب گرم تصفیه‌شده، عمق متغیر و بخش کم‌عمق کودک، محیطی امن و آرام برای تفریح خانواده‌ها فراهم می‌کند. هر سانس به صورت اختصاصی برای یک خانواده رزرو می‌شود.",
    icon: "🏊",
    imageUrl: IMG.familyPool,
    category: "تفریحی",
    features: [
      "آب گرم تصفیه‌شده",
      "بخش کم‌عمق کودکان",
      "رزرو به صورت خصوصی",
      "سونای خشک",
      "جکوزی",
      "رختکن و دوش",
    ],
    highlight: true,
    sortOrder: 1,
  },
  {
    slug: "restaurant",
    title: "رستوران و کافه کاج",
    subtitle: "طعم غذاهای محلی گلستان",
    description:
      "رستوران کاج با منوی متنوع ایرانی و محلی، از چکدرمه و باقلاقاتق تا غذاهای فرنگی، پذیرای مهمانان است. کافه هتل نیز با دمنوش‌های محلی و قهوه تخصصی، عصرهای دلپذیری می‌سازد.",
    icon: "🍽️",
    imageUrl: IMG.restaurant,
    category: "پذیرایی",
    features: ["منوی محلی و ایرانی", "صبحانه بوفه", "کافه تخصصی", "سرویس در اتاق"],
    highlight: true,
    sortOrder: 2,
  },
  {
    slug: "spa",
    title: "اسپا و массаж",
    subtitle: "آرامش حرفه‌ای با تراپیست‌های مجرب",
    description:
      "مجموعه اسپا کاج با اتاق‌های خصوصی ماساژ، خدمات ریلکسی، سنگ گرم و آروماتراپی، تجربه‌ای کامل از استراحت را برای مهمانان فراهم می‌کند.",
    icon: "💆",
    imageUrl: IMG.spa,
    category: "رفاهی",
    features: ["ماساژ سوئدی", "آروماتراپی", "سنگ گرم", "اتاق خصوصی"],
    highlight: false,
    sortOrder: 3,
  },
  {
    slug: "breakfast",
    title: "صبحانه بوفه محلی",
    subtitle: "هر صبح از ۷ تا ۱۰",
    description:
      "بوفه صبحانه کاج شامل نان‌های محلی تازه، عسل کوهی، پنیر گوسفندی، مربای آلبالو و انواع نوشیدنی گرم است. صبحانه در تراس باغ نیز سرو می‌شود.",
    icon: "🥐",
    imageUrl: IMG.lounge,
    category: "پذیرایی",
    features: ["نان محلی تازه", "عسل و پنیر کوهی", "تراس باغ", "مناسب کودکان"],
    highlight: false,
    sortOrder: 4,
  },
  {
    slug: "kids-playground",
    title: "خانه بازی کودکان",
    subtitle: "سرگرمی امن و آموزش‌محور",
    description:
      "خانه بازی سرپوشیده کودکان با نظارت مربی، شامل سرسره، توپ‌استخر و کارگاه نقاشی است تا والدین نیز فرصت استراحت داشته باشند.",
    icon: "🧸",
    imageUrl: IMG.kidsPool,
    category: "تفریحی",
    features: ["مربی نظارت", "سرپوشیده", "کارگاه نقاشی", "ایمن و ضدضربه"],
    highlight: false,
    sortOrder: 5,
  },
  {
    slug: "parking",
    title: "پارکینگ اختصاصی رایگان",
    subtitle: "۲۴ ساعته با دوربین مداربسته",
    description:
      "پارکینگ سرپوشیده هتل با ظرفیت ۳۰ خودرو، نگهبانی ۲۴ ساعته و دوربین مداربسته برای آسودگی خاطر مهمانان.",
    icon: "🅿️",
    imageUrl: IMG.lobbyModern,
    category: "خدماتی",
    features: ["سرپوشیده", "نگهبانی ۲۴ ساعته", "دوربین مداربسته", "رایگان برای مهمانان"],
    highlight: false,
    sortOrder: 6,
  },
  {
    slug: "transfer",
    title: "ترانسفر فرودگاهی و تور",
    subtitle: "با راننده و راهنمای محلی",
    description:
      "سرویس ترانسفر از فرودگاه گرگان و تورهای یک‌روزه به جاذبه‌های گلستان با خودروی مطمئن و راهنمای محلی، قابل رزرو در پذیرش است.",
    icon: "🚐",
    imageUrl: IMG.forestAutumn,
    category: "خدماتی",
    features: ["فرودگاه گرگان", "راهنمای محلی", "خودروی اختصاصی", "تور یک‌روزه"],
    highlight: false,
    sortOrder: 7,
  },
  {
    slug: "event-hall",
    title: "سالن اجتماعات و مراسم",
    subtitle: "ظرفیت ۸۰ نفر",
    description:
      "سالن اجتماعات با تجهیزات صوتی و تصویری کامل، مناسب جلسات کاری، کارگاه‌ها و مراسم خانوادگی کوچک.",
    icon: "🎤",
    imageUrl: IMG.lobbyArt,
    category: "خدماتی",
    features: ["ظرفیت ۸۰ نفر", "پروژکتور و سیستم صوتی", "پذیرایی اختصاصی", "پارکینگ مهمانان"],
    highlight: false,
    sortOrder: 8,
  },
  {
    slug: "room-service",
    title: "سرویس اتاق ۲۴ ساعته",
    subtitle: "همیشه در دسترس",
    description:
      "تیم پذیرایی هتل به صورت شبانه‌روزی آماده سرویس اتاق، سفارش غذا و تأمین نیازهای مهمانان است.",
    icon: "🛎️",
    imageUrl: IMG.service,
    category: "خدماتی",
    features: ["۲۴ ساعته", "منوی کامل", "تحویل در اتاق", "پاسخگویی سریع"],
    highlight: false,
    sortOrder: 9,
  },
  {
    slug: "garden",
    title: "باغ و تراس کاج",
    subtitle: "یک هکتار فضای سبز",
    description:
      "باغ اختصاصی هتل با درختان میوه، آلاچیق‌های نشیمن و مسیر پیاده‌روی، فضایی آرام برای عصرهای خانوادگی است.",
    icon: "🌳",
    imageUrl: IMG.poolGreen,
    category: "رفاهی",
    features: ["یک هکتار فضای سبز", "آلاچیق خانوادگی", "مسیر پیاده‌روی", "آتش‌دان شبانه"],
    highlight: false,
    sortOrder: 10,
  },
];

const ATTRACTIONS: (typeof attractions.$inferInsert)[] = [
  {
    title: "پارک ملی گلستان",
    description:
      "قدیمی‌ترین پارک ملی ایران با حیاط‌های هیرکانی، تنوع جانوری کم‌نظیر و مسیرهای طبیعت‌گردی؛ تنها ۱۲ کیلومتر با هتل فاصله دارد.",
    category: "طبیعت‌گردی",
    distanceKm: 12,
    location: "جاده گالیکش به بجنورد",
    imageUrl: IMG.forestRiver,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Golestan+National+Park",
    sortOrder: 1,
  },
  {
    title: "آبشار لوه",
    description:
      "آبشاری پلکانی در دل حیاط با آبشارهای کوچک و بزرگ، مناسب پیک‌نیک یک‌روزه و عکاسی طبیعت.",
    category: "طبیعت‌گردی",
    distanceKm: 18,
    location: "روستای لوه، گالیکش",
    imageUrl: IMG.waterfallForest,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Loh+Waterfall+Golestan",
    sortOrder: 2,
  },
  {
    title: "برج قابوس",
    description:
      "بلندترین برج آجری جهان و میراث جهانی یونسکو با معماری ده‌گوش شگفت‌انگیز از قرن یازدهم میلادی.",
    category: "تاریخی",
    distanceKm: 65,
    location: "گنبد کاووس",
    imageUrl: IMG.tower,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Gonbad-e+Qabus+Tower",
    sortOrder: 3,
  },
  {
    title: "تالاب گمیشان",
    description:
      "تالاب بین‌المللی با پرندگان مهاجر، قایق‌سواری و غروب‌های بی‌نظیر؛ بهشتی برای پرنده‌نگران.",
    category: "طبیعت‌گردی",
    distanceKm: 110,
    location: "گمیشان، غرب گلستان",
    imageUrl: IMG.waterfallMoss,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Gomishan+Wetland",
    sortOrder: 4,
  },
  {
    title: "جزیره آشوراده",
    description:
      "تنها جزیره ایرانی دریای خزر با ساحل شنی آرام، ماهی تازه و مسیر دوچرخه‌سواری کنار آب.",
    category: "دریایی",
    distanceKm: 135,
    location: "بندر ترکمن",
    imageUrl: IMG.seaside,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Ashuradeh+Island",
    sortOrder: 5,
  },
  {
    title: "روستای فارسیان",
    description:
      "روستای ییلاقی با خانه‌های خشتی، باغ‌های گردو و مسیرهای کوهپیمایی سبک؛ تجربه‌ای اصیل از زندگی محلی.",
    category: "روستاگردی",
    distanceKm: 25,
    location: "فارسیان، گالیکش",
    imageUrl: IMG.forestAutumn,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Farsian+Village+Golestan",
    sortOrder: 6,
  },
  {
    title: "چشمه گلرامیان",
    description:
      "دریاچه و چشمه گوگردی با آب زلال فیروزه‌ای، شناخته‌شده به عنوان نگین طبیعی گلستان.",
    category: "طبیعت‌گردی",
    distanceKm: 80,
    location: "گلرامیان، آزادشهر",
    imageUrl: IMG.waterfallBig,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Gol-Ramian+Spring",
    sortOrder: 7,
  },
  {
    title: "برج و بافت تاریخی گمیشان",
    description:
      "بازارچه محلی، معماری خشتی و صنایع دستی ترکمن؛ فرصتی برای خرید سوغات و آشنایی با فرهنگ منطقه.",
    category: "خرید",
    distanceKm: 105,
    location: "گمیشان",
    imageUrl: IMG.castle,
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Gomishan+Historical+Texture",
    sortOrder: 8,
  },
];

const GALLERY: (typeof gallery.$inferInsert)[] = [
  { title: "نمای شبانه استخر خانوادگی", imageUrl: IMG.poolNight, category: "استخر", sortOrder: 1 },
  { title: "لابی اصلی هتل", imageUrl: IMG.lobby, category: "هتل", sortOrder: 2 },
  { title: "اتاق دو نفره دلوکس", imageUrl: IMG.roomA, category: "اتاق‌ها", sortOrder: 3 },
  { title: "سوئیت رویال", imageUrl: IMG.roomE, category: "اتاق‌ها", sortOrder: 4 },
  { title: "رستوران کاج", imageUrl: IMG.restaurant, category: "رستوران", sortOrder: 5 },
  { title: "استخر در غروب", imageUrl: IMG.poolTwilight, category: "استخر", sortOrder: 6 },
  { title: "باغ و محوطه هتل", imageUrl: IMG.poolGreen, category: "هتل", sortOrder: 7 },
  { title: "بوفه صبحانه", imageUrl: IMG.lounge, category: "رستوران", sortOrder: 8 },
  { title: "مسیر پیاده‌روی حیاط", imageUrl: IMG.forestRiver, category: "طبیعت", sortOrder: 9 },
  { title: "سوئیت خانوادگی", imageUrl: IMG.roomG, category: "اتاق‌ها", sortOrder: 10 },
  { title: "پذیرش هتل", imageUrl: IMG.lobbyArt, category: "هتل", sortOrder: 11 },
  { title: "آبشار لوه", imageUrl: IMG.waterfallForest, category: "طبیعت", sortOrder: 12 },
];

const TESTIMONIALS: (typeof testimonials.$inferInsert)[] = [
  {
    guestName: "مهدی رستگار",
    city: "تهران",
    rating: 5,
    comment:
      "سه شب در سوئیت خانوادگی اقامت داشتیم. استخر خصوصی برای بچه‌ها عالی بود و رفتار پرسنل واقعاً گرم و صمیمی.",
  },
  {
    guestName: "سارا موسوی",
    city: "اصفهان",
    rating: 5,
    comment:
      "صبحانه محلی و بالکن رو به حیاط، ترکیبی بود که حسابی حال‌مان را خوب کرد. اتاق‌ها بسیار تمیز بودند.",
  },
  {
    guestName: "امیر کریمی",
    city: "مشهد",
    rating: 4,
    comment:
      "برای سفر کاری آمدم؛ وای‌فای پرسرعت و آرامش هتل باعث شد کارهایم را راحت انجام دهم. پارکینگ سرپوشیده نکته مثبتی بود.",
  },
  {
    guestName: "فاطمه احمدی",
    city: "گرگان",
    rating: 5,
    comment:
      "رزرو استخر خانوادگی را از قبل انجام دادیم و همه چیز دقیقاً طبق برنامه بود. کد رزرو هم بلافاصله بعد از تأیید پیامک شد.",
  },
  {
    guestName: "حسین نوری",
    city: "شیراز",
    rating: 5,
    comment:
      "فاصله هتل تا پارک ملی گلستان خیلی کم است. تور یک‌روزه‌ای که هتل ترتیب داد، یکی از بهترین تجربه‌های سفرم بود.",
  },
  {
    guestName: "نگار صادقی",
    city: "تبریز",
    rating: 4,
    comment:
      "طراحی داخلی هتل چشمنواز است و رستوران منوی خوبی دارد. فقط کاش سانس‌های استخر بیشتر بود.",
  },
];

const SETTINGS_ROW: typeof settings.$inferInsert = {
  id: 1,
  hotelName: "هتل کاج",
  tagline: "اقامتی آرام در دل حیاط‌های هیرکانی گلستان",
  heroTitle: "آرامشی به وسعت حیاط، مهمان‌نوازی به گرمای کاج",
  heroSubtitle:
    "هتل ۱۶ اتاقه کاج با استخر خانوادگی اختصاصی، در حاشیه پارک ملی گلستان؛ جایی برای نفس کشیدن، در کنار هم بودن و ساختن خاطره‌های ماندگار.",
  heroImage: IMG.resortLights,
  aboutTitle: "درباره هتل کاج",
  aboutText:
    "هتل کاج در سال ۱۳۹۶ با هدف میزبانی از خانواده‌های ایرانی در حاشیه حیاط‌های هیرکانی افتتاح شد. امروز با ۱۶ اتاق و سوئیت، استخر خانوادگی اختصاصی، رستوران محلی و تیمی ۲۸ نفره، میزبان مهمانانی از سراسر کشور هستیم.",
  aboutImage: IMG.lobbyArt,
  storyText:
    "کاج واژه‌ای ترکمنی به معنای «پدران» است؛ نامی که برای احترام به میزبانان قدیمی این سرزمین انتخاب شد. معماری هتل با چوب، آجر و رنگ‌های خاکی به طبیعت اطراف ادای احترام می‌کند. هر اتاق پنجره‌ای رو به درختان دارد و هر صبح با صدای پرندگان آغاز می‌شود.",
  videoUrl: VIDEO.pool,
  phone: "۰۱۷-۳۴۵۶۷۸۹۰",
  mobile: "۰۹۱۱-۲۳۴-۵۶۷۸",
  email: "info@atalar-hotel.ir",
  address: "استان گلستان، کیلومتر ۸ جاده گالیکش به پارک ملی گلستان، هتل کاج",
  mapLat: "37.2719",
  mapLng: "55.4323",
  mapAddress: "هتل کاج، جاده پارک ملی گلستان، گالیکش، استان گلستان",
  instagram: "https://instagram.com/atalar.hotel",
  telegram: "https://t.me/atalar_hotel",
  whatsapp: "09112345678",
  whatsappLink: "https://wa.me/989112345678",
  checkInTime: "۱۴:۰۰",
  checkOutTime: "۱۲:۰۰",
  poolPrice: 2500000,
  poolTitle: "استخر خانوادگی کاج",
  poolDescription:
    "استخر سرپوشیده با آب گرم، جکوزی و سونای خشک؛ هر سانس سه ساعته به صورت اختصاصی برای خانواده شما رزرو می‌شود. ظرفیت هر سانس ۱۲ نفر است.",
  poolImage: IMG.familyPool,
  cardNumber: "۶۰۳۷-۹۹۷۴-۵۵۲۱-۸۸۴۲",
  cardHolder: "شرکت خدمات گردشگری کاج",
  totalRooms: 16,
  heroMediaType: "video",
  heroVideoUrl: VIDEO.pool,
  poolMediaType: "video",
  poolVideoUrl: VIDEO.pool,
  poolVideoPoster: IMG.familyPool,
  extraGuestFee: 350000,
  poolBaseCapacity: 8,
  poolMaxCapacity: 12,
  testimonialsTitle: "خاطره‌هایی که مهمانان ما ساخته‌اند",
  mapTitle: "ما را روی نقشه پیدا کنید",
  mapDescription:
    "هتل کاج در کیلومتر ۸ جاده گالیکش به پارک ملی گلستان قرار دارد؛ دسترسی آسان از گرگان، گنبد کاووس و مشهد.",
  ctaTitle: "اقامت بعدی خود را در کاج ثبت کنید",
  ctaDescription:
    "درخواست رزرو را آنلاین ثبت کنید، پیش‌پرداخت را پرداخت کنید و پس از تأیید پذیرش، کد رزرو خود را دریافت کنید.",
  statYears: "از سال ۱۳۹۶",
  statYearsLabel: "میزبان خانواده‌ها",
  statGuests: "+۱٬۲۰۰",
  statGuestsLabel: "میزبانی از مهمانان",
  statRating: "۴٫۸",
  statRatingCount: "۳۱۲",
  roomRules: [
    "ورود به اتاق از ساعت ۱۴:۰۰ و تخلیه تا ساعت ۱۲:۰۰ روز خروج است.",
    "همراه داشتن کارت شناسایی معتبر برای همه مهمانان الزامی است.",
    "رزرو اتاق تنها با پرداخت پیش‌پرداخت ۳۰٪ و تأیید پذیرش قطعی می‌شود.",
    "استفاده از اتاق برای تعداد نفرات بیشتر از ظرفیت، مشمول هزینه نفر اضافه است.",
    "استعمال دخانیات در اتاق‌ها ممنوع است؛ بالکن و محوطه باغ مجاز است.",
    "لغو رزرو تا ۷۲ ساعت قبل از ورود با کسر ۱۰٪ هزینه انجام می‌شود.",
  ],
  poolRules: [
    "هر سانس سه ساعته و به صورت خصوصی برای یک خانواده رزرو می‌شود.",
    "ظرفیت پایه هر سانس ۸ نفر است؛ هر نفر اضافه تا سقف ۱۲ نفر هزینه جداگانه دارد.",
    "همراه داشتن مایو و کلاه شنا الزامی است.",
    "کودکان زیر ۶ سال باید با همراه بزرگسال در بخش کم‌عمق باشند.",
    "ورود نوشیدنی و غذای بیرون به محوطه استخر مجاز نیست.",
    "رزرو سانس تنها با پیش‌پرداخت ۳۰٪ و تأیید پذیرش قطعی می‌شود.",
    "لغو سانس تا ۴۸ ساعت قبل، با کسر ۱۰٪ هزینه انجام می‌شود.",
  ],
};

const POOL_SLOTS: (typeof poolSlots.$inferInsert)[] = [
  {
    label: "۰۸:۰۰ تا ۱۱:۰۰",
    price: 2200000,
    capacity: 8,
    extraGuestFee: 300000,
    description: "سانس صبحگاهی، مناسب خانواده‌های با کودکان خردسال",
    active: true,
    sortOrder: 1,
  },
  {
    label: "۱۲:۰۰ تا ۱۵:۰۰",
    price: 2500000,
    capacity: 10,
    extraGuestFee: 350000,
    description: "سانس میانه روز با نور طبیعی و آب گرم",
    active: true,
    sortOrder: 2,
  },
  {
    label: "۱۶:۰۰ تا ۱۹:۰۰",
    price: 2900000,
    capacity: 12,
    extraGuestFee: 400000,
    description: "محبوب‌ترین سانس؛ همراه با میان‌وعده و دمنوش",
    active: true,
    sortOrder: 3,
  },
  {
    label: "۲۰:۰۰ تا ۲۳:۰۰",
    price: 3200000,
    capacity: 12,
    extraGuestFee: 400000,
    description: "سانس شب با نورپردازی و جکوزی",
    active: true,
    sortOrder: 4,
  },
];

type SeedResult = "seeded" | "skipped";

async function runSeed(): Promise<SeedResult> {
  if (!isDemoMode()) return "skipped" as SeedResult;
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(918273645)`);
    const existing = await tx.select({ id: rooms.id }).from(rooms).limit(1);
    if (existing.length > 0) return "skipped" as SeedResult;

    await tx
      .insert(admins)
      .values({
        name: "مدیر پذیرش کاج",
        email: "admin@atalar.ir",
        passwordHash: hashPassword("Atalar@1400"),
        role: "admin",
      })
      .onConflictDoNothing();

    await tx.insert(settings).values({ ...SETTINGS_ROW, ...KAJ_SETTINGS }).onConflictDoNothing();
    await tx.insert(poolSlots).values(POOL_SLOTS);
    await tx.insert(facilities).values(KAJ_FACILITIES);
    await tx.insert(attractions).values(KAJ_ATTRACTIONS);
    await tx.insert(gallery).values(KAJ_GALLERY);
    await tx.insert(testimonials).values(KAJ_TESTIMONIALS);
    await tx.insert(menuItems).values(KAJ_MENU);

    const insertedRooms = await tx
      .insert(rooms)
      .values(buildRooms())
      .returning({ id: rooms.id, name: rooms.name, roomNumber: rooms.roomNumber, pricePerNight: rooms.pricePerNight });

    const roomAt = (index: number) => insertedRooms[index % insertedRooms.length];

    const bookingPlan: {
      guestName: string;
      phone: string;
      email: string | null;
      serviceType: "room" | "pool";
      roomIndex?: number;
      status: string;
      startOffset: number;
      nights: number;
      adults: number;
      children: number;
      notes?: string;
      adminNote?: string;
      timeSlot?: string;
      paid: boolean;
      withCode: boolean;
      createdDaysAgo: number;
    }[] = [
      {
        guestName: "علی محمدی",
        phone: "09121234567",
        email: "ali.mohammadi@example.com",
        serviceType: "room",
        roomIndex: 4,
        status: "confirmed",
        startOffset: 2,
        nights: 3,
        adults: 2,
        children: 1,
        notes: "اتاق نزدیک استخر باشد اگر امکان دارد.",
        adminNote: "رزرو تأیید و کد صادر شد. ترانسفر فرودگاه هماهنگ شد.",
        paid: true,
        withCode: true,
        createdDaysAgo: 9,
      },
      {
        guestName: "زهرا حسینی",
        phone: "09351112233",
        email: "zahra.h@example.com",
        serviceType: "room",
        roomIndex: 8,
        status: "confirmed",
        startOffset: 5,
        nights: 2,
        adults: 2,
        children: 2,
        adminNote: "تخت اضافه برای کودک در نظر گرفته شد.",
        paid: true,
        withCode: true,
        createdDaysAgo: 6,
      },
      {
        guestName: "رضا شریفی",
        phone: "09127778899",
        email: null,
        serviceType: "room",
        roomIndex: 9,
        status: "confirmed",
        startOffset: 1,
        nights: 1,
        adults: 4,
        children: 3,
        timeSlot: "۱۶:۰۰ تا ۱۹:۰۰",
        adminNote: "سانس عصر استخر برای خانواده شریفی رزرو شد.",
        paid: true,
        withCode: true,
        createdDaysAgo: 4,
      },
      {
        guestName: "مریم اکبری",
        phone: "09361234567",
        email: "maryam.akbari@example.com",
        serviceType: "room",
        roomIndex: 12,
        status: "awaiting_review",
        startOffset: 8,
        nights: 4,
        adults: 4,
        children: 0,
        notes: "برای ماه عسل رزرو می‌کنیم، لطفاً اتاق آرام بدهید.",
        paid: true,
        withCode: false,
        createdDaysAgo: 2,
      },
      {
        guestName: "سعید قاسمی",
        phone: "09129990011",
        email: "saeed.q@example.com",
        serviceType: "room",
        roomIndex: 9,
        status: "awaiting_review",
        startOffset: 3,
        nights: 1,
        adults: 6,
        children: 4,
        timeSlot: "۱۲:۰۰ تا ۱۵:۰۰",
        paid: true,
        withCode: false,
        createdDaysAgo: 1,
      },
      {
        guestName: "نسرین رحیمی",
        phone: "09122223344",
        email: null,
        serviceType: "room",
        roomIndex: 1,
        status: "awaiting_review",
        startOffset: 10,
        nights: 2,
        adults: 2,
        children: 0,
        paid: true,
        withCode: false,
        createdDaysAgo: 1,
      },
      {
        guestName: "حامد ولی‌زاده",
        phone: "09196665544",
        email: "hamed.v@example.com",
        serviceType: "room",
        roomIndex: 6,
        status: "pending_payment",
        startOffset: 12,
        nights: 3,
        adults: 3,
        children: 1,
        paid: false,
        withCode: false,
        createdDaysAgo: 0,
      },
      {
        guestName: "لیلا فتحی",
        phone: "09339998877",
        email: "leila.fathi@example.com",
        serviceType: "room",
        roomIndex: 9,
        status: "pending_payment",
        startOffset: 6,
        nights: 1,
        adults: 3,
        children: 2,
        timeSlot: "۲۰:۰۰ تا ۲۳:۰۰",
        paid: false,
        withCode: false,
        createdDaysAgo: 0,
      },
      {
        guestName: "بابک سلطانی",
        phone: "09121113355",
        email: "babak.s@example.com",
        serviceType: "room",
        roomIndex: 10,
        status: "confirmed",
        startOffset: -6,
        nights: 2,
        adults: 2,
        children: 0,
        paid: true,
        withCode: true,
        createdDaysAgo: 20,
      },
      {
        guestName: "شیما دهداری",
        phone: "09301114466",
        email: null,
        serviceType: "room",
        roomIndex: 14,
        status: "cancelled",
        startOffset: 9,
        nights: 1,
        adults: 2,
        children: 1,
        adminNote: "مهمان به دلیل تغییر برنامه سفر لغو کرد.",
        paid: false,
        withCode: false,
        createdDaysAgo: 5,
      },
      {
        guestName: "یوسف ترکمن",
        phone: "09118887766",
        email: "yousef.t@example.com",
        serviceType: "room",
        roomIndex: 3,
        status: "confirmed",
        startOffset: 15,
        nights: 2,
        adults: 1,
        children: 0,
        paid: true,
        withCode: true,
        createdDaysAgo: 12,
      },
      {
        guestName: "الهام کاظمی",
        phone: "09124447788",
        email: "elham.k@example.com",
        serviceType: "room",
        roomIndex: 7,
        status: "rejected",
        startOffset: 4,
        nights: 2,
        adults: 2,
        children: 1,
        adminNote: "ظرفیت اتاق انتخابی در تاریخ درخواستی تکمیل بود؛ پیشنهاد اتاق جایگزین داده شد.",
        paid: true,
        withCode: false,
        createdDaysAgo: 3,
      },
    ];

    const poolPrice = SETTINGS_ROW.poolPrice ?? 2500000;
    const values: (typeof bookings.$inferInsert)[] = bookingPlan.map((plan, index) => {
      const room = plan.roomIndex !== undefined ? roomAt(plan.roomIndex) : null;
      const unitPrice = plan.serviceType === "room" ? room?.pricePerNight ?? 2850000 : poolPrice;
      const total = plan.serviceType === "room" ? unitPrice * plan.nights : unitPrice;
      const prepayment = Math.round((total * 30) / 100);
      const created = new Date();
      created.setDate(created.getDate() - plan.createdDaysAgo);
      return {
        trackingCode: `TRK-ATL${1000 + index * 7}`,
        reservationCode: plan.withCode ? `ATL-${7410 + index * 13}` : null,
        guestName: plan.guestName,
        phone: plan.phone,
        email: plan.email,
        serviceType: plan.serviceType,
        roomId: room?.id ?? null,
        serviceLabel:
          plan.serviceType === "room"
            ? room?.name ?? "اتاق هتل"
            : `استخر خانوادگی — سانس ${plan.timeSlot ?? "۱۶:۰۰ تا ۱۹:۰۰"}`,
        checkIn: addDaysISO(plan.startOffset),
        checkOut: addDaysISO(plan.startOffset + (plan.serviceType === "room" ? plan.nights : 0)),
        timeSlot: plan.timeSlot ?? null,
        nights: plan.serviceType === "room" ? plan.nights : 1,
        adults: plan.adults,
        children: plan.children,
        unitPrice,
        totalAmount: total,
        prepaymentAmount: prepayment,
        paidAmount: plan.paid ? prepayment : 0,
        paymentRef: plan.paid ? `ZP-${90210 + index * 313}` : null,
        status: plan.status,
        notes: plan.notes ?? null,
        adminNote: plan.adminNote ?? null,
        paidAt: plan.paid ? created : null,
        reviewedAt: plan.withCode || plan.status === "rejected" ? created : null,
        createdAt: created,
        updatedAt: created,
      };
    });

    await tx.insert(bookings).values(values);

    await tx.insert(messages).values([
      {
        name: "آرزو نیک‌نام",
        phone: "09123334455",
        email: "arezu.n@example.com",
        subject: "درخواست تور یک‌روزه گلستان",
        message:
          "سلام، برای چهار نفر در تاریخ ۱۵ ماه آینده قصد اقامت دو شبه داریم و مایل به شرکت در تور پارک ملی گلستان هستیم. لطفاً هزینه و برنامه را اعلام کنید.",
        status: "new",
      },
      {
        name: "کامران اسدی",
        phone: "09357778811",
        email: "kamran.asadi@example.com",
        subject: "امکان اقامت با حیوان خانگی",
        message:
          "سلام، آیا هتل اجازه اقامت با سگ کوچک را می‌دهد؟ اگر بله چه شرایطی دارد؟",
        status: "new",
      },
      {
        name: "پریسا قربانی",
        phone: "09125556677",
        email: "parisa.gh@example.com",
        subject: "رزرو استخر برای تولد کودک",
        message:
          "برای جشن تولد ۷ سالگی دخترم می‌خواستم سانس خصوصی استخر رزرو کنم. امکان پذیرایی سبک هم دارید؟",
        status: "read",
      },
      {
        name: "مجتبی راد",
        phone: "09194442233",
        email: null,
        subject: "فاکتور رسمی برای سفر کاری",
        message: "برای سفر کاری نیاز به فاکتور رسمی و پیش‌فاکتور دارم. لطفاً راهنمایی کنید.",
        status: "replied",
        replyNote: "با واحد مالی تماس گرفته شد و فاکتور رسمی برای مهمان ارسال گردید.",
      },
      {
        name: "سحر امانی",
        phone: "09112229988",
        email: "sahar.amani@example.com",
        subject: "دسترسی برای افراد کم‌توان",
        message: "مادر من از ویلچر استفاده می‌کند. آیا اتاق‌های طبقه همکف دسترسی مناسب دارند؟",
        status: "read",
      },
      {
        name: "فرزاد بیات",
        phone: "09361110022",
        email: "farzad.bayat@example.com",
        subject: "همکاری با آژانس مسافرتی",
        message: "مدیر یک آژانس مسافرتی هستم و علاقه‌مند به عقد قرارداد همکاری برای تورهای گروهی هستم.",
        status: "new",
      },
    ]);

    return "seeded" as SeedResult;
  });
}

const CONTENT_DEFAULTS: Record<string, string> = {
  roomsKicker: "اقامتگاه",
  roomsTitle: "اتاق‌ها و سوئیت‌های کاج",
  roomsDescription:
    "۱۶ اتاق و سوئیت با منظره حیاط، امکانات کامل و چیدمانی گرم. اتاق مناسب خود را انتخاب کنید و درخواست رزرو ثبت نمایید.",
  facilitiesKicker: "امکانات هتل",
  facilitiesTitle: "هر آنچه برای یک اقامت راحت نیاز دارید",
  facilitiesDescription: "از استخر و اسپا تا رستوران محلی، ترانسفر فرودگاهی و پارکینگ سرپوشیده؛ همه در یک مجموعه.",
  attractionsKicker: "اطراف کاج",
  attractionsTitle: "جاذبه‌های گردشگری نزدیک هتل",
  attractionsDescription: "حیاط، آبشار، برج تاریخی و دریای خزر؛ هر روز اقامت خود را به یک ماجرای تازه تبدیل کنید.",
  galleryKicker: "گالری تصاویر",
  galleryTitle: "نگاهی به دنیای کاج",
  galleryDescription: "تصاویری واقعی از اتاق‌ها، استخر، رستوران و طبیعت اطراف هتل.",
  testimonialsTitle: "خاطره‌هایی که مهمانان ما ساخته‌اند",
  mapTitle: "ما را روی نقشه پیدا کنید",
  mapDescription:
    "هتل کاج در کیلومتر ۸ جاده گالیکش به پارک ملی گلستان قرار دارد؛ دسترسی آسان از گرگان، گنبد کاووس و مشهد.",
  ctaTitle: "اقامت بعدی خود را در کاج ثبت کنید",
  ctaDescription:
    "درخواست رزرو را آنلاین ثبت کنید، پیش‌پرداخت را پرداخت کنید و پس از تأیید پذیرش، کد رزرو خود را دریافت کنید.",
  statYears: "از سال ۱۳۹۶",
  statYearsLabel: "میزبان خانواده‌ها",
  statGuests: "+۱٬۲۰۰",
  statGuestsLabel: "میزبانی از مهمانان",
  statRating: "۴٫۸",
  statRatingCount: "۳۱۲",
};

async function ensurePoolSlots(): Promise<void> {
  const existing = await db.select({ id: poolSlots.id }).from(poolSlots).limit(1);
  if (existing.length === 0) {
    await db.insert(poolSlots).values(POOL_SLOTS);
  }
}

async function backfillContent(): Promise<void> {
  const rows = await db.select().from(settings).where(sql`${settings.id} = 1`).limit(1);
  const row = rows[0];
  if (!row) return;
  const patch: Record<string, unknown> = {};
  Object.entries(CONTENT_DEFAULTS).forEach(([key, value]) => {
    if (!row[key as keyof typeof row]) patch[key] = value;
  });
  if (!row.roomRules || row.roomRules.length === 0) patch.roomRules = SETTINGS_ROW.roomRules;
  if (!row.poolRules || row.poolRules.length === 0) patch.poolRules = SETTINGS_ROW.poolRules;
  if (!row.poolVideoUrl) {
    patch.poolVideoUrl = SETTINGS_ROW.poolVideoUrl;
    patch.poolVideoPoster = row.poolImage || SETTINGS_ROW.poolImage;
  }
  if (!row.heroVideoUrl) {
    patch.heroVideoUrl = SETTINGS_ROW.heroVideoUrl;
    patch.heroMediaType = "video";
  }
  if (!row.extraGuestFee) patch.extraGuestFee = SETTINGS_ROW.extraGuestFee;
  if (!row.poolBaseCapacity) patch.poolBaseCapacity = 8;
  if (!row.poolMaxCapacity) patch.poolMaxCapacity = 12;
  if (Object.keys(patch).length > 0) {
    await db.update(settings).set(patch as Partial<typeof settings.$inferInsert>).where(sql`${settings.id} = 1`);
  }
}

async function ensureRoomExtras(): Promise<void> {
  const rows = await db.select().from(rooms);
  const breakfast = { name: "صبحانه شیرازی", price: 260000, description: "هر نفر / هر شب" };
  const lunch = { name: "سرویس ناهار", price: 480000, description: "هر نفر / وعده" };
  const dinner = { name: "سرویس شام", price: 520000, description: "هر نفر / وعده" };
  for (const room of rows) {
    const patch: Record<string, unknown> = {};
    if (!room.maxCapacity || room.maxCapacity <= room.capacity) patch.maxCapacity = room.capacity + 2;
    if (!room.extraGuestFee) patch.extraGuestFee = 350000;
    if (!room.addons || room.addons.length === 0) {
      patch.addons = room.roomType.includes("رویال") || room.roomType.includes("سوئیت")
        ? [breakfast, lunch, dinner]
        : [breakfast, lunch];
    }
    if (Object.keys(patch).length > 0) {
      await db.update(rooms).set(patch as Partial<typeof rooms.$inferInsert>).where(sql`${rooms.id} = ${room.id}`);
    }
  }
}

async function ensureMarketingContent(): Promise<void> {
  if (!isDemoMode()) return;
  const offerCount = await db.select({ id: offers.id }).from(offers).limit(1);
  if (offerCount.length === 0) {
    const baseImg = "https://images.pexels.com/photos/";
    await db.insert(offers).values([
      {
        slug: "two-night-dinner",
        title: "دو شب اقامت + شام سرآشپز",
        subtitle: "برای زوج‌ها و سفرهای کوتاه",
        description:
          "دو شب اقامت در اتاق دلوکس، صبحانه محلی، یک شام سه‌مرحله‌ای در کافه‑رستوران کاج و ۱۵٪ تخفیف اسپا.",
        imageUrl: `${baseImg}6394574/pexels-photo-6394574.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400`,
        badge: "پرفروش‌ترین بسته",
        price: 7900000,
        oldPrice: 9800000,
        includes: ["۲ شب اقامت با صبحانه", "شام سه‌مرحله‌ای برای ۲ نفر", "۱۵٪ تخفیف اسپا", "ترانسفر فرودگاه"],
        validUntil: addDaysISO(120),
        featured: true,
        active: true,
        sortOrder: 1,
      },
      {
        slug: "spa-retreat",
        title: "اقامت و اسپا؛ سه ساعت آرامش",
        subtitle: "مناسب آخر هفته",
        description: "یک شب اقامت، صبحانه در حیاط و یک پکیج اسپا شامل ماساژ ۶۰ دقیقه‌ای، سونا و دمنوش.",
        imageUrl: `${baseImg}29000034/pexels-photo-29000034.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400`,
        badge: "پیشنهاد آرامش",
        price: 5600000,
        oldPrice: 6900000,
        includes: ["۱ شب اقامت", "ماساژ ۶۰ دقیقه", "سونا و جکوزی", "دمنوش و میان‌وعده"],
        validUntil: addDaysISO(90),
        featured: true,
        active: true,
        sortOrder: 2,
      },
      {
        slug: "persepolis-tour",
        title: "تور تخت جمشید + اقامت",
        subtitle: "یک روز تاریخ، یک شب آرامش",
        description: "اقامت یک‌شبه با صبحانه و تور یک‌روزه تخت جمشید و نقش رستم با راهنمای محلی و خودروی اختصاصی.",
        imageUrl: `${baseImg}14266420/pexels-photo-14266420.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400`,
        badge: "تجربه شیراز",
        price: 6400000,
        oldPrice: 7500000,
        includes: ["۱ شب اقامت با صبحانه", "تور تخت جمشید و نقش رستم", "راهنمای محلی", "ناهار محلی"],
        validUntil: addDaysISO(150),
        featured: false,
        active: true,
        sortOrder: 3,
      },
    ]);
  }

  const eventCount = await db.select({ id: events.id }).from(events).limit(1);
  if (eventCount.length === 0) {
    await db.insert(events).values([
      {
        title: "شب موسیقی زنده در حیاط",
        description: "اجرای گروه موسیقی سنتی شیراز در حیاط هتل، همراه با دمنوش و شیرینی خانگی.",
        imageUrl: "https://images.pexels.com/photos/14036246/pexels-photo-14036246.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
        category: "موسیقی",
        startsAt: addDaysISO(6),
        timeLabel: "۲۰:۰۰ تا ۲۲:۳۰",
        location: "حیاط هتل",
        price: 350000,
        capacity: 40,
        featured: true,
        active: true,
      },
      {
        title: "شام سرآشپز؛ منوی فصلی",
        description: "منوی ویژه سرآشپز با مواد اولیه فصل، در فضای کافه‑رستوران کاج.",
        imageUrl: "https://images.pexels.com/photos/12391805/pexels-photo-12391805.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
        category: "غذا و نوشیدنی",
        startsAt: addDaysISO(12),
        timeLabel: "۱۹:۳۰ تا ۲۲:۰۰",
        location: "کافه‑رستوران کاج",
        price: 850000,
        capacity: 24,
        featured: true,
        active: true,
      },
      {
        title: "تور پیاده بافت تاریخی",
        description: "بازدید از حافظیه، بازار وکیل و ارگ کریم‌خان با راهنمای محلی؛ ویژه مهمانان هتل.",
        imageUrl: "https://images.pexels.com/photos/29963843/pexels-photo-29963843.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
        category: "تور",
        startsAt: addDaysISO(20),
        timeLabel: "۹:۰۰ تا ۱۳:۰۰",
        location: "حرکت از لابی",
        price: 0,
        capacity: 15,
        featured: false,
        active: true,
      },
      {
        title: "کارگاه قهوه تخصصی",
        description: "آشنایی با دم‌آوری و طعم‌ها در کافه حیاط؛ مناسب علاقه‌مندان قهوه.",
        imageUrl: "https://images.pexels.com/photos/14036245/pexels-photo-14036245.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
        category: "کارگاه",
        startsAt: addDaysISO(30),
        timeLabel: "۱۶:۰۰ تا ۱۸:۰۰",
        location: "کافه حیاط",
        price: 450000,
        capacity: 12,
        featured: false,
        active: true,
      },
    ]);
  }

  const promoCount = await db.select({ id: promoCodes.id }).from(promoCodes).limit(1);
  if (promoCount.length === 0) {
    await db.insert(promoCodes).values([
      { code: "KAJ20", label: "تخفیف ۲۰٪ اقامت دو شب و بیشتر", kind: "percent", value: 20, minNights: 2, maxUses: 100, expiresAt: addDaysISO(120), active: true },
      { code: "WELCOME1M", label: "یک میلیون تومان تخفیف اقامت", kind: "fixed", value: 1000000, minNights: 3, maxUses: 50, expiresAt: addDaysISO(180), active: true },
    ]);
  }

  const reviewCount = await db.select({ id: reviews.id }).from(reviews).limit(1);
  if (reviewCount.length === 0) {
    await db.insert(reviews).values([
      { guestName: "سارا موسوی", city: "تهران", rating: 5, title: "صبحانه در حیاط", comment: "اقامت چهارستاره واقعی؛ اتاق آرام، صبحانه محلی و قهوه کافه عالی بود. حتماً دوباره برمی‌گردیم.", status: "approved", featured: true, stayDate: addDaysISO(-25) },
      { guestName: "امیر کریمی", city: "اصفهان", rating: 4, title: "مناسب سفر کاری", comment: "اینترنت پایدار، میز کار خوب و دسترسی پیاده به حافظیه. کانسیرژ هم ترانسفر را دقیق هماهنگ کرد.", status: "approved", featured: true, stayDate: addDaysISO(-18) },
      { guestName: "نگار صادقی", city: "شیراز", rating: 5, title: "شام سرآشپز", comment: "برای سالگرد ازدواج رزرو کردیم؛ چیدمان اتاق و شام در حیاط فوق‌العاده بود.", status: "approved", featured: false, stayDate: addDaysISO(-40) },
      { guestName: "حسین نوری", city: "مشهد", rating: 4, title: "اسپا و آرامش", comment: "ماساژ و سونا بعد از یک روز گردش، انتخاب درستی بود. فقط پارکینگ محدود است.", status: "approved", featured: false, stayDate: addDaysISO(-55) },
      { guestName: "مریم احمدی", city: "کرج", rating: 5, title: "در انتظار تأیید", comment: "اتاق سه نفره برای خانواده‌مان کافی بود و امکان اضافه کردن ناهار به رزرو خیلی به‌دردبخور بود.", status: "pending", featured: false, stayDate: addDaysISO(-5) },
    ]);
  }
}

async function ensurePricingAndAccounting(): Promise<void> {
  await ensureChartOfAccounts();
  const demo = isDemoMode();
  if (demo) {
    await ensureRoomExtras();
  }

  // Sample double-entry bookkeeping so the accounting reports are populated.
  const journalCount = await db.select({ id: journalEntries.id }).from(journalEntries).limit(1);
  if (demo && journalCount.length === 0) {
    const accountRows = await db.select().from(accounts);
    const code = (value: string) => accountRows.find((account) => account.code === value)?.id;
    const bank = code("10101");
    const capital = code("30101");
    const food = code("50103");
    const payroll = code("50101");
    const otherRevenue = code("40103");
    if (bank && capital && food && payroll && otherRevenue) {
      await createJournalEntry({
        date: addDaysISO(-40),
        description: "واریز سرمایه اولیه مالک",
        reference: "seed-capital",
        source: "manual",
        lines: [
          { accountId: bank, debit: 60000000, credit: 0 },
          { accountId: capital, debit: 0, credit: 60000000 },
        ],
      });
      await createJournalEntry({
        date: addDaysISO(-18),
        description: "خرید مواد غذایی و ملزومات پذیرایی",
        reference: "seed-food",
        source: "manual",
        lines: [
          { accountId: food, debit: 4500000, credit: 0 },
          { accountId: bank, debit: 0, credit: 4500000 },
        ],
      });
      await createJournalEntry({
        date: addDaysISO(-12),
        description: "پرداخت حقوق و دستمزد تیم میزبانی",
        reference: "seed-payroll",
        source: "manual",
        lines: [
          { accountId: payroll, debit: 12000000, credit: 0 },
          { accountId: bank, debit: 0, credit: 12000000 },
        ],
      });
      await createJournalEntry({
        date: addDaysISO(-5),
        description: "درآمد رویداد و رستوران",
        reference: "seed-event",
        source: "manual",
        lines: [
          { accountId: bank, debit: 7200000, credit: 0 },
          { accountId: otherRevenue, debit: 0, credit: 7200000 },
        ],
      });
    }
  }

  const confirmedBookings = await db.select().from(bookings).where(eq(bookings.status, "confirmed")).limit(80);
  for (const booking of confirmedBookings) {
    await postBookingRevenue(booking);
  }

  const dayCount = await db.select({ id: specialDays.id }).from(specialDays).limit(1);
  if (demo && dayCount.length === 0) {
    await db.insert(specialDays).values([
      { date: addDaysISO(18), title: "تعطیلات پایان هفته طولانی", kind: "peak", percent: 20 },
      { date: addDaysISO(19), title: "تعطیلات رسمی", kind: "holiday", percent: 35 },
      { date: addDaysISO(33), title: "آغاز فصل پیک گردشگری", kind: "peak", percent: 25 },
      { date: addDaysISO(34), title: "تعطیلات رسمی", kind: "holiday", percent: 30 },
    ]);
  }

  const priceCount = await db.select({ id: roomDailyPrices.id }).from(roomDailyPrices).limit(1);
  if (demo && priceCount.length === 0) {
    await applySpecialDaysToRooms({ from: addDaysISO(0), to: addDaysISO(120) });
  }

}

async function ensureProductionAdmin(): Promise<void> {
  const existing = await db.select({ id: admins.id }).from(admins).limit(1);
  if (existing.length > 0) return;

  const production = productionAdminCredentials();
  if (production) {
    await db
      .insert(admins)
      .values({
        name: production.name,
        email: production.email,
        passwordHash: hashPassword(production.password),
        role: "admin",
      })
      .onConflictDoNothing();
    console.info("[bootstrap] production admin account created from ADMIN_EMAIL/ADMIN_PASSWORD");
    return;
  }

  if (isDemoMode()) {
    const demo = demoAdminCredentials();
    await db
      .insert(admins)
      .values({ name: demo.name, email: demo.email, passwordHash: hashPassword(demo.password), role: "admin" })
      .onConflictDoNothing();
    return;
  }

  console.warn(
    "[bootstrap] no admin account exists and ADMIN_EMAIL/ADMIN_PASSWORD are not configured. Admin login is disabled until they are set.",
  );
}

async function ensureEssentialSettings(): Promise<void> {
  const existing = await db.select({ id: settings.id }).from(settings).limit(1);
  if (existing.length > 0) return;
  // Only schema defaults (brand name etc.). Business content is entered by the operator.
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
}


let essentialsPromise: Promise<void> | null = null;

async function bootstrap(): Promise<void> {
  await ensureProductionAdmin();
  // Demo content is ONLY inserted into an empty database and never overwrites data.
  if (isDemoMode()) {
    await runSeed();
  }
  await ensureEssentialSettings();
  await ensurePoolSlots();
  await ensurePricingAndAccounting();
  await ensureMarketingContent();
  if (isDemoMode()) {
    await backfillContent();
  }
}

export async function ensureSeeded(): Promise<void> {
  if (!essentialsPromise) {
    essentialsPromise = bootstrap().catch((error) => {
      essentialsPromise = null;
      console.error("[bootstrap] failed:", error);
    });
  }
  await essentialsPromise;
}
