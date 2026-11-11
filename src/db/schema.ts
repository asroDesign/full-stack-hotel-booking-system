import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  date,
  customType,
  bigint,
  primaryKey,
  index,
  unique,
} from "drizzle-orm/pg-core";

export type RoomOption = {
  id: string;
  title: string;
  price: number;
  unit: "per_night" | "per_person_night" | "per_stay" | "per_person";
  included: boolean;
};

export type SelectedOption = { id: string; title: string; unit: RoomOption["unit"]; price: number; amount: number };

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .references(() => admins.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  roomNumber: text("room_number").notNull().default(""),
  type: text("type").notNull().default("دبل"),
  floor: integer("floor").notNull().default(1),
  capacity: integer("capacity").notNull().default(2),
  extraBeds: integer("extra_beds").notNull().default(0),
  beds: text("beds").notNull().default(""),
  size: integer("size").notNull().default(25),
  view: text("view").notNull().default(""),
  pricePerNight: integer("price_per_night").notNull().default(0),
  holidayPrice: integer("holiday_price").notNull().default(0),
  peakPrice: integer("peak_price").notNull().default(0),
  extraGuestPrice: integer("extra_guest_price").notNull().default(0),
  options: jsonb("options").$type<RoomOption[]>().notNull().default([]),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  videoUrl: text("video_url").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  housekeeping: text("housekeeping").$type<"clean" | "dirty" | "inspected" | "out_of_order">().notNull().default("clean"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("Sparkles"),
  shortDescription: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  gallery: jsonb("gallery").$type<string[]>().notNull().default([]),
  videoUrl: text("video_url").notNull().default(""),
  price: integer("price").notNull().default(0),
  priceUnit: text("price_unit").notNull().default("هر سانس"),
  workingHours: text("working_hours").notNull().default(""),
  rules: jsonb("rules").$type<string[]>().notNull().default([]),
  timeSlots: jsonb("time_slots").$type<string[]>().notNull().default([]),
  slotPrices: jsonb("slot_prices").$type<Record<string, number>>().notNull().default({}),
  includedGuests: integer("included_guests").notNull().default(4),
  extraGuestPrice: integer("extra_guest_price").notNull().default(0),
  maxGuests: integer("max_guests").notNull().default(6),
  isBookable: boolean("is_bookable").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stayPackages = pgTable("stay_packages", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  pricingMode: text("pricing_mode").$type<"fixed" | "contact">().notNull().default("contact"),
  price: integer("price").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const amenities = pgTable("amenities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  icon: text("icon").notNull().default("Sparkles"),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("عمومی"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const attractions = pgTable("attractions", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("طبیعی"),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  distanceKm: doublePrecision("distance_km").notNull().default(0),
  travelTime: text("travel_time").notNull().default(""),
  lat: doublePrecision("lat").notNull().default(0),
  lng: doublePrecision("lng").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ReservationSource = "website" | "walk_in" | "phone" | "agency" | "partner_site" | "admin";

export type ReservationStatus =
  | "pending_payment"
  | "paid"
  | "confirmed"
  | "rejected"
  | "cancelled";

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  trackingCode: text("tracking_code").notNull().unique(),
  reservationCode: text("reservation_code").unique(),
  kind: text("kind").$type<"room" | "service">().notNull(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  serviceId: integer("service_id").references(() => services.id, { onDelete: "set null" }),
  stayPackageId: integer("stay_package_id").references(() => stayPackages.id, { onDelete: "set null" }),
  stayPackageName: text("stay_package_name").notNull().default(""),
  stayPackagePrice: integer("stay_package_price").notNull().default(0),
  itemName: text("item_name").notNull().default(""),
  guestName: text("guest_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull().default(""),
  nationalId: text("national_id").notNull().default(""),
  guests: integer("guests").notNull().default(1),
  checkIn: date("check_in").notNull(),
  checkOut: date("check_out"),
  timeSlot: text("time_slot").notNull().default(""),
  nights: integer("nights").notNull().default(1),
  totalPrice: integer("total_price").notNull().default(0),
  extraGuestFee: integer("extra_guest_fee").notNull().default(0),
  options: jsonb("options").$type<SelectedOption[]>().notNull().default([]),
  promoCode: text("promo_code").notNull().default(""),
  discount: integer("discount").notNull().default(0),
  optionsTotal: integer("options_total").notNull().default(0),
  nightly: jsonb("nightly").$type<{ date: string; price: number; kind: string }[]>().notNull().default([]),
  settledAt: timestamp("settled_at"),
  depositAmount: integer("deposit_amount").notNull().default(0),
  paymentMethod: text("payment_method").notNull().default(""),
  paymentRef: text("payment_ref").notNull().default(""),
  paidAt: timestamp("paid_at"),
  status: text("status").$type<ReservationStatus>().notNull().default("pending_payment"),
  notes: text("notes").notNull().default(""),
  adminNote: text("admin_note").notNull().default(""),
  smsStatus: text("sms_status").notNull().default(""),
  isDemo: boolean("is_demo").notNull().default(false),
  source: text("source").$type<ReservationSource>().notNull().default("website"),
  partnerId: integer("partner_id"),
  externalRef: text("external_ref").notNull().default(""),
  commission: integer("commission").notNull().default(0),
  customerId: integer("customer_id"),
  checkedInAt: timestamp("checked_in_at"),
  checkedOutAt: timestamp("checked_out_at"),
  giftCardCode: text("gift_card_code").notNull().default(""),
  giftCardAmount: integer("gift_card_amount").notNull().default(0),
  reviewInviteSentAt: timestamp("review_invite_sent_at"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  subject: text("subject").notNull().default(""),
  body: text("body").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull().default(""),
  rating: integer("rating").notNull().default(5),
  body: text("body").notNull(),
  isApproved: boolean("is_approved").notNull().default(true),
  reservationId: integer("reservation_id"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull().default(""),
});

export const uploads = pgTable("uploads", {
  id: text("id").primaryKey(),
  mime: text("mime").notNull(),
  data: text("data").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediaFiles = pgTable("media_files", {
  id: text("id").primaryKey(),
  mime: text("mime").notNull(),
  name: text("name").notNull().default(""),
  size: integer("size").notNull().default(0),
  data: bytea("data").notNull(),
  chunkSize: integer("chunk_size").notNull().default(0),
  complete: boolean("complete").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const mediaChunks = pgTable(
  "media_chunks",
  {
    fileId: text("file_id")
      .notNull()
      .references(() => mediaFiles.id, { onDelete: "cascade" }),
    idx: integer("idx").notNull(),
    data: bytea("data").notNull(),
  },
  (t) => [primaryKey({ columns: [t.fileId, t.idx] })],
);

/* ---------- pricing calendar ---------- */
export const roomRates = pgTable(
  "room_rates",
  {
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    price: integer("price").notNull(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.date] })],
);

export const calendarDays = pgTable("calendar_days", {
  date: date("date").primaryKey(),
  kind: text("kind").$type<"holiday" | "peak">().notNull(),
  title: text("title").notNull().default(""),
});

/* ---------- security ---------- */
export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: timestamp("reset_at").notNull(),
});

export const smsLogs = pgTable("sms_logs", {
  id: serial("id").primaryKey(),
  receptor: text("receptor").notNull(),
  event: text("event").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  response: text("response").notNull().default(""),
  campaignId: integer("campaign_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- hotel staffing, shifts, operations and payroll ---------- */
export type StaffDuty = "reception" | "housekeeping" | "maintenance" | "operations";
export type HotelTaskStatus = "open" | "in_progress" | "done" | "cancelled";

export const hotelStaff = pgTable("hotel_staff", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().default(""),
  jobTitle: text("job_title").notNull().default(""),
  duty: text("duty").$type<StaffDuty>().notNull().default("operations"),
  nationalId: text("national_id").notNull().default(""),
  birthDate: date("birth_date", { mode: "string" }),
  fatherName: text("father_name").notNull().default(""),
  maritalStatus: text("marital_status").notNull().default("single"),
  employmentStartDate: date("employment_start_date", { mode: "string" }),
  employmentEndDate: date("employment_end_date", { mode: "string" }),
  contractType: text("contract_type").notNull().default("temporary"),
  jobCode: text("job_code").notNull().default(""),
  insuranceNumber: text("insurance_number").notNull().default(""),
  insuredHistoryDays: integer("insured_history_days").notNull().default(0),
  childrenCount: integer("children_count").notNull().default(0),
  childAllowanceEligible: boolean("child_allowance_eligible").notNull().default(false),
  salaryMode: text("salary_mode").$type<"monthly" | "hourly" | "statutory" | "fixed">().notNull().default("monthly"),
  monthlySalary: integer("monthly_salary").notNull().default(0),
  hourlyRate: integer("hourly_rate").notNull().default(0),
  monthlyBaseSalaryToman: bigint("monthly_base_salary_toman", { mode: "number" }).notNull().default(0),
  fixedAgreedSalaryToman: bigint("fixed_agreed_salary_toman", { mode: "number" }).notNull().default(0),
  managementAllowanceToman: bigint("management_allowance_toman", { mode: "number" }).notNull().default(0),
  annualServiceBaseToman: bigint("annual_service_base_toman", { mode: "number" }).notNull().default(0),
  overtimeEligible: boolean("overtime_eligible").notNull().default(true),
  insuranceEnabled: boolean("insurance_enabled").notNull().default(true),
  incomeTaxEnabled: boolean("income_tax_enabled").notNull().default(true),
  includeHousing: boolean("include_housing").notNull().default(true),
  includeFood: boolean("include_food").notNull().default(true),
  includeMaritalAllowance: boolean("include_marital_allowance").notNull().default(true),
  includeChildAllowance: boolean("include_child_allowance").notNull().default(true),
  includeSeniority: boolean("include_seniority").notNull().default(true),
  bankAccountName: text("bank_account_name").notNull().default(""),
  bankAccountNumber: text("bank_account_number").notNull().default(""),
  iban: text("iban").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes").notNull().default(""),
  createdBy: integer("created_by").references(() => admins.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("hotel_staff_duty_active_idx").on(t.duty, t.isActive)]);

export const hotelShifts = pgTable("hotel_shifts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakMinutes: integer("break_minutes").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const hotelShiftTemplates = pgTable("hotel_shift_templates", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => hotelStaff.id, { onDelete: "cascade" }),
  shiftId: integer("shift_id").notNull().references(() => hotelShifts.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  weekdays: text("weekdays").notNull(),
  duty: text("duty").$type<StaffDuty>().notNull(),
  isLead: boolean("is_lead").notNull().default(false),
  location: text("location").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("hotel_shift_templates_staff_idx").on(t.staffId, t.isActive)]);

export const hotelShiftAssignments = pgTable("hotel_shift_assignments", {
  id: serial("id").primaryKey(),
  workDate: date("work_date").notNull(),
  shiftId: integer("shift_id").notNull().references(() => hotelShifts.id, { onDelete: "cascade" }),
  templateId: integer("template_id").references(() => hotelShiftTemplates.id, { onDelete: "set null" }),
  staffId: integer("staff_id").notNull().references(() => hotelStaff.id, { onDelete: "cascade" }),
  duty: text("duty").$type<StaffDuty>().notNull(),
  status: text("status").$type<"scheduled" | "cancelled" | "absent">().notNull().default("scheduled"),
  absenceNote: text("absence_note").notNull().default(""),
  absenceRecordedAt: timestamp("absence_recorded_at"),
  absenceRecordedBy: integer("absence_recorded_by").references(() => admins.id, { onDelete: "set null" }),
  isLead: boolean("is_lead").notNull().default(false),
  notes: text("notes").notNull().default(""),
  version: integer("version").notNull().default(1),
  createdBy: integer("created_by").references(() => admins.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [unique("hotel_shift_assignments_unique").on(t.workDate, t.shiftId, t.staffId), index("hotel_shift_assignments_date_duty_idx").on(t.workDate, t.duty), index("hotel_shift_assignments_staff_date_idx").on(t.staffId, t.workDate)]);

export const hotelAttendance = pgTable("hotel_attendance", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => hotelShiftAssignments.id, { onDelete: "cascade" }).unique(),
  status: text("status").$type<"scheduled" | "present" | "late" | "absent" | "leave">().notNull().default("scheduled"),
  clockInAt: timestamp("clock_in_at"),
  clockOutAt: timestamp("clock_out_at"),
  checkInBy: integer("check_in_by").references(() => admins.id, { onDelete: "set null" }),
  checkOutBy: integer("check_out_by").references(() => admins.id, { onDelete: "set null" }),
  updatedBy: integer("updated_by").references(() => admins.id, { onDelete: "set null" }),
  workedMinutes: integer("worked_minutes").notNull().default(0),
  overtimeMinutes: integer("overtime_minutes").notNull().default(0),
  note: text("note").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hotelAttendanceEvents = pgTable("hotel_attendance_events", {
  id: serial("id").primaryKey(),
  recordId: integer("record_id").notNull().references(() => hotelAttendance.id, { onDelete: "cascade" }),
  action: text("action").$type<"check_in" | "check_out" | "adjust_check_in" | "adjust_check_out" | "status_change">().notNull(),
  previousAt: timestamp("previous_at"),
  occurredAt: timestamp("occurred_at").notNull(),
  reason: text("reason").notNull().default(""),
  recordedBy: integer("recorded_by").notNull().references(() => admins.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("hotel_attendance_events_record_time_idx").on(t.recordId, t.createdAt)]);

export const hotelLeaveRequests = pgTable("hotel_leave_requests", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => hotelStaff.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  kind: text("kind").$type<"annual" | "sick" | "unpaid" | "personal" | "other">().notNull().default("personal"),
  reason: text("reason").notNull().default(""),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  decisionNote: text("decision_note").notNull().default(""),
  decidedBy: integer("decided_by").references(() => admins.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  createdBy: integer("created_by").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("hotel_leave_staff_time_idx").on(t.staffId, t.startsAt), index("hotel_leave_status_time_idx").on(t.status, t.startsAt)]);

export const hotelShiftSwapRequests = pgTable("hotel_shift_swap_requests", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").notNull().references(() => hotelShiftAssignments.id, { onDelete: "cascade" }),
  fromStaffId: integer("from_staff_id").notNull().references(() => hotelStaff.id, { onDelete: "cascade" }),
  toStaffId: integer("to_staff_id").notNull().references(() => hotelStaff.id, { onDelete: "cascade" }),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  reason: text("reason").notNull().default(""),
  decisionNote: text("decision_note").notNull().default(""),
  decidedBy: integer("decided_by").references(() => admins.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  createdBy: integer("created_by").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("hotel_shift_swaps_status_time_idx").on(t.status, t.createdAt)]);

export const hotelPayrollPeriods = pgTable("hotel_payroll_periods", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  dateFrom: date("date_from").notNull(),
  dateTo: date("date_to").notNull(),
  jalaliYear: integer("jalali_year").notNull().default(0),
  jalaliMonth: integer("jalali_month").notNull().default(0),
  status: text("status").$type<"draft" | "approved" | "paid">().notNull().default("draft"),
  policySnapshot: jsonb("policy_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  approvedBy: integer("approved_by").references(() => admins.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  approvalNote: text("approval_note").notNull().default(""),
  createdBy: integer("created_by").references(() => admins.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [unique("hotel_payroll_periods_dates_unique").on(t.dateFrom, t.dateTo)]);

export const hotelPayrollEntries = pgTable("hotel_payroll_entries", {
  id: serial("id").primaryKey(),
  periodId: integer("period_id").notNull().references(() => hotelPayrollPeriods.id, { onDelete: "cascade" }),
  staffId: integer("staff_id").notNull().references(() => hotelStaff.id, { onDelete: "restrict" }),
  staffSnapshot: jsonb("staff_snapshot").$type<Record<string, unknown>>().notNull().default({}),
  regularMinutes: integer("regular_minutes").notNull().default(0),
  overtimeMinutes: integer("overtime_minutes").notNull().default(0),
  fridayMinutes: integer("friday_minutes").notNull().default(0),
  holidayMinutes: integer("holiday_minutes").notNull().default(0),
  nightMinutes: integer("night_minutes").notNull().default(0),
  leaveMinutes: integer("leave_minutes").notNull().default(0),
  unpaidLeaveMinutes: integer("unpaid_leave_minutes").notNull().default(0),
  shortMinutes: integer("short_minutes").notNull().default(0),
  earningComponents: jsonb("earning_components").$type<{ key: string; label: string; amountToman: number; taxable: boolean; insurable: boolean }[]>().notNull().default([]),
  deductionComponents: jsonb("deduction_components").$type<{ key: string; label: string; amountToman: number; accounting: boolean }[]>().notNull().default([]),
  basePay: integer("base_pay").notNull().default(0),
  overtimePay: integer("overtime_pay").notNull().default(0),
  bonus: integer("bonus").notNull().default(0),
  deductions: integer("deductions").notNull().default(0),
  grossToman: bigint("gross_toman", { mode: "number" }).notNull().default(0),
  employeeInsuranceToman: bigint("employee_insurance_toman", { mode: "number" }).notNull().default(0),
  employerInsuranceToman: bigint("employer_insurance_toman", { mode: "number" }).notNull().default(0),
  incomeTaxToman: bigint("income_tax_toman", { mode: "number" }).notNull().default(0),
  penaltyToman: bigint("penalty_toman", { mode: "number" }).notNull().default(0),
  netPay: integer("net_pay").notNull().default(0),
  netToman: bigint("net_total_toman", { mode: "number" }).notNull().default(0),
  approvedTaxableAdjustmentsToman: bigint("approved_taxable_adjustments_toman", { mode: "number" }).notNull().default(0),
  approvedInsurableAdjustmentsToman: bigint("approved_insurable_adjustments_toman", { mode: "number" }).notNull().default(0),
  paymentStatus: text("payment_status").$type<"unpaid" | "paid">().notNull().default("unpaid"),
  paidAt: timestamp("paid_at"),
  paidBy: integer("paid_by").references(() => admins.id, { onDelete: "set null" }),
  paymentRef: text("payment_ref").notNull().default(""),
  notes: text("notes").notNull().default(""),
}, (t) => [unique("hotel_payroll_entries_period_staff_unique").on(t.periodId, t.staffId)]);

export const hotelPayrollPolicies = pgTable("hotel_payroll_policies", {
  id: serial("id").primaryKey(),
  jalaliYear: integer("jalali_year").notNull().unique(),
  minimumDailyWageToman: bigint("minimum_daily_wage_toman", { mode: "number" }).notNull().default(0),
  monthlyHousingToman: bigint("monthly_housing_toman", { mode: "number" }).notNull().default(0),
  monthlyFoodToman: bigint("monthly_food_toman", { mode: "number" }).notNull().default(0),
  monthlyMaritalToman: bigint("monthly_marital_toman", { mode: "number" }).notNull().default(0),
  monthlyChildToman: bigint("monthly_child_toman", { mode: "number" }).notNull().default(0),
  monthlySeniorityToman: bigint("monthly_seniority_toman", { mode: "number" }).notNull().default(0),
  monthlyTaxExemptionToman: bigint("monthly_tax_exemption_toman", { mode: "number" }).notNull().default(0),
  publicHolidayDates: jsonb("public_holiday_dates").$type<string[]>().notNull().default([]),
  taxBrackets: jsonb("tax_brackets").$type<{ upToToman: number | null; ratePercent: number }[]>().notNull().default([]),
  taxableComponentKeys: jsonb("taxable_component_keys").$type<string[]>().notNull().default([]),
  insurableComponentKeys: jsonb("insurable_component_keys").$type<string[]>().notNull().default([]),
  employeeInsurancePercent: integer("employee_insurance_percent").notNull().default(7),
  employerInsurancePercent: integer("employer_insurance_percent").notNull().default(20),
  unemploymentInsurancePercent: integer("unemployment_insurance_percent").notNull().default(3),
  overtimePercent: integer("overtime_percent").notNull().default(40),
  fridayPremiumPercent: integer("friday_premium_percent").notNull().default(40),
  holidayPremiumPercent: integer("holiday_premium_percent").notNull().default(0),
  nightPremiumPercent: integer("night_premium_percent").notNull().default(35),
  standardMonthlyHours: integer("standard_monthly_hours").notNull().default(220),
  minimumInsuredHistoryDaysForChildAllowance: integer("minimum_insured_history_days_for_child_allowance").notNull().default(720),
  annualLeaveDays: integer("annual_leave_days").notNull().default(26),
  legalSourceNote: text("legal_source_note").notNull().default(""),
  updatedBy: integer("updated_by").references(() => admins.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const hotelPayrollAdjustments = pgTable("hotel_payroll_adjustments", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => hotelStaff.id, { onDelete: "cascade" }),
  jalaliYear: integer("jalali_year").notNull(),
  jalaliMonth: integer("jalali_month").notNull(),
  kind: text("kind").$type<"reward" | "penalty">().notNull(),
  amountToman: bigint("amount_toman", { mode: "number" }).notNull(),
  description: text("description").notNull(),
  legalBasis: text("legal_basis").notNull().default(""),
  taxable: boolean("taxable").notNull().default(true),
  insurable: boolean("insurable").notNull().default(true),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("pending"),
  createdBy: integer("created_by").references(() => admins.id, { onDelete: "set null" }),
  approvedBy: integer("approved_by").references(() => admins.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("hotel_payroll_adjustments_period_idx").on(t.jalaliYear, t.jalaliMonth, t.staffId)]);

export const hotelPayrollLeaves = pgTable("hotel_payroll_leaves", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => hotelStaff.id, { onDelete: "cascade" }),
  jalaliYear: integer("jalali_year").notNull(),
  jalaliMonth: integer("jalali_month").notNull(),
  kind: text("kind").$type<"annual" | "sick" | "unpaid" | "other">().notNull(),
  hours: doublePrecision("hours").notNull(),
  note: text("note").notNull().default(""),
  status: text("status").$type<"pending" | "approved" | "rejected">().notNull().default("approved"),
  createdBy: integer("created_by").references(() => admins.id, { onDelete: "set null" }),
  decidedBy: integer("decided_by").references(() => admins.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("hotel_payroll_leaves_period_idx").on(t.jalaliYear, t.jalaliMonth, t.staffId)]);

export const hotelTasks = pgTable("hotel_tasks", {
  id: serial("id").primaryKey(),
  taskType: text("task_type").$type<"reservation" | "checkin" | "housekeeping" | "guest_request" | "maintenance" | "manual">().notNull(),
  duty: text("duty").$type<StaffDuty>(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  workDate: date("work_date").notNull(),
  priority: text("priority").$type<"low" | "normal" | "high" | "urgent">().notNull().default("normal"),
  status: text("status").$type<HotelTaskStatus>().notNull().default("open"),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "set null" }),
  reservationId: integer("reservation_id").references(() => reservations.id, { onDelete: "set null" }),
  assignmentId: integer("assignment_id").references(() => hotelShiftAssignments.id, { onDelete: "set null" }),
  assignedStaffId: integer("assigned_staff_id").references(() => hotelStaff.id, { onDelete: "set null" }),
  sourceKey: text("source_key").unique(),
  smsStatus: text("sms_status").notNull().default(""),
  smsSentAt: timestamp("sms_sent_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("hotel_tasks_status_date_idx").on(t.status, t.workDate), index("hotel_tasks_room_status_idx").on(t.roomId, t.status)]);

/* ---------- double-entry accounting ---------- */
export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  level: integer("level").notNull(), // 1 = کل، 2 = معین، 3 = تفصیلی
  parentId: integer("parent_id"),
  type: text("type").$type<AccountType>().notNull(),
  isSystem: boolean("is_system").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
});

export const costCenters = pgTable("cost_centers", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const journalEntries = pgTable(
  "journal_entries",
  {
    id: serial("id").primaryKey(),
    date: date("date").notNull(),
    description: text("description").notNull().default(""),
    source: text("source").notNull().default("manual"), // manual | income | expense | reservation
    sourceType: text("source_type").notNull().default(""), // deposit | revenue | refund | settlement
    reservationId: integer("reservation_id"),
    createdBy: text("created_by").notNull().default(""),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("je_date_idx").on(t.date), index("je_res_idx").on(t.reservationId)],
);

export const journalLines = pgTable(
  "journal_lines",
  {
    id: serial("id").primaryKey(),
    entryId: integer("entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    accountId: integer("account_id")
      .notNull()
      .references(() => accounts.id),
    costCenterId: integer("cost_center_id").references(() => costCenters.id, { onDelete: "set null" }),
    debit: bigint("debit", { mode: "number" }).notNull().default(0),
    credit: bigint("credit", { mode: "number" }).notNull().default(0),
    description: text("description").notNull().default(""),
  },
  (t) => [index("jl_entry_idx").on(t.entryId), index("jl_account_idx").on(t.accountId), index("jl_cost_center_idx").on(t.costCenterId)],
);

export type Account = typeof accounts.$inferSelect;

/* ---------- dining: restaurants, cafés, bars ---------- */
export type VenueKind = "restaurant" | "cafe" | "coffee_shop" | "bar" | "rooftop" | "breakfast";

export const diningVenues = pgTable("dining_venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  kind: text("kind").$type<VenueKind>().notNull().default("restaurant"),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  cuisine: text("cuisine").notNull().default(""),
  hours: jsonb("hours").$type<{ label: string; time: string }[]>().notNull().default([]),
  images: jsonb("images").$type<string[]>().notNull().default([]),
  videoUrl: text("video_url").notNull().default(""),
  capacity: integer("capacity").notNull().default(0),
  priceLevel: integer("price_level").notNull().default(2), // 1..4
  phone: text("phone").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  openToPublic: boolean("open_to_public").notNull().default(true),
  showMenu: boolean("show_menu").notNull().default(true),
  bookingEnabled: boolean("booking_enabled").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const menuItems = pgTable(
  "menu_items",
  {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => diningVenues.id, { onDelete: "cascade" }),
    category: text("category").notNull().default("سایر"),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    price: integer("price").notNull().default(0),
    image: text("image").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    isAvailable: boolean("is_available").notNull().default(true),
    isSignature: boolean("is_signature").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("menu_venue_idx").on(t.venueId)],
);

export type DiningVenue = typeof diningVenues.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;

export type Room = typeof rooms.$inferSelect;
export type Service = typeof services.$inferSelect;
export type Amenity = typeof amenities.$inferSelect;
export type Attraction = typeof attractions.$inferSelect;
export type Reservation = typeof reservations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Testimonial = typeof testimonials.$inferSelect;

/* ---------- promotions / special offers ---------- */
export const promotions = pgTable("promotions", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  title: text("title").notNull().default(""),
  description: text("description").notNull().default(""),
  image: text("image").notNull().default(""),
  kind: text("kind").$type<"percent" | "fixed">().notNull().default("percent"),
  value: integer("value").notNull().default(0),
  maxDiscount: integer("max_discount").notNull().default(0),
  minNights: integer("min_nights").notNull().default(1),
  appliesTo: text("applies_to").$type<"all" | "rooms" | "services">().notNull().default("all"),
  roomIds: jsonb("room_ids").$type<number[]>().notNull().default([]),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  maxUses: integer("max_uses").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- FAQ ---------- */
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull().default(""),
  category: text("category").notNull().default("عمومی"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ---------- photo gallery ---------- */
export const galleryItems = pgTable("gallery_items", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  caption: text("caption").notNull().default(""),
  category: text("category").notNull().default("هتل"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Promotion = typeof promotions.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type GalleryItem = typeof galleryItems.$inferSelect;

/* ================= customer club / CRM ================= */
export type CustomerTier = "bronze" | "silver" | "gold" | "platinum";

export const customers = pgTable(
  "customers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull().default(""),
    phone: text("phone").notNull().unique(),
    email: text("email").notNull().default(""),
    nationalId: text("national_id").notNull().default(""),
    birthDate: date("birth_date"),
    gender: text("gender").notNull().default(""),
    city: text("city").notNull().default(""),
    tier: text("tier").$type<CustomerTier>().notNull().default("bronze"),
    points: integer("points").notNull().default(0),
    totalSpent: bigint("total_spent", { mode: "number" }).notNull().default(0),
    staysCount: integer("stays_count").notNull().default(0),
    lastStayAt: date("last_stay_at"),
    source: text("source").notNull().default("website"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    notes: text("notes").notNull().default(""),
    smsOptIn: boolean("sms_opt_in").notNull().default(true),
    birthdaySentYear: integer("birthday_sent_year").notNull().default(0),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("customers_tier_idx").on(t.tier)],
);

export type SegmentRules = {
  tiers?: CustomerTier[];
  minStays?: number;
  minSpent?: number;
  birthdayMonth?: number; // jalali month 1..12
  lastStayWithinDays?: number;
  lastStayBeforeDays?: number;
  city?: string;
  source?: string;
  tag?: string;
};

export const customerGroups = pgTable("customer_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  color: text("color").notNull().default("primary"),
  kind: text("kind").$type<"static" | "dynamic">().notNull().default("static"),
  rules: jsonb("rules").$type<SegmentRules>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const customerGroupMembers = pgTable(
  "customer_group_members",
  {
    groupId: integer("group_id")
      .notNull()
      .references(() => customerGroups.id, { onDelete: "cascade" }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.customerId] })],
);

export type CampaignAudience = { all?: boolean; groupIds?: number[]; tiers?: CustomerTier[] };

export const campaigns = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  audience: jsonb("audience").$type<CampaignAudience>().notNull().default({}),
  message: text("message").notNull().default(""),
  promoMode: text("promo_mode").$type<"none" | "shared" | "unique">().notNull().default("none"),
  promoCode: text("promo_code").notNull().default(""),
  promoKind: text("promo_kind").$type<"percent" | "fixed">().notNull().default("percent"),
  promoValue: integer("promo_value").notNull().default(0),
  promoValidDays: integer("promo_valid_days").notNull().default(30),
  scheduledAt: timestamp("scheduled_at"),
  status: text("status").$type<"draft" | "scheduled" | "sending" | "sent" | "failed">().notNull().default("draft"),
  recipients: integer("recipients").notNull().default(0),
  sent: integer("sent").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  sentAt: timestamp("sent_at"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const smsTemplates = pgTable("sms_templates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ================= gift cards ================= */
export type GiftCardStatus = "pending_payment" | "active" | "used" | "void";

export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  initialAmount: integer("initial_amount").notNull(),
  balance: integer("balance").notNull().default(0),
  purchaserName: text("purchaser_name").notNull().default(""),
  purchaserPhone: text("purchaser_phone").notNull().default(""),
  recipientName: text("recipient_name").notNull().default(""),
  recipientPhone: text("recipient_phone").notNull().default(""),
  message: text("message").notNull().default(""),
  status: text("status").$type<GiftCardStatus>().notNull().default("pending_payment"),
  paymentMethod: text("payment_method").notNull().default(""),
  paymentRef: text("payment_ref").notNull().default(""),
  paidAt: timestamp("paid_at"),
  expiresAt: date("expires_at"),
  issuedBy: text("issued_by").notNull().default("online"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const giftCardTx = pgTable("gift_card_tx", {
  id: serial("id").primaryKey(),
  giftCardId: integer("gift_card_id")
    .notNull()
    .references(() => giftCards.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(),
  reservationId: integer("reservation_id"),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PaymentGatewayId = "zarinpal" | "zibal" | "saman" | "mellat";
export type PaymentCallbackData = {
  refNum?: string;
  terminalId?: string;
  amount?: number;
  saleOrderId?: number;
  saleReferenceId?: number;
};

export const paymentTransactions = pgTable("payment_transactions", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id").references(() => reservations.id, { onDelete: "restrict" }),
  giftCardId: integer("gift_card_id").references(() => giftCards.id, { onDelete: "restrict" }),
  provider: text("provider").$type<PaymentGatewayId>().notNull(),
  amount: integer("amount").notNull(),
  authority: text("authority"),
  callbackTokenHash: text("callback_token_hash").notNull(),
  callbackData: jsonb("callback_data").$type<PaymentCallbackData>().notNull().default({}),
  status: text("status").notNull().default("creating"),
  refCode: text("ref_code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
}, (t) => [
  index("payment_transactions_reservation_idx").on(t.reservationId, t.createdAt),
  index("payment_transactions_giftcard_idx").on(t.giftCardId, t.createdAt),
  unique("payment_transactions_provider_authority_unique").on(t.provider, t.authority),
  check("payment_transactions_one_owner_check", sql`(${t.reservationId} IS NOT NULL)::int + (${t.giftCardId} IS NOT NULL)::int = 1`),
  check("payment_transactions_positive_amount_check", sql`${t.amount} > 0`),
]);

/* ================= restaurant / café table bookings ================= */
export const tableBookings = pgTable(
  "table_bookings",
  {
    id: serial("id").primaryKey(),
    venueId: integer("venue_id")
      .notNull()
      .references(() => diningVenues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    date: date("date").notNull(),
    time: text("time").notNull(),
    guests: integer("guests").notNull().default(2),
    notes: text("notes").notNull().default(""),
    status: text("status").$type<"new" | "confirmed" | "seated" | "cancelled" | "no_show">().notNull().default("new"),
    source: text("source").notNull().default("website"),
    isDemo: boolean("is_demo").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("tb_date_idx").on(t.date)],
);

/* ================= in-house guest requests ================= */
export const guestRequests = pgTable("guest_requests", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  category: text("category").notNull().default("other"),
  status: text("status").$type<"open" | "in_progress" | "done">().notNull().default("open"),
  unreadStaff: boolean("unread_staff").notNull().default(true),
  unreadGuest: boolean("unread_guest").notNull().default(false),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const guestRequestMessages = pgTable("guest_request_messages", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id")
    .notNull()
    .references(() => guestRequests.id, { onDelete: "cascade" }),
  sender: text("sender").$type<"guest" | "staff">().notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ================= companions / guest list ================= */
export const reservationGuests = pgTable("reservation_guests", {
  id: serial("id").primaryKey(),
  reservationId: integer("reservation_id")
    .notNull()
    .references(() => reservations.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  idNumber: text("id_number").notNull().default(""),
  nationality: text("nationality").notNull().default("ایرانی"),
  phone: text("phone").notNull().default(""),
  relation: text("relation").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/* ================= partners (agencies / partner websites) & API ================= */
export const partners = pgTable("partners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").$type<"agency" | "site">().notNull().default("agency"),
  contactName: text("contact_name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  tokenHash: text("token_hash").notNull().default(""),
  tokenHint: text("token_hint").notNull().default(""),
  secret: text("secret").notNull().default(""),
  commissionPercent: integer("commission_percent").notNull().default(0),
  autoConfirm: boolean("auto_confirm").notNull().default(true),
  canCancel: boolean("can_cancel").notNull().default(true),
  allowedIps: text("allowed_ips").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  lastUsedAt: timestamp("last_used_at"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const partnerLogs = pgTable(
  "partner_logs",
  {
    id: serial("id").primaryKey(),
    partnerId: integer("partner_id"),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status").notNull(),
    ip: text("ip").notNull().default(""),
    message: text("message").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("pl_partner_idx").on(t.partnerId)],
);

export type Customer = typeof customers.$inferSelect;
export type CustomerGroup = typeof customerGroups.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type GiftCard = typeof giftCards.$inferSelect;
export type TableBooking = typeof tableBookings.$inferSelect;
export type GuestRequest = typeof guestRequests.$inferSelect;
export type Partner = typeof partners.$inferSelect;
export type StayPackage = typeof stayPackages.$inferSelect;
