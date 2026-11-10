#!/usr/bin/env node
/**
 * Upgrade the demo hotel to a premium 4-star configuration with a new front-end
 * identity (midnight navy · champagne · ivory).
 *
 * Non-destructive & idempotent:
 *  - updates branding copy + star rating + module switches in `settings`
 *  - inserts spa / rooftop / meeting facilities and gallery images when missing
 *  - adds two guest reviews when missing
 *  - never deletes rooms, bookings, accounts, journal entries or messages
 *
 * Usage: node scripts/upgrade-four-star.mjs --yes
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
  hero: PX("14002992", 1200, 1900),
  lobby: PX("14036253", 1200, 1900),
  lounge: PX("1001965"),
  restaurant: PX("12391805"),
  cafe: PX("14036245"),
  spa: PX("29000034"),
  terrace: PX("2983472"),
  meeting: PX("38197473"),
  garden: PX("11266606"),
};

const SETTINGS = {
  star_rating: 4,
  module_pool: false,
  module_restaurant: true,
  module_cafe: true,
  module_spa: true,
  tagline: "اقامت چهارستاره در قلب شیراز؛ آرام، خوش‌طعم و با جزئیات",
  hero_title: "اقامتی چهارستاره، در فاصله‌ای کوتاه از تاریخ شیراز",
  hero_subtitle:
    "هتل کاج با سوئیت‌های روشن، اسپا و سلامتی، صبحانه در حیاط و کافه‑‑رستورانی با منوی شیرازی؛ تجربه‌ای آرام برای اقامت‌های کوتاه و بلند.",
  hero_image: IMG.hero,
  hero_media_type: "video",
  hero_video_url: "https://videos.pexels.com/video-files/36088242/15305351_3840_2160_25fps.mp4",
  about_title: "هتلی برای مهمانانی که جزئیات را می‌بینند",
  about_text:
    "هتل چهارستاره کاج در بافت تاریخی شیراز، ۱۶ اتاق و سوئیت با طراحی گرم و خدمات کانسیرژ ارائه می‌دهد. از صبحانه محلی در حیاط تا اسپا و شام در کافه‑‑رستوران کاج، همه‌چیز برای یک اقامت آرام و بی‌دغدغه طراحی شده است.",
  story_text:
    "کاج از یک خانه قدیمی شیرازی آغاز شد؛ درخت کاج حیاط هنوز هم مهمانان را به میز صبحانه دعوت می‌کند. در بازسازی، آجر، چوب و نور طبیعی را نگه داشتیم و خدمات چهارستاره را کنار همان مهمان‌نوازی قدیمی گذاشتیم: اسپا، روم‌سرویس، ترانسفر فرودگاه و راهنمای اختصاصی گردشگری.",
  about_image: IMG.lounge,
  dining_title: "کافه‑‑رستوران کاج",
  dining_subtitle: "منوی شیرازی با اجرای مدرن و قهوه تخصصی",
  dining_description:
    "کافه‑‑رستوران کاج در حیاط هتل قرار دارد؛ صبح‌ها صبحانه محلی و قهوه تخصصی، بعدازظهرها منوی شیرازی و شب‌ها منوی شام سرآشپز. میزهای حیاط برای عصرهای خنک شیراز رزرو می‌شوند و مهمانان غیرمقیم هم پذیرفته می‌شوند.",
  dining_hours: "۰۷:۳۰ تا ۲۳:۳۰",
  dining_note:
    "منوی شام سرآشپز هر هفته تغییر می‌کند. برای رزرو میز کنار حیاط یا هماهنگی منوی گیاهی، با پذیرش تماس بگیرید.",
  dining_image: IMG.restaurant,
  dining_image2: IMG.cafe,
  rooms_kicker: "اتاق‌ها و سوئیت‌ها",
  rooms_title: "سوئیت‌هایی با نور طبیعی و آرامش",
  rooms_description:
    "۱۶ اتاق و سوئیت با تخت راحت، میز کار، صبحانه محلی و گزینه‌های اضافه مثل وعده شام یا ترانسفر. برای اقامت‌های کاری و خانوادگی.",
  facilities_kicker: "امکانات چهارستاره",
  facilities_title: "خدماتی که اقامت را بی‌دغدغه می‌کند",
  facilities_description: "اسپا و سلامتی، کافه‑‑رستوران، تراس، سالن جلسات، پارکینگ و کانسیرژ اختصاصی.",
  attractions_kicker: "اطراف کاج",
  attractions_title: "شیراز، در چند قدمی",
  attractions_description: "حافظیه، بازار وکیل و تخت جمشید؛ تورهای اختصاصی با راهنمای محلی از پذیرش.",
  gallery_kicker: "گالری",
  gallery_title: "نگاهی به کاج",
  gallery_description: "سوئیت‌ها، اسپا، کافه و حیاط هتل.",
  testimonials_title: "تجربه مهمانان چهارستاره ما",
  map_title: "موقعیت هتل روی نقشه",
  map_description: "در خیابان حافظ شیراز، چند دقیقه پیاده تا حافظیه و بازار وکیل؛ دسترسی آسان به فرودگاه با ترانسفر هتل.",
  cta_title: "اقامت چهارستاره بعدی شما، در کاج",
  cta_description: "سوئیت خود را آنلاین رزرو کنید، پیش‌پرداخت را پرداخت کنید و پس از تأیید پذیرش کد رزرو بگیرید.",
  stat_years: "از سال ۱۳۹۴",
  stat_years_label: "میزبانی در بافت تاریخی",
  stat_guests: "+۱۴٬۰۰۰",
  stat_guests_label: "میزبان مهمانان",
  stat_rating: "۴٫۸",
  stat_rating_count: "۶۲۰",
  pool_title: "باغ و تراس کاج",
  pool_description: "حیاط مرکزی با درخت کاج کهنسال، تراس روفت و میزهای صبحانه در هوای آزاد.",
  pool_image: IMG.garden,
};

const FACILITIES = [
  ["spa", "اسپا و سلامتی کاج", "ماساژ، آروماتراپی و سونای خشک", "مجموعه اسپا با اتاق‌های خصوصی ماساژ، آروماتراپی، سنگ گرم و سونای خشک؛ مناسب بعد از یک روز گردش در شیراز. رزرو با هماهنگی پذیرش.", "💆", IMG.spa, "رفاهی", ["ماساژ سوئدی", "آروماتراپی", "سونای خشک", "اتاق خصوصی"], true, 7],
  ["rooftop", "تراس و روفت‌بار", "غروب‌های شیراز، قهوه و نوشیدنی", "تراس روفت هتل با چشم‌انداز بام‌های تاریخی شیراز؛ مناسب غروب و عکاسی. سرویس قهوه و نوشیدنی از کافه کاج.", "🌇", IMG.terrace, "رفاهی", ["چشم‌انداز بام", "سرویس کافه", "مناسب غروب", "فضای باز"], false, 8],
  ["meeting-room", "سالن جلسات کاج", "ظرفیت ۳۰ نفر با تجهیزات کامل", "سالن جلسات با پروژکتور، سیستم صوتی و پذیرایی اختصاصی؛ مناسب جلسات کاری و کارگاه‌های کوچک.", "🎤", IMG.meeting, "خدماتی", ["پروژکتور", "سیستم صوتی", "پذیرایی", "پارکینگ مهمانان"], false, 9],
];

const GALLERY = [
  ["اسپا و سلامتی کاج", IMG.spa, "اسپا"],
  ["تراس روفت", IMG.terrace, "هتل"],
  ["سالن جلسات", IMG.meeting, "هتل"],
  ["صبحانه در حیاط", IMG.garden, "رستوران"],
];

const REVIEWS = [
  ["آرمان مهدوی", "تهران", 5, "برای تعطیلات آخر هفته چهارستاره‌ای می‌خواستیم؛ اسپا و شام سرآشپز عالی بود و اتاق خیلی آرام."],
  ["شیدا رضایی", "شیراز", 5, "صبحانه در حیاط و قهوه کافه، شروع خوبی برای روز بود. برخورد کانسیرژ و راهنمایی تور هم حرفه‌ای بود."],
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  await pool.query("BEGIN");

  const keys = Object.keys(SETTINGS);
  const values = Object.values(SETTINGS);
  await pool.query(`UPDATE settings SET ${keys.map((key, index) => `${key} = $${index + 1}`).join(", ")} WHERE id = 1`, values);

  for (const [slug, title, subtitle, description, icon, imageUrl, category, features, highlight, sortOrder] of FACILITIES) {
    await pool.query(
      `INSERT INTO facilities (slug, title, subtitle, description, icon, image_url, category, features, highlight, active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,$10)
       ON CONFLICT (slug) DO UPDATE SET title=$2, subtitle=$3, description=$4, icon=$5, image_url=$6, category=$7, features=$8, highlight=$9, active=true, sort_order=$10`,
      [slug, title, subtitle, description, icon, imageUrl, category, JSON.stringify(features), highlight, sortOrder],
    );
  }

  for (const [title, imageUrl, category] of GALLERY) {
    const exists = await pool.query("SELECT id FROM gallery WHERE title = $1 LIMIT 1", [title]);
    if (exists.rowCount === 0) {
      await pool.query("INSERT INTO gallery (title, image_url, category, active, sort_order) VALUES ($1,$2,$3,true,$4)", [title, imageUrl, category, 30]);
    }
  }

  for (const [name, city, rating, comment] of REVIEWS) {
    const exists = await pool.query("SELECT id FROM testimonials WHERE guest_name = $1 LIMIT 1", [name]);
    if (exists.rowCount === 0) {
      await pool.query("INSERT INTO testimonials (guest_name, city, rating, comment, active) VALUES ($1,$2,$3,$4,true)", [name, city, rating, comment]);
    }
  }

  await pool.query("COMMIT");
  console.log("[upgrade] hotel is now a premium 4-star configuration (spa module enabled, pool disabled). No data was removed.");
} catch (error) {
  await pool.query("ROLLBACK").catch(() => undefined);
  console.error("[upgrade] failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
