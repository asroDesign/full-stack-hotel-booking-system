CREATE TABLE IF NOT EXISTS "stay_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image" text DEFAULT '' NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pricing_mode" text DEFAULT 'contact' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stay_packages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'stay_packages_slug_unique'
		AND conrelid = 'public.stay_packages'::regclass
	) THEN
		ALTER TABLE "stay_packages" ADD CONSTRAINT "stay_packages_slug_unique" UNIQUE("slug");
	END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "stay_package_id" integer;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "stay_package_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "stay_package_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint
		WHERE conname = 'reservations_stay_package_id_stay_packages_id_fk'
		AND conrelid = 'public.reservations'::regclass
	) THEN
		ALTER TABLE "reservations"
		ADD CONSTRAINT "reservations_stay_package_id_stay_packages_id_fk"
		FOREIGN KEY ("stay_package_id") REFERENCES "public"."stay_packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
	END IF;
END $$;
