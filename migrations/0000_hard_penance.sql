CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'asset' NOT NULL,
	"level" text DEFAULT 'general' NOT NULL,
	"parent_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "attractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text DEFAULT 'طبیعت‌گردی' NOT NULL,
	"distance_km" integer DEFAULT 10 NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"image_url" text NOT NULL,
	"map_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracking_code" text NOT NULL,
	"reservation_code" text,
	"guest_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"service_type" text DEFAULT 'room' NOT NULL,
	"room_id" integer,
	"service_label" text DEFAULT '' NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date NOT NULL,
	"time_slot" text,
	"nights" integer DEFAULT 1 NOT NULL,
	"adults" integer DEFAULT 2 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"extra_guests" integer DEFAULT 0 NOT NULL,
	"extra_guest_fee" integer DEFAULT 0 NOT NULL,
	"addons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"addons_total" integer DEFAULT 0 NOT NULL,
	"rate_breakdown" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pool_slot_id" integer,
	"base_price" integer DEFAULT 0 NOT NULL,
	"unit_price" integer DEFAULT 0 NOT NULL,
	"total_amount" integer DEFAULT 0 NOT NULL,
	"prepayment_amount" integer DEFAULT 0 NOT NULL,
	"paid_amount" integer DEFAULT 0 NOT NULL,
	"payment_ref" text,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"notes" text,
	"admin_note" text,
	"paid_at" timestamp with time zone,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_tracking_code_unique" UNIQUE("tracking_code"),
	CONSTRAINT "bookings_reservation_code_unique" UNIQUE("reservation_code")
);
--> statement-breakpoint
CREATE TABLE "facilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"description" text NOT NULL,
	"icon" text DEFAULT '✨' NOT NULL,
	"image_url" text NOT NULL,
	"category" text DEFAULT 'رفاهی' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"highlight" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "facilities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "gallery" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"image_url" text NOT NULL,
	"category" text DEFAULT 'هتل' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" integer NOT NULL,
	"date" date NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"reference" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_by" text DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journal_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit" integer DEFAULT 0 NOT NULL,
	"credit" integer DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"subject" text DEFAULT 'پیام عمومی' NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"reply_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pool_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"price" integer NOT NULL,
	"capacity" integer DEFAULT 8 NOT NULL,
	"extra_guest_fee" integer DEFAULT 350000 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "room_daily_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"room_id" integer NOT NULL,
	"date" date NOT NULL,
	"price" integer NOT NULL,
	"label" text DEFAULT 'custom' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"room_number" text NOT NULL,
	"room_type" text NOT NULL,
	"floor" integer DEFAULT 1 NOT NULL,
	"capacity" integer DEFAULT 2 NOT NULL,
	"max_capacity" integer DEFAULT 4 NOT NULL,
	"extra_guest_fee" integer DEFAULT 0 NOT NULL,
	"addons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"size" integer DEFAULT 28 NOT NULL,
	"bed_type" text DEFAULT 'تخت دو نفره' NOT NULL,
	"view" text DEFAULT 'منظره جنگل' NOT NULL,
	"description" text NOT NULL,
	"long_description" text DEFAULT '' NOT NULL,
	"price_per_night" integer NOT NULL,
	"prepayment_percent" integer DEFAULT 30 NOT NULL,
	"cover_image" text NOT NULL,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"amenities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_url" text,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token" text PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"hotel_name" text DEFAULT 'هتل آتالار' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"hero_title" text DEFAULT '' NOT NULL,
	"hero_subtitle" text DEFAULT '' NOT NULL,
	"hero_image" text DEFAULT '' NOT NULL,
	"about_title" text DEFAULT '' NOT NULL,
	"about_text" text DEFAULT '' NOT NULL,
	"about_image" text DEFAULT '' NOT NULL,
	"story_text" text DEFAULT '' NOT NULL,
	"video_url" text,
	"phone" text DEFAULT '' NOT NULL,
	"mobile" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"map_lat" text DEFAULT '37.2719' NOT NULL,
	"map_lng" text DEFAULT '55.4323' NOT NULL,
	"map_address" text DEFAULT '' NOT NULL,
	"instagram" text DEFAULT '' NOT NULL,
	"telegram" text DEFAULT '' NOT NULL,
	"whatsapp" text DEFAULT '' NOT NULL,
	"whatsapp_link" text DEFAULT '' NOT NULL,
	"check_in_time" text DEFAULT '۱۴:۰۰' NOT NULL,
	"check_out_time" text DEFAULT '۱۲:۰۰' NOT NULL,
	"pool_price" integer DEFAULT 2500000 NOT NULL,
	"pool_title" text DEFAULT 'استخر خانوادگی آتالار' NOT NULL,
	"pool_description" text DEFAULT '' NOT NULL,
	"pool_image" text DEFAULT '' NOT NULL,
	"card_number" text DEFAULT '' NOT NULL,
	"card_holder" text DEFAULT '' NOT NULL,
	"total_rooms" integer DEFAULT 16 NOT NULL,
	"hero_media_type" text DEFAULT 'image' NOT NULL,
	"hero_video_url" text,
	"pool_media_type" text DEFAULT 'video' NOT NULL,
	"pool_video_url" text,
	"pool_video_poster" text DEFAULT '' NOT NULL,
	"extra_guest_fee" integer DEFAULT 350000 NOT NULL,
	"pool_base_capacity" integer DEFAULT 8 NOT NULL,
	"pool_max_capacity" integer DEFAULT 12 NOT NULL,
	"rooms_kicker" text DEFAULT 'اقامتگاه' NOT NULL,
	"rooms_title" text DEFAULT 'اتاق‌ها و سوئیت‌های آتالار' NOT NULL,
	"rooms_description" text DEFAULT '۱۶ اتاق و سوئیت با منظره جنگل، امکانات کامل و چیدمانی گرم. اتاق مناسب خود را انتخاب کنید و درخواست رزرو ثبت نمایید.' NOT NULL,
	"facilities_kicker" text DEFAULT 'امکانات هتل' NOT NULL,
	"facilities_title" text DEFAULT 'هر آنچه برای یک اقامت راحت نیاز دارید' NOT NULL,
	"facilities_description" text DEFAULT 'از استخر و اسپا تا رستوران محلی، ترانسفر فرودگاهی و پارکینگ سرپوشیده؛ همه در یک مجموعه.' NOT NULL,
	"attractions_kicker" text DEFAULT 'اطراف آتالار' NOT NULL,
	"attractions_title" text DEFAULT 'جاذبه‌های گردشگری نزدیک هتل' NOT NULL,
	"attractions_description" text DEFAULT 'جنگل، آبشار، برج تاریخی و دریای خزر؛ هر روز اقامت خود را به یک ماجرای تازه تبدیل کنید.' NOT NULL,
	"gallery_kicker" text DEFAULT 'گالری تصاویر' NOT NULL,
	"gallery_title" text DEFAULT 'نگاهی به دنیای آتالار' NOT NULL,
	"gallery_description" text DEFAULT 'تصاویری واقعی از اتاق‌ها، استخر، رستوران و طبیعت اطراف هتل.' NOT NULL,
	"testimonials_title" text DEFAULT 'خاطره‌هایی که مهمانان ما ساخته‌اند' NOT NULL,
	"map_title" text DEFAULT 'ما را روی نقشه پیدا کنید' NOT NULL,
	"map_description" text DEFAULT 'هتل آتالار در کیلومتر ۸ جاده گالیکش به پارک ملی گلستان قرار دارد؛ دسترسی آسان از گرگان، گنبد کاووس و مشهد.' NOT NULL,
	"cta_title" text DEFAULT 'اقامت بعدی خود را در آتالار ثبت کنید' NOT NULL,
	"cta_description" text DEFAULT 'درخواست رزرو را آنلاین ثبت کنید، پیش‌پرداخت را پرداخت کنید و پس از تأیید پذیرش، کد رزرو خود را دریافت کنید.' NOT NULL,
	"stat_years" text DEFAULT 'از سال ۱۳۹۶' NOT NULL,
	"stat_years_label" text DEFAULT 'میزبان خانواده‌ها' NOT NULL,
	"stat_guests" text DEFAULT '+۱٬۲۰۰' NOT NULL,
	"stat_guests_label" text DEFAULT 'میزبانی از مهمانان' NOT NULL,
	"stat_rating" text DEFAULT '۴٫۸' NOT NULL,
	"stat_rating_count" text DEFAULT '۳۱۲' NOT NULL,
	"room_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pool_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sms_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'kavenegar' NOT NULL,
	"pattern" text DEFAULT '' NOT NULL,
	"receptor" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"context" text DEFAULT 'general' NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"response" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_days" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'holiday' NOT NULL,
	"percent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"comment" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_pool_slot_id_pool_slots_id_fk" FOREIGN KEY ("pool_slot_id") REFERENCES "public"."pool_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_daily_prices" ADD CONSTRAINT "room_daily_prices_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "room_daily_prices_room_date_idx" ON "room_daily_prices" USING btree ("room_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "special_days_date_idx" ON "special_days" USING btree ("date");