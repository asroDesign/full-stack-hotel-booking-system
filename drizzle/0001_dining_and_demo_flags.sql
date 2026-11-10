-- Additive & idempotent: dining module + is_demo flags. No data is deleted.
CREATE TABLE IF NOT EXISTS "dining_venues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" text DEFAULT 'restaurant' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cuisine" text DEFAULT '' NOT NULL,
	"hours" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_url" text DEFAULT '' NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"price_level" integer DEFAULT 2 NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"open_to_public" boolean DEFAULT true NOT NULL,
	"show_menu" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dining_venues_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"category" text DEFAULT 'سایر' NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_signature" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_venue_id_dining_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."dining_venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "menu_venue_idx" ON "menu_items" USING btree ("venue_id");
--> statement-breakpoint
-- flag the sample records created by the original demo seed (flag only, nothing is deleted)
UPDATE "reservations" SET "is_demo" = true WHERE ("guest_name", "phone") IN (
  ('حسین رضایی','09121234567'),('نگار شریفی','09351112233'),('امیر حسینی','09141239876'),('فاطمه جعفری','09193334455'),
  ('محمد صادقی','09127778899'),('زهرا کاظمی','09381212121'),('کامران عباسی','09145556677'),('لیلا مرادی','09367654321'));
--> statement-breakpoint
UPDATE "messages" SET "is_demo" = true WHERE "name" IN ('پریسا نادری','مهدی فرهادی','Elena Petrova');
--> statement-breakpoint
UPDATE "testimonials" SET "is_demo" = true WHERE "name" IN ('مریم احمدی','رضا کریمی','سارا محمدی','علی نوروزی');
--> statement-breakpoint
UPDATE "journal_entries" SET "is_demo" = true WHERE "created_by" = 'مدیر هتل' AND "source" <> 'reservation' AND "description" IN (
  'واریز سرمایه اولیه به حساب بانکی','پرداخت حقوق کارکنان','قبوض آب، برق و گاز','خرید مواد غذایی رستوران',
  'سرویس دوره‌ای و مواد ضدعفونی استخر','تبلیغات اینترنتی','فروش رستوران به مهمانان غیرمقیم');
