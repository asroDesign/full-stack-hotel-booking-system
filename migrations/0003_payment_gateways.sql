ALTER TABLE "settings" ADD COLUMN "payment_zarinpal_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "zarinpal_merchant_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "zarinpal_sandbox" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "payment_zibal_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "zibal_merchant" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "payment_saman_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "saman_terminal_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "payment_mellat_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mellat_terminal_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mellat_username" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "mellat_password" text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE TABLE "payment_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"provider" text NOT NULL,
	"amount" integer NOT NULL,
	"authority" text,
	"callback_token_hash" text NOT NULL,
	"callback_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'creating' NOT NULL,
	"ref_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	CONSTRAINT "payment_transactions_authority_unique" UNIQUE("authority"),
	CONSTRAINT "payment_transactions_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE restrict ON UPDATE no action
);--> statement-breakpoint
CREATE INDEX "payment_transactions_booking_idx" ON "payment_transactions" USING btree ("booking_id", "created_at");
