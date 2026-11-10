-- Baseline (idempotent): safe on empty databases AND on databases created earlier with `drizzle-kit push`.
-- Only ADDS missing tables / columns / constraints / indexes. Never drops or alters existing data.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"level" integer NOT NULL,
	"parent_id" integer,
	"type" text NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "accounts_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "code" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "level" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "parent_id" integer;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "type" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "is_system" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "email" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "password_hash" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "amenities" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"icon" text DEFAULT 'Sparkles' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'عمومی' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "amenities" ADD COLUMN IF NOT EXISTS "title" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "amenities" ADD COLUMN IF NOT EXISTS "icon" text DEFAULT 'Sparkles' NOT NULL;
--> statement-breakpoint
ALTER TABLE "amenities" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "amenities" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'عمومی' NOT NULL;
--> statement-breakpoint
ALTER TABLE "amenities" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "amenities" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text DEFAULT 'طبیعی' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"distance_km" double precision DEFAULT 0 NOT NULL,
	"travel_time" text DEFAULT '' NOT NULL,
	"lat" double precision DEFAULT 0 NOT NULL,
	"lng" double precision DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'طبیعی' NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "image" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "distance_km" double precision DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "travel_time" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "lat" double precision DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "lng" double precision DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "attractions" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "calendar_days" (
	"date" date PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"title" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "calendar_days" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "calendar_days" ADD COLUMN IF NOT EXISTS "title" text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"source_type" text DEFAULT '' NOT NULL,
	"reservation_id" integer,
	"created_by" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "date" date NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'manual' NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "source_type" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "reservation_id" integer;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "created_by" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "journal_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_id" integer NOT NULL,
	"account_id" integer NOT NULL,
	"debit" bigint DEFAULT 0 NOT NULL,
	"credit" bigint DEFAULT 0 NOT NULL,
	"description" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "entry_id" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "account_id" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "debit" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "credit" bigint DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_chunks" (
	"file_id" text NOT NULL,
	"idx" integer NOT NULL,
	"data" "bytea" NOT NULL,
	CONSTRAINT "media_chunks_file_id_idx_pk" PRIMARY KEY("file_id","idx")
);
--> statement-breakpoint
ALTER TABLE "media_chunks" ADD COLUMN IF NOT EXISTS "file_id" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_chunks" ADD COLUMN IF NOT EXISTS "idx" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_chunks" ADD COLUMN IF NOT EXISTS "data" "bytea" NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media_files" (
	"id" text PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"data" "bytea" NOT NULL,
	"chunk_size" integer DEFAULT 0 NOT NULL,
	"complete" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "mime" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "name" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "size" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "data" "bytea" NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "chunk_size" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "complete" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "media_files" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "phone" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "email" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "subject" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "body" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_read" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"reset_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "rate_limits" ADD COLUMN IF NOT EXISTS "count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rate_limits" ADD COLUMN IF NOT EXISTS "reset_at" timestamp NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservations" (
	"id" serial PRIMARY KEY NOT NULL,
	"tracking_code" text NOT NULL,
	"reservation_code" text,
	"kind" text NOT NULL,
	"room_id" integer,
	"service_id" integer,
	"item_name" text DEFAULT '' NOT NULL,
	"guest_name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"national_id" text DEFAULT '' NOT NULL,
	"guests" integer DEFAULT 1 NOT NULL,
	"check_in" date NOT NULL,
	"check_out" date,
	"time_slot" text DEFAULT '' NOT NULL,
	"nights" integer DEFAULT 1 NOT NULL,
	"total_price" integer DEFAULT 0 NOT NULL,
	"extra_guest_fee" integer DEFAULT 0 NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"options_total" integer DEFAULT 0 NOT NULL,
	"nightly" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settled_at" timestamp,
	"deposit_amount" integer DEFAULT 0 NOT NULL,
	"payment_method" text DEFAULT '' NOT NULL,
	"payment_ref" text DEFAULT '' NOT NULL,
	"paid_at" timestamp,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"sms_status" text DEFAULT '' NOT NULL,
	"confirmed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reservations_tracking_code_unique" UNIQUE("tracking_code"),
	CONSTRAINT "reservations_reservation_code_unique" UNIQUE("reservation_code")
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "tracking_code" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "reservation_code" text;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "kind" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "room_id" integer;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "service_id" integer;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "item_name" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "guest_name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "phone" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "email" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "national_id" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "guests" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "check_in" date NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "check_out" date;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "time_slot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "nights" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "total_price" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "extra_guest_fee" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "options" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "options_total" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "nightly" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "settled_at" timestamp;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "deposit_amount" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "payment_method" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "payment_ref" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "paid_at" timestamp;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending_payment' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "notes" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "admin_note" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "sms_status" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "confirmed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "room_rates" (
	"room_id" integer NOT NULL,
	"date" date NOT NULL,
	"price" integer NOT NULL,
	CONSTRAINT "room_rates_room_id_date_pk" PRIMARY KEY("room_id","date")
);
--> statement-breakpoint
ALTER TABLE "room_rates" ADD COLUMN IF NOT EXISTS "room_id" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "room_rates" ADD COLUMN IF NOT EXISTS "date" date NOT NULL;
--> statement-breakpoint
ALTER TABLE "room_rates" ADD COLUMN IF NOT EXISTS "price" integer NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rooms" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"room_number" text DEFAULT '' NOT NULL,
	"type" text DEFAULT 'دبل' NOT NULL,
	"floor" integer DEFAULT 1 NOT NULL,
	"capacity" integer DEFAULT 2 NOT NULL,
	"extra_beds" integer DEFAULT 0 NOT NULL,
	"beds" text DEFAULT '' NOT NULL,
	"size" integer DEFAULT 25 NOT NULL,
	"view" text DEFAULT '' NOT NULL,
	"price_per_night" integer DEFAULT 0 NOT NULL,
	"holiday_price" integer DEFAULT 0 NOT NULL,
	"peak_price" integer DEFAULT 0 NOT NULL,
	"extra_guest_price" integer DEFAULT 0 NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_url" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rooms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "slug" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "room_number" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "type" text DEFAULT 'دبل' NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "floor" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "capacity" integer DEFAULT 2 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "extra_beds" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "beds" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "size" integer DEFAULT 25 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "view" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "price_per_night" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "holiday_price" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "peak_price" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "extra_guest_price" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "options" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "short_description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "images" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "video_url" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "is_featured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon" text DEFAULT 'Sparkles' NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"gallery" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_url" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"price_unit" text DEFAULT 'هر سانس' NOT NULL,
	"working_hours" text DEFAULT '' NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"time_slots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"slot_prices" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"included_guests" integer DEFAULT 4 NOT NULL,
	"extra_guest_price" integer DEFAULT 0 NOT NULL,
	"max_guests" integer DEFAULT 6 NOT NULL,
	"is_bookable" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "slug" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "icon" text DEFAULT 'Sparkles' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "short_description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "description" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "image" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "gallery" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "video_url" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "price" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "price_unit" text DEFAULT 'هر سانس' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "working_hours" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "rules" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "time_slots" jsonb DEFAULT '[]'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "slot_prices" jsonb DEFAULT '{}'::jsonb NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "included_guests" integer DEFAULT 4 NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "extra_guest_price" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "max_guests" integer DEFAULT 6 NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "is_bookable" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "sort_order" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "admin_id" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN IF NOT EXISTS "expires_at" timestamp NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "value" text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"receptor" text NOT NULL,
	"event" text NOT NULL,
	"provider" text NOT NULL,
	"status" text NOT NULL,
	"response" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "receptor" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "event" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "provider" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "status" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "response" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "testimonials" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "name" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "city" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "rating" integer DEFAULT 5 NOT NULL;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "body" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"data" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "mime" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "data" text NOT NULL;
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_entry_id_journal_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."journal_entries"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media_chunks" ADD CONSTRAINT "media_chunks_file_id_media_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."media_files"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservations" ADD CONSTRAINT "reservations_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "room_rates" ADD CONSTRAINT "room_rates_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "sessions" ADD CONSTRAINT "sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "je_date_idx" ON "journal_entries" USING btree ("date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "je_res_idx" ON "journal_entries" USING btree ("reservation_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jl_entry_idx" ON "journal_lines" USING btree ("entry_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jl_account_idx" ON "journal_lines" USING btree ("account_id");
