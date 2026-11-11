CREATE TABLE "stay_packages" (
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
ALTER TABLE "reservations" ADD COLUMN "stay_package_id" integer;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "stay_package_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "stay_package_price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_stay_package_id_stay_packages_id_fk" FOREIGN KEY ("stay_package_id") REFERENCES "public"."stay_packages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
