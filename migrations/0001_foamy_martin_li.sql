CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"category" text DEFAULT 'غذای اصلی' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "hotel_name" SET DEFAULT 'هتل کاج';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "pool_title" SET DEFAULT 'استخر خانوادگی کاج';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "rooms_title" SET DEFAULT 'اتاق‌ها و سوئیت‌های کاج';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "attractions_kicker" SET DEFAULT 'اطراف کاج';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "gallery_title" SET DEFAULT 'نگاهی به دنیای کاج';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "map_description" SET DEFAULT 'هتل کاج در کیلومتر ۸ جاده گالیکش به پارک ملی گلستان قرار دارد؛ دسترسی آسان از گرگان، گنبد کاووس و مشهد.';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "cta_title" SET DEFAULT 'اقامت بعدی خود را در کاج ثبت کنید';--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "star_rating" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "city" text DEFAULT 'شیراز' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "module_pool" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "module_restaurant" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "module_cafe" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "module_spa" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_title" text DEFAULT 'کافه‌‑رستوران کاج' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_subtitle" text DEFAULT 'طعم‌های اصیل شیراز در فضایی آرام' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_hours" text DEFAULT '۰۸:۰۰ تا ۲۳:۰۰' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_phone" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_image" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_image2" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_video_url" text;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dining_note" text DEFAULT '' NOT NULL;