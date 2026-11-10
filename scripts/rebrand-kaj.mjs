#!/usr/bin/env node
/**
 * Optional one-off rebrand of an existing installation to the «هتل کاج» demo
 * (3-star hotel in Shiraz with a café‑restaurant instead of a pool).
 *
 * It is idempotent and non-destructive:
 *  - settings are updated with the new brand/module values
 *  - existing facilities / attractions / testimonials / pool gallery items are
 *    DEACTIVATED (never deleted)
 *  - new café, menu and attraction records are inserted only if missing
 *  - rooms/bookings/accounts/journal data is untouched (only descriptive room
 *    texts mentioning the forest are reworded)
 *
 * Usage: node scripts/rebrand-kaj.mjs --yes
 */
import "dotenv/config";
import { Pool } from "pg";

if (!process.argv.includes("--yes")) {
  console.error("Refusing to run without --yes. Backup first: pg_dump \"$DATABASE_URL\" > backup.sql");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const PX = (id, h = 900, w = 1400) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=${h}&w=${w}`;
const IMG = {
  lobby: PX("14036253", 1200, 1900),
  lobbyArt: PX("14036246"),
  lounge: PX("1001965"),
  stair: PX("3926482"),
  restaurant: PX("12391805"),
  cafe: PX("14036245"),
  service: PX("5371557"),
  garden: PX("11266606"),
  garden2: PX("12932359"),
  shiraz1: PX("29963843"),
  shiraz2: PX("20813525"),
  shiraz3: PX("21617723"),
  shiraz4: PX("5046379"),
  shiraz5: PX("14266420"),
  shiraz6: PX("8671206"),
  shiraz8: PX("37441371"),
};

const SETTINGS = {
  hotel_name: "هتل کاج",
  tagline: "اقامت آرام در قلب شیراز، کنار کافه‑‑رستوران کاج",
  hero_title: "جایی در شیراز که صبح‌ها بوی قهوه دارد",
  hero_subtitle:
    "هتل سه‌ستاره کاج با اتاق‌های آرام، صبحانه محلی و کافه‑‑رستورانی که تا شب پذیرای شماست؛ چند دقیقه پیاده تا حافظیه و بازار وکیل.",
  hero_image: IMG.lobby,
  hero_media_type: "image",
  about_title: "درباره هتل کاج",
  about_text:
    "هتل کاج از سال ۱۳۹۴ در بافت تاریخی شیراز میزبان مهمانان است. ۱۶ اتاق و سوئیت، کافه‑‑رستوران اختصاصی با منوی شیرازی و تیمی ۲۲ نفره که تلاش می‌کنند اقامت شما ساده، تمیز و خوش‌طعم باشد.",
  about_image: IMG.lounge,
  story_text:
    "نام کاج را از درخت کاج کهنسال حیاط گرفتیم؛ همان‌جا که صبح‌ها میز صبحانه چیده می‌شود و عصرها بوی قهوه تازه می‌پیچد. معماری هتل ترکیبی از آجر و چوب است و اتاق‌ها رو به حیاط یا کوچه‌های تاریخی شهر باز می‌شوند.",
  phone: "۰۷۱-۳۲۲۴۵۵۶۶",
  mobile: "۰۹۱۷-۲۲۳-۴۴۵۵",
  email: "info@kajhotel.ir",
  address: "استان فارس، شیراز، خیابان حافظ، کوچه کاج، پلاک ۱۲، هتل کاج",
  map_lat: "29.6220",
  map_lng: "52.5400",
  map_address: "هتل کاج، خیابان حافظ، شیراز",
  instagram: "https://instagram.com/kaj.hotel",
  telegram: "https://t.me/kaj_hotel",
  whatsapp: "09172234455",
  whatsapp_link: "https://wa.me/989172234455",
  star_rating: 3,
  city: "شیراز",
  module_pool: false,
  module_restaurant: true,
  module_cafe: true,
  module_spa: false,
  dining_title: "کافه‑‑رستوران کاج",
  dining_subtitle: "طعم‌های اصیل شیراز در فضایی آرام",
  dining_description:
    "کافه‑‑رستوران کاج در حیاط هتل قرار دارد؛ صبح‌ها صبحانه محلی و قهوه تخصصی، بعدازظهرها منوی شیرازی و شب‌ها شام سبک با نان تازه. مهمانان غیر مقیم هم می‌توانند با رزرو قبلی میز بگیرند.",
  dining_hours: "۰۸:۰۰ تا ۲۳:۰۰",
  dining_phone: "۰۷۱-۳۲۲۴۵۵۶۰",
  dining_image: IMG.restaurant,
  dining_image2: IMG.cafe,
  dining_note:
    "قهوه تخصصی، شیرینی خانگی و صبحانه شیرازی تا ساعت ۱۱ سرو می‌شود. برای گروه‌های بیش از ۸ نفر حتماً هماهنگ کنید.",
  card_holder: "هتل کاج",
  rooms_kicker: "اتاق‌ها و سوئیت‌ها",
  rooms_title: "اتاق‌هایی برای آرام گرفتن",
  rooms_description: "۱۶ اتاق و سوئیت ساده و تمیز با تخت راحت، صبحانه محلی و امکان افزودن وعده غذا از کافه کاج.",
  facilities_kicker: "امکانات",
  facilities_title: "هر چیزی که یک اقامت خوب لازم دارد",
  facilities_description: "کافه‑‑رستوران، پارکینگ، سرویس اتاق و راهنمای گردشگری؛ بدون شلوغی و اغراق.",
  attractions_kicker: "اطراف کاج",
  attractions_title: "شیراز، در چند قدمی",
  attractions_description: "از حافظیه تا تخت جمشید؛ جاذبه‌های شهر را با راهنمایی پذیرش راحت‌تر ببینید.",
  gallery_kicker: "گالری",
  gallery_title: "نگاهی به کاج",
  gallery_description: "اتاق‌ها، کافه و حیاط هتل.",
  testimonials_title: "مهمانان کاج چه می‌گویند",
  map_title: "کجای شیراز هستیم؟",
  map_description:
    "در خیابان حافظ، چند دقیقه پیاده تا حافظیه، بازار وکیل و ارگ کریم‌خان؛ دسترسی آسان به تاکسی و حمل‌ونقل عمومی.",
  cta_title: "اقامت بعدی در شیراز را با کاج بسازید",
  cta_description:
    "اتاقتان را آنلاین رزرو کنید، پیش‌پرداخت را پرداخت کنید و پس از تأیید پذیرش کد رزرو را دریافت کنید.",
  stat_years: "از سال ۱۳۹۴",
  stat_years_label: "میزبانی در بافت تاریخی",
  stat_guests: "+۹٬۵۰۰",
  stat_guests_label: "میزبان مهمانان",
  stat_rating: "۴٫۶",
  stat_rating_count: "۴۸۰",
  pool_title: "باغ کاج",
  pool_description: "حیاط مرکزی با درخت کاج کهنسال، فضای نشیمن و صبحانه در هوای آزاد.",
  pool_image: IMG.garden,
  pool_rules: JSON.stringify([]),
  room_rules: JSON.stringify([
    "ورود به اتاق از ساعت ۱۴:۰۰ و تخلیه تا ساعت ۱۲:۰۰ روز خروج است.",
    "همراه داشتن کارت شناسایی معتبر برای همه مهمانان الزامی است.",
    "رزرو اتاق تنها با پرداخت پیش‌پرداخت ۳۰٪ و تأیید پذیرش قطعی می‌شود.",
    "استفاده از اتاق برای تعداد نفرات بیشتر از ظرفیت، مشمول هزینه نفر اضافه است.",
    "استعمال دخانیات در اتاق‌ها ممنوع است؛ حیاط و تراس کافه مجاز است.",
    "لغو رزرو تا ۷۲ ساعت قبل از ورود با کسر ۱۰٪ هزینه انجام می‌شود.",
  ]),
};

const FACILITIES = [
  ["restaurant", "کافه‑‑رستوران کاج", "منوی شیرازی، قهوه تخصصی، فضای حیاط", "قلب هتل کاج، کافه‑‑رستوران آن است. صبحانه محلی، ناهار شیرازی و شام سبک با مواد تازه.", "☕", IMG.restaurant, "پذیرایی", ["صبحانه محلی", "قهوه تخصصی", "منوی شیرازی", "میز حیاط"], true, 1],
  ["cafe", "کافه حیاط", "قهوه، دمنوش و شیرینی خانگی", "کافه حیاط از صبح تا شب باز است؛ اسپرسو، قهوه دم، دمنوش گیاهی و شیرینی‌های خانگی تازه.", "🍰", IMG.cafe, "پذیرایی", ["قهوه تخصصی", "شیرینی خانگی", "دمنوش گیاهی", "فضای باز"], true, 2],
  ["breakfast", "صبحانه شیرازی", "هر روز ۷ تا ۱۱", "نان سنگک تازه، پنیر و گردو، مربای بهارنارنج و چای یا قهوه.", "🍳", IMG.lounge, "پذیرایی", ["نان تازه", "مربای بهارنارنج", "سرو در حیاط"], false, 3],
  ["parking", "پارکینگ اختصاصی", "ظرفیت محدود، رزرو با هماهنگی", "پارکینگ سرپوشیده کوچک با دسترسی مستقیم به لابی.", "🅿️", IMG.stair, "خدماتی", ["سرپوشیده", "دوربین مداربسته"], false, 4],
  ["tour-desk", "میز راهنمای گردشگری", "تور پیاده و یک‌روزه", "هماهنگی تور پیاده بافت تاریخی، حافظیه و سعدیه و سفر یک‌روزه به تخت جمشید.", "🗺️", IMG.shiraz1, "خدماتی", ["راهنمای محلی", "تور پیاده", "تخت جمشید"], false, 5],
  ["room-service", "روم‌سرویس کافه", "سفارش غذا و نوشیدنی در اتاق", "تحویل سفارش از منوی کافه کاج در اتاق، از ۸ صبح تا ۱۰ شب.", "🛎️", IMG.service, "خدماتی", ["تحویل در اتاق", "منوی کافه"], false, 6],
];

const ATTRACTIONS = [
  ["حافظیه", "آرامگاه حافظ، شاعر محبوب ایرانیان؛ چند دقیقه پیاده از هتل.", "تاریخی", 2, "شیراز، بلوار حافظ", IMG.shiraz1],
  ["بازار وکیل", "بازار تاریخی زندیه با طاق‌های آجری، صنایع دستی و سرای مشیر.", "خرید", 3, "شیراز، خیابان وکیل", IMG.shiraz2],
  ["ارگ کریم‌خان", "قلعه باشکوه زندیه در مرکز شهر با برج‌های آجری و موزه.", "تاریخی", 3, "شیراز، خیابان کریم‌خان", IMG.shiraz3],
  ["باغ ارم", "باغ جهانی‌شده با سروهای بلند و عمارت قاجاری.", "طبیعت‌گردی", 8, "شیراز، بلوار ارم", IMG.garden],
  ["تخت جمشید", "پایتخت باستانی هخامنشیان؛ با تور یک‌روزه هتل.", "تاریخی", 57, "مرودشت، فارس", IMG.shiraz5],
  ["شاهچراغ", "زیارتگاه آینه‌کاری‌شده در بافت تاریخی؛ دیدنی در شب.", "تاریخی", 4, "شیراز، لطفعلی‌خان", IMG.shiraz4],
  ["دروازه قرآن", "دروازه تاریخی ورودی شهر و مسیر آرامگاه خواجو.", "طبیعت‌گردی", 6, "شیراز، تنگ الله‌اکبر", IMG.shiraz6],
  ["باغ عفیف‌آباد", "باغ موزه قاجاری با آب‌نما و گیاهان گرمسیری.", "طبیعت‌گردی", 5, "شیراز، بلوار پرستار", IMG.shiraz8],
];

const GALLERY = [
  ["لابی کاج", IMG.lobby, "هتل"],
  ["کافه‑‑رستوران کاج", IMG.restaurant, "رستوران"],
  ["کافه حیاط", IMG.cafe, "کافه"],
  ["نشیمن و صبحانه", IMG.lounge, "هتل"],
  ["حیاط و درخت کاج", IMG.garden, "هتل"],
  ["پله‌های لابی", IMG.stair, "هتل"],
];

const MENU = [
  ["صبحانه شیرازی", "نان سنگک، پنیر، گردو، مربای بهارنارنج و چای یا قهوه", 260000, "صبحانه", IMG.lounge, true, 1],
  ["املت محلی کاج", "تخم‌مرغ محلی با گوجه و نان بربری", 210000, "صبحانه", IMG.restaurant, false, 2],
  ["ماست بادمجان دودی", "بادمجان دودی، ماست چکیده، نعناع و روغن زیتون", 180000, "پیش‌غذا", IMG.cafe, false, 3],
  ["سالاد شیرازی", "خیار، گوجه، پیاز و آبغوره خانگی", 150000, "پیش‌غذا", IMG.lounge, false, 4],
  ["کلم‌پلو با ماهیچه", "برنج ایرانی، کلم‌پلو شیرازی، ماهیچه پخته و ماست", 520000, "غذای اصلی", IMG.restaurant, true, 5],
  ["شیرین‌پلو با مرغ", "برنج زعفرانی، خلال پرتقال و بادام، مرغ زعفرانی", 460000, "غذای اصلی", IMG.service, false, 6],
  ["کباب کوبیده کاج", "دو سیخ کوبیده، گوجه کبابی و نان تازه", 480000, "غذای اصلی", IMG.restaurant, true, 7],
  ["فسنجان مرغ", "خورش فسنجان با گردو و مرغ محلی همراه برنج", 540000, "غذای اصلی", IMG.lounge, false, 8],
  ["فالوده شیرازی", "رشته فالوده با آبلیمو و شربت آلبالو", 130000, "دسر", IMG.garden, true, 9],
  ["کیک خانگی روز", "کیک تازه روز با قهوه یا چای", 120000, "دسر", IMG.cafe, false, 10],
  ["اسپرسو دوبل", "قهوه تخصصی رست خانگی", 95000, "نوشیدنی", IMG.cafe, false, 11],
  ["دمنوش به‌لیمو", "به، لیمو و دارچین دم‌کرده", 85000, "نوشیدنی", IMG.lounge, false, 12],
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  await pool.query("BEGIN");

  const keys = Object.keys(SETTINGS);
  const values = Object.values(SETTINGS);
  const assignments = keys.map((key, index) => `${key} = $${index + 1}`).join(", ");
  await pool.query(`UPDATE settings SET ${assignments} WHERE id = 1`, values);

  await pool.query("UPDATE facilities SET active = false WHERE slug NOT IN (" + FACILITIES.map((_, i) => `$${i + 1}`).join(",") + ")", FACILITIES.map((f) => f[0]));
  for (const [slug, title, subtitle, description, icon, imageUrl, category, features, highlight, sortOrder] of FACILITIES) {
    await pool.query(
      `INSERT INTO facilities (slug, title, subtitle, description, icon, image_url, category, features, highlight, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
       ON CONFLICT (slug) DO UPDATE SET title=$2, subtitle=$3, description=$4, icon=$5, image_url=$6, category=$7, features=$8, highlight=$9, active=true, sort_order=$10`,
      [slug, title, subtitle, description, icon, imageUrl, category, JSON.stringify(features), highlight, sortOrder],
    );
  }

  await pool.query("UPDATE attractions SET active = false");
  for (const [title, description, category, distance, location, imageUrl] of ATTRACTIONS) {
    const exists = await pool.query("SELECT id FROM attractions WHERE title = $1 LIMIT 1", [title]);
    if (exists.rowCount === 0) {
      await pool.query(
        `INSERT INTO attractions (title, description, category, distance_km, location, image_url, map_url, active, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8)`,
        [title, description, category, distance, location, imageUrl, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(title + " Shiraz")}`, distance],
      );
    } else {
      await pool.query("UPDATE attractions SET active = true, distance_km = $2, image_url = $3 WHERE title = $1", [title, distance, imageUrl]);
    }
  }

  await pool.query("UPDATE gallery SET active = false WHERE category = 'استخر'");
  for (const [title, imageUrl, category] of GALLERY) {
    const exists = await pool.query("SELECT id FROM gallery WHERE title = $1 LIMIT 1", [title]);
    if (exists.rowCount === 0) {
      await pool.query("INSERT INTO gallery (title, image_url, category, active, sort_order) VALUES ($1,$2,$3,true,$4)", [title, imageUrl, category, 20]);
    }
  }

  await pool.query("UPDATE testimonials SET active = false");
  const comments = [
    ["سارا موسوی", "تهران", 5, "صبحانه در حیاط و قهوه کافه کاج بهترین بخش سفر بود. اتاق‌ها ساده اما خیلی تمیز و آرام."],
    ["امیر کریمی", "اصفهان", 4, "چند دقیقه پیاده تا حافظیه. اینترنت خوب و کافه تا شب باز بود."],
    ["نگار صادقی", "شیراز", 5, "برای تولد مادرم میز حیاط رزرو کردیم؛ برخورد پرسنل و کیک خانگی‌شان عالی بود."],
    ["حسین نوری", "مشهد", 4, "منوی شام کافه را توصیه می‌کنم. پارکینگ محدود است اما هماهنگ شد."],
  ];
  for (const [name, city, rating, comment] of comments) {
    const exists = await pool.query("SELECT id FROM testimonials WHERE guest_name = $1 LIMIT 1", [name]);
    if (exists.rowCount === 0) {
      await pool.query("INSERT INTO testimonials (guest_name, city, rating, comment, active) VALUES ($1,$2,$3,$4,true)", [name, city, rating, comment]);
    } else {
      await pool.query("UPDATE testimonials SET active = true, city=$2, rating=$3, comment=$4 WHERE guest_name=$1", [name, city, rating, comment]);
    }
  }

  const menuCount = await pool.query("SELECT count(*)::int AS total FROM menu_items");
  if (menuCount.rows[0].total === 0) {
    for (const [name, description, price, category, imageUrl, featured, sortOrder] of MENU) {
      await pool.query(
        "INSERT INTO menu_items (name, description, price, category, image_url, featured, active, sort_order) VALUES ($1,$2,$3,$4,$5,$6,true,$7)",
        [name, description, price, category, imageUrl, featured, sortOrder],
      );
    }
  }

  // Reword room texts that referenced the previous hotel's forest setting.
  await pool.query("UPDATE rooms SET view = 'منظره حیاط / کوچه تاریخی' WHERE view LIKE '%جنگل%' OR view LIKE '%کوه%'");
  await pool.query("UPDATE rooms SET description = replace(description, 'جنگل هیرکانی', 'حیاط تاریخی'), long_description = replace(long_description, 'جنگل', 'حیاط')");
  // Align room add-ons with the café menu (only for untouched demo add-on sets).
  await pool.query(
    `UPDATE rooms SET addons = $1
     WHERE addons = '[]'::jsonb
        OR addons::text LIKE '%صبحانه بوفه محلی%'
        OR addons::text LIKE '%سرویس ناهار%'`,
    [
      JSON.stringify([
        { name: "صبحانه شیرازی", price: 260000, description: "هر نفر / هر شب" },
        { name: "سرویس ناهار", price: 480000, description: "هر نفر / وعده" },
        { name: "سرویس شام", price: 520000, description: "هر نفر / وعده" },
      ]),
    ],
  );

  await pool.query("COMMIT");
  console.log("[rebrand] hotel rebranded to «هتل کاج» — existing rooms/bookings/accounts were preserved.");
} catch (error) {
  await pool.query("ROLLBACK").catch(() => undefined);
  console.error("[rebrand] failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
