CREATE TABLE IF NOT EXISTS "hotel_staff" (
	"id" serial PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"job_title" text DEFAULT '' NOT NULL,
	"duty" text DEFAULT 'operations' NOT NULL,
	"salary_mode" text DEFAULT 'monthly' NOT NULL,
	"monthly_salary" integer DEFAULT 0 NOT NULL,
	"hourly_rate" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_staff_duty_active_idx" ON "hotel_staff" USING btree ("duty", "is_active");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_shifts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"break_minutes" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_shift_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_date" date NOT NULL,
	"shift_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"duty" text NOT NULL,
	"is_lead" boolean DEFAULT false NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_shift_assignments_unique" UNIQUE("work_date", "shift_id", "staff_id"),
	CONSTRAINT "hotel_shift_assignments_shift_id_hotel_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "hotel_shifts"("id") ON DELETE CASCADE,
	CONSTRAINT "hotel_shift_assignments_staff_id_hotel_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "hotel_staff"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_shift_assignments_date_duty_idx" ON "hotel_shift_assignments" USING btree ("work_date", "duty");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"assignment_id" integer NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"clock_in_at" timestamp,
	"clock_out_at" timestamp,
	"worked_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_attendance_assignment_id_unique" UNIQUE("assignment_id"),
	CONSTRAINT "hotel_attendance_assignment_id_hotel_shift_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "hotel_shift_assignments"("id") ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_payroll_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_payroll_periods_dates_unique" UNIQUE("date_from", "date_to")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_payroll_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"regular_minutes" integer DEFAULT 0 NOT NULL,
	"overtime_minutes" integer DEFAULT 0 NOT NULL,
	"base_pay" integer DEFAULT 0 NOT NULL,
	"overtime_pay" integer DEFAULT 0 NOT NULL,
	"bonus" integer DEFAULT 0 NOT NULL,
	"deductions" integer DEFAULT 0 NOT NULL,
	"net_pay" integer DEFAULT 0 NOT NULL,
	"payment_status" text DEFAULT 'unpaid' NOT NULL,
	"paid_at" timestamp,
	"payment_ref" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	CONSTRAINT "hotel_payroll_entries_period_staff_unique" UNIQUE("period_id", "staff_id"),
	CONSTRAINT "hotel_payroll_entries_period_id_hotel_payroll_periods_id_fk" FOREIGN KEY ("period_id") REFERENCES "hotel_payroll_periods"("id") ON DELETE CASCADE,
	CONSTRAINT "hotel_payroll_entries_staff_id_hotel_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "hotel_staff"("id") ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "hotel_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_type" text NOT NULL,
	"duty" text,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"work_date" date NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"room_id" integer,
	"reservation_id" integer,
	"assignment_id" integer,
	"assigned_staff_id" integer,
	"source_key" text,
	"sms_status" text DEFAULT '' NOT NULL,
	"sms_sent_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hotel_tasks_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "hotel_tasks_room_id_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL,
	CONSTRAINT "hotel_tasks_reservation_id_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL,
	CONSTRAINT "hotel_tasks_assignment_id_hotel_shift_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "hotel_shift_assignments"("id") ON DELETE SET NULL,
	CONSTRAINT "hotel_tasks_assigned_staff_id_hotel_staff_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "hotel_staff"("id") ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_tasks_status_date_idx" ON "hotel_tasks" USING btree ("status", "work_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "hotel_tasks_room_status_idx" ON "hotel_tasks" USING btree ("room_id", "status");
