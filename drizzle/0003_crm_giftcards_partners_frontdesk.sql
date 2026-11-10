-- Additive & idempotent: customer club, campaigns, gift cards, table bookings, guest requests, companions, partners/API, front desk. No data is deleted.
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"audience" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"promo_mode" text DEFAULT 'none' NOT NULL,
	"promo_code" text DEFAULT '' NOT NULL,
	"promo_kind" text DEFAULT 'percent' NOT NULL,
	"promo_value" integer DEFAULT 0 NOT NULL,
	"promo_valid_days" integer DEFAULT 30 NOT NULL,
	"scheduled_at" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_group_members" (
	"group_id" integer NOT NULL,
	"customer_id" integer NOT NULL,
	CONSTRAINT "customer_group_members_group_id_customer_id_pk" PRIMARY KEY("group_id","customer_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customer_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"color" text DEFAULT 'primary' NOT NULL,
	"kind" text DEFAULT 'static' NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"phone" text NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"national_id" text DEFAULT '' NOT NULL,
	"birth_date" date,
	"gender" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"tier" text DEFAULT 'bronze' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"total_spent" bigint DEFAULT 0 NOT NULL,
	"stays_count" integer DEFAULT 0 NOT NULL,
	"last_stay_at" date,
	"source" text DEFAULT 'website' NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"sms_opt_in" boolean DEFAULT true NOT NULL,
	"birthday_sent_year" integer DEFAULT 0 NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gift_card_tx" (
	"id" serial PRIMARY KEY NOT NULL,
	"gift_card_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"reservation_id" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gift_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"initial_amount" integer NOT NULL,
	"balance" integer DEFAULT 0 NOT NULL,
	"purchaser_name" text DEFAULT '' NOT NULL,
	"purchaser_phone" text DEFAULT '' NOT NULL,
	"recipient_name" text DEFAULT '' NOT NULL,
	"recipient_phone" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending_payment' NOT NULL,
	"payment_method" text DEFAULT '' NOT NULL,
	"payment_ref" text DEFAULT '' NOT NULL,
	"paid_at" timestamp,
	"expires_at" date,
	"issued_by" text DEFAULT 'online' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gift_cards_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guest_request_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"sender" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guest_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"unread_staff" boolean DEFAULT true NOT NULL,
	"unread_guest" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partner_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"partner_id" integer,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"status" integer NOT NULL,
	"ip" text DEFAULT '' NOT NULL,
	"message" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "partners" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'agency' NOT NULL,
	"contact_name" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"token_hash" text DEFAULT '' NOT NULL,
	"token_hint" text DEFAULT '' NOT NULL,
	"secret" text DEFAULT '' NOT NULL,
	"commission_percent" integer DEFAULT 0 NOT NULL,
	"auto_confirm" boolean DEFAULT true NOT NULL,
	"can_cancel" boolean DEFAULT true NOT NULL,
	"allowed_ips" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservation_guests" (
	"id" serial PRIMARY KEY NOT NULL,
	"reservation_id" integer NOT NULL,
	"full_name" text NOT NULL,
	"id_number" text DEFAULT '' NOT NULL,
	"nationality" text DEFAULT 'ایرانی' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"relation" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sms_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "table_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"venue_id" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"date" date NOT NULL,
	"time" text NOT NULL,
	"guests" integer DEFAULT 2 NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"source" text DEFAULT 'website' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dining_venues" ADD COLUMN IF NOT EXISTS "booking_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "source" text DEFAULT 'website' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "partner_id" integer;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "external_ref" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "commission" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "customer_id" integer;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "checked_in_at" timestamp;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "checked_out_at" timestamp;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "gift_card_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "gift_card_amount" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "review_invite_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "housekeeping" text DEFAULT 'clean' NOT NULL;--> statement-breakpoint
ALTER TABLE "sms_logs" ADD COLUMN IF NOT EXISTS "campaign_id" integer;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_group_members" ADD CONSTRAINT "customer_group_members_group_id_customer_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."customer_groups"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_group_members" ADD CONSTRAINT "customer_group_members_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "gift_card_tx" ADD CONSTRAINT "gift_card_tx_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guest_request_messages" ADD CONSTRAINT "guest_request_messages_request_id_guest_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."guest_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guest_requests" ADD CONSTRAINT "guest_requests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reservation_guests" ADD CONSTRAINT "reservation_guests_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."reservations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "table_bookings" ADD CONSTRAINT "table_bookings_venue_id_dining_venues_id_fk" FOREIGN KEY ("venue_id") REFERENCES "public"."dining_venues"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object OR duplicate_table THEN NULL;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customers_tier_idx" ON "customers" USING btree ("tier");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pl_partner_idx" ON "partner_logs" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tb_date_idx" ON "table_bookings" USING btree ("date");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "reservations_partner_ref_uq" ON "reservations" ("partner_id", "external_ref") WHERE "external_ref" <> '';
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "reservations_customer_idx" ON "reservations" ("customer_id");
