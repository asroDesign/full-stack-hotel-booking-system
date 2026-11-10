import { db } from "@/db";
import { diningVenues, menuItems, type VenueKind } from "@/db/schema";

const px = (id: number, w = 1280, h = 800) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;

export const DINING_IMG = {
  restaurantHall: px(29000046),
  buffet: px(16199069),
  buffet2: px(28999503),
  lobby: px(12391805),
  cafe1: px(36484101),
  cafe2: px(34104248),
  cafeBooks: px(2079452),
  cafeWindow: px(26730484),
  kebab1: px(17794709, 800, 800),
  kebab2: px(31151727, 800, 800),
  kebab3: px(37941279, 800, 800),
  kebab4: px(14731641, 800, 800),
  kebab5: px(14731642, 800, 800),
  coffee1: px(15823324, 800, 800),
  coffee2: px(2568459, 800, 800),
  coffee3: px(2074122, 800, 800),
  coffee4: px(9884561, 800, 800),
};

type MenuSeed = [category: string, name: string, description: string, price: number, image?: string, tags?: string[], signature?: boolean];
type VenueSeed = {
  name: string;
  slug: string;
  kind: VenueKind;
  tagline: string;
  description: string;
  cuisine: string;
  hours: { label: string; time: string }[];
  images: string[];
  capacity: number;
  priceLevel: number;
  features: string[];
  openToPublic: boolean;
  menu: MenuSeed[];
};

const I = DINING_IMG;

const restaurantMenu = (local: string): MenuSeed[] => [
  ["پیش‌غذا", "سوپ جو", "سوپ جو با شیر و جعفری تازه", 180000, undefined, ["popular"]],
  ["پیش‌غذا", "سالاد شیرازی", "خیار، گوجه، پیاز و آبغوره", 120000, undefined, ["veg"]],
  ["پیش‌غذا", "کشک بادمجان", "بادمجان کبابی، کشک محلی و نعناع داغ", 220000, undefined, ["veg", "local"]],
  ["غذای اصلی", "چلوکباب کوبیده", "دو سیخ کوبیده گوشت گوسفندی با برنج ایرانی و گوجه کبابی", 650000, I.kebab1, ["popular"], true],
  ["غذای اصلی", "چلوکباب برگ", "فیله گوساله مزه‌دار شده با زعفران", 980000, I.kebab4, ["chef"], true],
  ["غذای اصلی", "جوجه کباب زعفرانی", "سینه مرغ با زعفران و لیمو", 520000, I.kebab3, []],
  ["غذای اصلی", local, "غذای محلی منطقه، طبخ شده به روش سنتی", 480000, I.kebab5, ["local"], true],
  ["غذای اصلی", "میرزا قاسمی", "بادمجان دودی، سیر و تخم‌مرغ با نان تازه", 280000, undefined, ["veg", "local"]],
  ["دسر", "فرنی گلاب", "فرنی سنتی با گلاب و پودر پسته", 140000, undefined, []],
  ["دسر", "بستنی سنتی زعفرانی", "بستنی دست‌ساز با پسته", 160000, undefined, ["popular"]],
  ["نوشیدنی", "دوغ محلی", "دوغ گازدار با نعناع کوهی", 70000, undefined, ["local"]],
  ["نوشیدنی", "شربت بیدمشک", "شربت خنک سنتی", 90000, undefined, []],
];

const cafeMenu: MenuSeed[] = [
  ["قهوه گرم", "اسپرسو", "دابل شات، دانه عربیکا", 120000, undefined, []],
  ["قهوه گرم", "کاپوچینو", "اسپرسو، شیر بخارداده و فوم مخملی", 165000, I.coffee3, ["popular"], true],
  ["قهوه گرم", "لاته", "اسپرسو و شیر با طعم دلخواه (وانیل، کارامل، فندق)", 175000, I.coffee1, []],
  ["قهوه گرم", "قهوه ترک", "دم‌شده در جزوه روی شن داغ", 140000, undefined, ["local"]],
  ["قهوه سرد", "آیس آمریکانو", "اسپرسو روی یخ", 150000, undefined, []],
  ["قهوه سرد", "آفوگاتو", "بستنی وانیل با شات اسپرسو", 210000, I.coffee4, ["new"]],
  ["چای و دمنوش", "چای آتشی", "چای ایرانی دم‌شده روی زغال با نبات زعفرانی", 110000, undefined, ["local", "popular"], true],
  ["چای و دمنوش", "دمنوش گل‌گاوزبان", "با لیمو عمانی و نبات", 120000, undefined, ["veg"]],
  ["کیک و شیرینی", "چیزکیک نیویورکی", "با سس توت‌فرنگی", 220000, I.coffee2, ["popular"]],
  ["کیک و شیرینی", "کیک شکلاتی خانگی", "کیک مرطوب با گاناش", 190000, undefined, []],
  ["صبحانه و میان‌وعده", "املت ایرانی", "گوجه، تخم‌مرغ محلی و نان سنگک", 180000, undefined, ["veg"]],
  ["صبحانه و میان‌وعده", "کلاب ساندویچ", "مرغ گریل، پنیر، کاهو و سیب‌زمینی", 290000, undefined, []],
];

export const ATALAR_VENUES: VenueSeed[] = [
  {
    name: "رستوران سنتی آتالار",
    slug: "atalar-restaurant",
    kind: "restaurant",
    tagline: "طعم اصیل آذربایجان، کنار شومینه",
    description:
      "رستوران آتالار با فضایی گرم و سنتی، غذاهای اصیل آذربایجانی و ایرانی را با مواد اولیه تازه از روستاهای دامنه سبلان سرو می‌کند.\n\nصبحانه بوفه محلی برای مهمانان هتل رایگان است و رستوران برای ناهار و شام پذیرای مهمانان غیرمقیم نیز هست.",
    cuisine: "ایرانی و آذربایجانی",
    hours: [
      { label: "صبحانه", time: "۷:۰۰ تا ۱۰:۰۰" },
      { label: "ناهار", time: "۱۲:۰۰ تا ۱۵:۰۰" },
      { label: "شام", time: "۱۹:۰۰ تا ۲۳:۰۰" },
    ],
    images: [I.restaurantHall, I.buffet, I.kebab2],
    capacity: 80,
    priceLevel: 2,
    features: ["صبحانه بوفه رایگان برای مهمانان", "سرو غذا در اتاق", "پذیرش مهمانان غیرمقیم", "برگزاری مراسم تا ۶۰ نفر"],
    openToPublic: true,
    menu: restaurantMenu("آش دوغ اردبیل"),
  },
  {
    name: "کافه لابی",
    slug: "atalar-cafe",
    kind: "cafe",
    tagline: "قهوه تخصصی و چای آتشی در لابی",
    description: "کافه لابی آتالار مکانی دلنشین برای گفت‌وگو و استراحت است؛ با منوی قهوه تخصصی، دمنوش‌های کوهستانی سبلان و شیرینی محلی.",
    cuisine: "کافه و شیرینی",
    hours: [{ label: "همه روزه", time: "۸:۰۰ تا ۱:۰۰ بامداد" }],
    images: [I.cafe2, I.coffee1, I.cafeBooks],
    capacity: 30,
    priceLevel: 2,
    features: ["قهوه تخصصی", "اینترنت رایگان", "فضای مطالعه"],
    openToPublic: true,
    menu: cafeMenu,
  },
];

export const CITY_VENUES = (brand: string): VenueSeed[] => [
  {
    name: `رستوران ${brand}`,
    slug: "restaurant",
    kind: "restaurant",
    tagline: "آشپزخانه باز تبریزی با چاشنی امروز",
    description:
      `رستوران ${brand} با آشپزخانه باز و فضایی آجری و گرم، غذاهای اصیل تبریزی و ایرانی را با ارائه‌ای امروزی سرو می‌کند. کوفته تبریزی و کباب‌های ذغالی ما شهرت شهری دارند.\n\nرستوران برای مهمانان هتل و عموم مردم باز است و امکان برگزاری جلسات کاری و مهمانی‌های کوچک را دارد.`,
    cuisine: "ایرانی و تبریزی",
    hours: [
      { label: "ناهار", time: "۱۲:۰۰ تا ۱۶:۰۰" },
      { label: "شام", time: "۱۹:۰۰ تا ۲۳:۳۰" },
    ],
    images: [I.restaurantHall, I.kebab2, I.buffet],
    capacity: 70,
    priceLevel: 2,
    features: ["آشپزخانه باز", "پذیرش مهمانان غیرمقیم", "منوی کودک", "سالن خصوصی ۲۰ نفره"],
    openToPublic: true,
    menu: restaurantMenu("کوفته تبریزی"),
  },
  {
    name: `کافه ${brand}`,
    slug: "cafe",
    kind: "cafe",
    tagline: "قهوه، کتاب و پنجره‌ای رو به خیابان",
    description: `کافه ${brand} در طبقه همکف هتل، با قفسه‌های کتاب، پنجره‌های بزرگ و قهوه‌ای که روزانه برشته می‌شود، پاتوق مهمانان و اهالی محله است.`,
    cuisine: "قهوه تخصصی، کیک و صبحانه",
    hours: [{ label: "همه روزه", time: "۷:۳۰ تا ۲۴:۰۰" }],
    images: [I.cafe1, I.cafeWindow, I.coffee2],
    capacity: 40,
    priceLevel: 2,
    features: ["قهوه برشته‌شده روزانه", "اینترنت پرسرعت رایگان", "مناسب جلسات کاری", "صبحانه تا ظهر"],
    openToPublic: true,
    menu: cafeMenu,
  },
  {
    name: "سالن صبحانه",
    slug: "breakfast",
    kind: "breakfast",
    tagline: "بوفه صبحانه ایرانی و اروپایی",
    description: "بوفه صبحانه با نان تازه، پنیر لیقوان، عسل، کره محلی، املت و انواع غلات؛ رایگان برای مهمانان هتل.",
    cuisine: "بوفه صبحانه",
    hours: [{ label: "همه روزه", time: "۷:۰۰ تا ۱۰:۳۰" }],
    images: [I.buffet2, I.lobby],
    capacity: 50,
    priceLevel: 1,
    features: ["رایگان برای مهمانان", "منوی رژیمی"],
    openToPublic: false,
    menu: [],
  },
];

export async function insertVenues(list: VenueSeed[], isDemo: boolean) {
  for (let i = 0; i < list.length; i++) {
    const { menu, ...v } = list[i];
    const [row] = await db
      .insert(diningVenues)
      .values({ ...v, sortOrder: i, isDemo, showMenu: menu.length > 0 })
      .onConflictDoNothing()
      .returning({ id: diningVenues.id });
    if (!row || !menu.length) continue;
    await db.insert(menuItems).values(
      menu.map(([category, name, description, price, image, tags, signature], j) => ({
        venueId: row.id,
        category,
        name,
        description,
        price,
        image: image ?? "",
        tags: tags ?? [],
        isSignature: !!signature,
        sortOrder: j,
      })),
    );
  }
}
