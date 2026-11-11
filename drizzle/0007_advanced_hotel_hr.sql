CREATE TABLE IF NOT EXISTS "hotel_attendance_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"record_id" integer NOT NULL,
	"action" text NOT NULL,
	"previous_at" timestamp,
	"occurred_at" timestamp NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"recorded_by" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"starts_at" timestamp NOT NULL,
	"ends_at" timestamp NOT NULL,
	"kind" text DEFAULT 'personal' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decision_note" text DEFAULT '' NOT NULL,
	"decided_by" integer,
	"decided_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_payroll_adjustments" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"jalali_year" integer NOT NULL,
	"jalali_month" integer NOT NULL,
	"kind" text NOT NULL,
	"amount_toman" bigint NOT NULL,
	"description" text NOT NULL,
	"legal_basis" text DEFAULT '' NOT NULL,
	"taxable" boolean DEFAULT true NOT NULL,
	"insurable" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_by" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_payroll_leaves" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"jalali_year" integer NOT NULL,
	"jalali_month" integer NOT NULL,
	"kind" text NOT NULL,
	"hours" double precision NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"created_by" integer,
	"decided_by" integer,
	"decided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_payroll_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"jalali_year" integer NOT NULL,
	"minimum_daily_wage_toman" bigint DEFAULT 0 NOT NULL,
	"monthly_housing_toman" bigint DEFAULT 0 NOT NULL,
	"monthly_food_toman" bigint DEFAULT 0 NOT NULL,
	"monthly_marital_toman" bigint DEFAULT 0 NOT NULL,
	"monthly_child_toman" bigint DEFAULT 0 NOT NULL,
	"monthly_seniority_toman" bigint DEFAULT 0 NOT NULL,
	"monthly_tax_exemption_toman" bigint DEFAULT 0 NOT NULL,
	"tax_brackets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"taxable_component_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"insurable_component_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"employee_insurance_percent" integer DEFAULT 7 NOT NULL,
	"employer_insurance_percent" integer DEFAULT 20 NOT NULL,
	"unemployment_insurance_percent" integer DEFAULT 3 NOT NULL,
	"overtime_percent" integer DEFAULT 40 NOT NULL,
	"friday_premium_percent" integer DEFAULT 40 NOT NULL,
	"holiday_premium_percent" integer DEFAULT 0 NOT NULL,
	"night_premium_percent" integer DEFAULT 35 NOT NULL,
	"standard_monthly_hours" integer DEFAULT 220 NOT NULL,
	"minimum_insured_history_days_for_child_allowance" integer DEFAULT 720 NOT NULL,
	"annual_leave_days" integer DEFAULT 26 NOT NULL,
	"legal_source_note" text DEFAULT '' NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_payroll_policies_jalali_year_unique" UNIQUE("jalali_year")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_shift_swap_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"from_staff_id" integer NOT NULL,
	"to_staff_id" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"decision_note" text DEFAULT '' NOT NULL,
	"decided_by" integer,
	"decided_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_shift_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"staff_id" integer NOT NULL,
	"shift_id" integer NOT NULL,
	"name" text NOT NULL,
	"weekdays" text NOT NULL,
	"duty" text NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hotel_attendance" ADD COLUMN IF NOT EXISTS "check_in_by" integer;--> statement-breakpoint
ALTER TABLE "hotel_attendance" ADD COLUMN IF NOT EXISTS "check_out_by" integer;--> statement-breakpoint
ALTER TABLE "hotel_attendance" ADD COLUMN IF NOT EXISTS "updated_by" integer;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "staff_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "friday_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "holiday_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "night_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "leave_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "unpaid_leave_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "short_minutes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "earning_components" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "deduction_components" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "gross_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "employee_insurance_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "employer_insurance_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "income_tax_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "penalty_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "net_total_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "approved_taxable_adjustments_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_entries" ADD COLUMN IF NOT EXISTS "approved_insurable_adjustments_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_periods" ADD COLUMN IF NOT EXISTS "jalali_year" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_periods" ADD COLUMN IF NOT EXISTS "jalali_month" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_periods" ADD COLUMN IF NOT EXISTS "policy_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_periods" ADD COLUMN IF NOT EXISTS "approved_by" integer;--> statement-breakpoint
ALTER TABLE "hotel_payroll_periods" ADD COLUMN IF NOT EXISTS "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "hotel_payroll_periods" ADD COLUMN IF NOT EXISTS "approval_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_payroll_periods" ADD COLUMN IF NOT EXISTS "created_by" integer;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "template_id" integer;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'scheduled' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "absence_note" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "absence_recorded_at" timestamp;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "absence_recorded_by" integer;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "created_by" integer;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "updated_by" integer;--> statement-breakpoint
ALTER TABLE "hotel_shift_assignments" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "national_id" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "birth_date" date;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "father_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "marital_status" text DEFAULT 'single' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "employment_start_date" date;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "employment_end_date" date;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "contract_type" text DEFAULT 'temporary' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "job_code" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "insurance_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "insured_history_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "children_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "child_allowance_eligible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "monthly_base_salary_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "fixed_agreed_salary_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "management_allowance_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "annual_service_base_toman" bigint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "overtime_eligible" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "insurance_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "income_tax_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "include_housing" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "include_food" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "include_marital_allowance" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "include_child_allowance" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "include_seniority" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "bank_account_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "bank_account_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "hotel_staff" ADD COLUMN IF NOT EXISTS "iban" text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE "hotel_staff" SET "monthly_base_salary_toman" = "monthly_salary", "salary_mode" = 'statutory' WHERE "salary_mode" = 'monthly' AND "monthly_salary" > 0;--> statement-breakpoint
UPDATE "hotel_staff" SET "fixed_agreed_salary_toman" = "hourly_rate" * 220, "salary_mode" = 'fixed' WHERE "salary_mode" = 'hourly' AND "hourly_rate" > 0;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_attendance_events_record_id_hotel_attendance_id_fk' AND conrelid = 'public.hotel_attendance_events'::regclass) THEN ALTER TABLE "hotel_attendance_events" ADD CONSTRAINT "hotel_attendance_events_record_id_hotel_attendance_id_fk" FOREIGN KEY ("record_id") REFERENCES "public"."hotel_attendance"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_attendance_events_recorded_by_admins_id_fk' AND conrelid = 'public.hotel_attendance_events'::regclass) THEN ALTER TABLE "hotel_attendance_events" ADD CONSTRAINT "hotel_attendance_events_recorded_by_admins_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."admins"("id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_leave_requests_staff_id_hotel_staff_id_fk' AND conrelid = 'public.hotel_leave_requests'::regclass) THEN ALTER TABLE "hotel_leave_requests" ADD CONSTRAINT "hotel_leave_requests_staff_id_hotel_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."hotel_staff"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_leave_requests_decided_by_admins_id_fk' AND conrelid = 'public.hotel_leave_requests'::regclass) THEN ALTER TABLE "hotel_leave_requests" ADD CONSTRAINT "hotel_leave_requests_decided_by_admins_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_leave_requests_created_by_admins_id_fk' AND conrelid = 'public.hotel_leave_requests'::regclass) THEN ALTER TABLE "hotel_leave_requests" ADD CONSTRAINT "hotel_leave_requests_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_adjustments_staff_id_hotel_staff_id_fk' AND conrelid = 'public.hotel_payroll_adjustments'::regclass) THEN ALTER TABLE "hotel_payroll_adjustments" ADD CONSTRAINT "hotel_payroll_adjustments_staff_id_hotel_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."hotel_staff"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_adjustments_created_by_admins_id_fk' AND conrelid = 'public.hotel_payroll_adjustments'::regclass) THEN ALTER TABLE "hotel_payroll_adjustments" ADD CONSTRAINT "hotel_payroll_adjustments_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_adjustments_approved_by_admins_id_fk' AND conrelid = 'public.hotel_payroll_adjustments'::regclass) THEN ALTER TABLE "hotel_payroll_adjustments" ADD CONSTRAINT "hotel_payroll_adjustments_approved_by_admins_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_leaves_staff_id_hotel_staff_id_fk' AND conrelid = 'public.hotel_payroll_leaves'::regclass) THEN ALTER TABLE "hotel_payroll_leaves" ADD CONSTRAINT "hotel_payroll_leaves_staff_id_hotel_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."hotel_staff"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_leaves_created_by_admins_id_fk' AND conrelid = 'public.hotel_payroll_leaves'::regclass) THEN ALTER TABLE "hotel_payroll_leaves" ADD CONSTRAINT "hotel_payroll_leaves_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_leaves_decided_by_admins_id_fk' AND conrelid = 'public.hotel_payroll_leaves'::regclass) THEN ALTER TABLE "hotel_payroll_leaves" ADD CONSTRAINT "hotel_payroll_leaves_decided_by_admins_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_policies_updated_by_admins_id_fk' AND conrelid = 'public.hotel_payroll_policies'::regclass) THEN ALTER TABLE "hotel_payroll_policies" ADD CONSTRAINT "hotel_payroll_policies_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_swap_requests_assignment_id_hotel_shift_assignments_id_fk' AND conrelid = 'public.hotel_shift_swap_requests'::regclass) THEN ALTER TABLE "hotel_shift_swap_requests" ADD CONSTRAINT "hotel_shift_swap_requests_assignment_id_hotel_shift_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."hotel_shift_assignments"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_swap_requests_from_staff_id_hotel_staff_id_fk' AND conrelid = 'public.hotel_shift_swap_requests'::regclass) THEN ALTER TABLE "hotel_shift_swap_requests" ADD CONSTRAINT "hotel_shift_swap_requests_from_staff_id_hotel_staff_id_fk" FOREIGN KEY ("from_staff_id") REFERENCES "public"."hotel_staff"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_swap_requests_to_staff_id_hotel_staff_id_fk' AND conrelid = 'public.hotel_shift_swap_requests'::regclass) THEN ALTER TABLE "hotel_shift_swap_requests" ADD CONSTRAINT "hotel_shift_swap_requests_to_staff_id_hotel_staff_id_fk" FOREIGN KEY ("to_staff_id") REFERENCES "public"."hotel_staff"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_swap_requests_decided_by_admins_id_fk' AND conrelid = 'public.hotel_shift_swap_requests'::regclass) THEN ALTER TABLE "hotel_shift_swap_requests" ADD CONSTRAINT "hotel_shift_swap_requests_decided_by_admins_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_swap_requests_created_by_admins_id_fk' AND conrelid = 'public.hotel_shift_swap_requests'::regclass) THEN ALTER TABLE "hotel_shift_swap_requests" ADD CONSTRAINT "hotel_shift_swap_requests_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_templates_staff_id_hotel_staff_id_fk' AND conrelid = 'public.hotel_shift_templates'::regclass) THEN ALTER TABLE "hotel_shift_templates" ADD CONSTRAINT "hotel_shift_templates_staff_id_hotel_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."hotel_staff"("id") ON DELETE cascade ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_templates_shift_id_hotel_shifts_id_fk' AND conrelid = 'public.hotel_shift_templates'::regclass) THEN ALTER TABLE "hotel_shift_templates" ADD CONSTRAINT "hotel_shift_templates_shift_id_hotel_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."hotel_shifts"("id") ON DELETE restrict ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_templates_created_by_admins_id_fk' AND conrelid = 'public.hotel_shift_templates'::regclass) THEN ALTER TABLE "hotel_shift_templates" ADD CONSTRAINT "hotel_shift_templates_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_attendance_events_record_time_idx" ON "hotel_attendance_events" USING btree ("record_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_leave_staff_time_idx" ON "hotel_leave_requests" USING btree ("staff_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_leave_status_time_idx" ON "hotel_leave_requests" USING btree ("status","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_payroll_adjustments_period_idx" ON "hotel_payroll_adjustments" USING btree ("jalali_year","jalali_month","staff_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_payroll_leaves_period_idx" ON "hotel_payroll_leaves" USING btree ("jalali_year","jalali_month","staff_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_shift_swaps_status_time_idx" ON "hotel_shift_swap_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_shift_templates_staff_idx" ON "hotel_shift_templates" USING btree ("staff_id","is_active");--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_attendance_check_in_by_admins_id_fk' AND conrelid = 'public.hotel_attendance'::regclass) THEN ALTER TABLE "hotel_attendance" ADD CONSTRAINT "hotel_attendance_check_in_by_admins_id_fk" FOREIGN KEY ("check_in_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_attendance_check_out_by_admins_id_fk' AND conrelid = 'public.hotel_attendance'::regclass) THEN ALTER TABLE "hotel_attendance" ADD CONSTRAINT "hotel_attendance_check_out_by_admins_id_fk" FOREIGN KEY ("check_out_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_attendance_updated_by_admins_id_fk' AND conrelid = 'public.hotel_attendance'::regclass) THEN ALTER TABLE "hotel_attendance" ADD CONSTRAINT "hotel_attendance_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_periods_approved_by_admins_id_fk' AND conrelid = 'public.hotel_payroll_periods'::regclass) THEN ALTER TABLE "hotel_payroll_periods" ADD CONSTRAINT "hotel_payroll_periods_approved_by_admins_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_payroll_periods_created_by_admins_id_fk' AND conrelid = 'public.hotel_payroll_periods'::regclass) THEN ALTER TABLE "hotel_payroll_periods" ADD CONSTRAINT "hotel_payroll_periods_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_assignments_template_id_hotel_shift_templates_id_fk' AND conrelid = 'public.hotel_shift_assignments'::regclass) THEN ALTER TABLE "hotel_shift_assignments" ADD CONSTRAINT "hotel_shift_assignments_template_id_hotel_shift_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."hotel_shift_templates"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_assignments_absence_recorded_by_admins_id_fk' AND conrelid = 'public.hotel_shift_assignments'::regclass) THEN ALTER TABLE "hotel_shift_assignments" ADD CONSTRAINT "hotel_shift_assignments_absence_recorded_by_admins_id_fk" FOREIGN KEY ("absence_recorded_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_assignments_created_by_admins_id_fk' AND conrelid = 'public.hotel_shift_assignments'::regclass) THEN ALTER TABLE "hotel_shift_assignments" ADD CONSTRAINT "hotel_shift_assignments_created_by_admins_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hotel_shift_assignments_updated_by_admins_id_fk' AND conrelid = 'public.hotel_shift_assignments'::regclass) THEN ALTER TABLE "hotel_shift_assignments" ADD CONSTRAINT "hotel_shift_assignments_updated_by_admins_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."admins"("id") ON DELETE set null ON UPDATE no action; END IF; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_shift_assignments_staff_date_idx" ON "hotel_shift_assignments" USING btree ("staff_id","work_date");
