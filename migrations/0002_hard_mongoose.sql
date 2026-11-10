CREATE TABLE "concierge_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_code" text DEFAULT '' NOT NULL,
	"guest_name" text NOT NULL,
	"phone" text NOT NULL,
	"service_type" text DEFAULT 'airport_transfer' NOT NULL,
	"details" text DEFAULT '' NOT NULL,
	"preferred_date" date,
	"status" text DEFAULT 'new' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"category" text DEFAULT 'رویداد' NOT NULL,
	"starts_at" date NOT NULL,
	"end_date" date,
	"time_label" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"capacity" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"badge" text DEFAULT 'پیشنهاد ویژه' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"old_price" integer DEFAULT 0 NOT NULL,
	"includes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"room_id" integer,
	"valid_until" date,
	"featured" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "offers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'percent' NOT NULL,
	"value" integer DEFAULT 0 NOT NULL,
	"min_nights" integer DEFAULT 1 NOT NULL,
	"max_uses" integer DEFAULT 0 NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" date,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"guest_name" text NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"comment" text NOT NULL,
	"room_id" integer,
	"stay_date" date,
	"status" text DEFAULT 'pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "promo_code" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "discount_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE set null ON UPDATE no action;