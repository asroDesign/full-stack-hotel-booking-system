CREATE TABLE "cost_centers" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cost_centers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "journal_lines" ADD COLUMN "cost_center_id" integer;--> statement-breakpoint
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_cost_center_id_cost_centers_id_fk" FOREIGN KEY ("cost_center_id") REFERENCES "public"."cost_centers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "jl_cost_center_idx" ON "journal_lines" USING btree ("cost_center_id");