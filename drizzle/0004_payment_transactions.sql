CREATE TABLE IF NOT EXISTS "payment_transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "reservation_id" integer,
  "gift_card_id" integer,
  "provider" text NOT NULL,
  "amount" integer NOT NULL,
  "authority" text,
  "callback_token_hash" text NOT NULL,
  "callback_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" text DEFAULT 'creating' NOT NULL,
  "ref_code" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "verified_at" timestamp,
  CONSTRAINT "payment_transactions_provider_authority_unique" UNIQUE("provider", "authority"),
  CONSTRAINT "payment_transactions_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "payment_transactions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "gift_cards"("id") ON DELETE restrict ON UPDATE no action,
  CONSTRAINT "payment_transactions_one_owner_check" CHECK (("reservation_id" IS NOT NULL)::int + ("gift_card_id" IS NOT NULL)::int = 1),
  CONSTRAINT "payment_transactions_positive_amount_check" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_transactions_reservation_idx" ON "payment_transactions" USING btree ("reservation_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_transactions_giftcard_idx" ON "payment_transactions" USING btree ("gift_card_id", "created_at");
