"use server";

import { and, eq, gte, lte, ne, or } from "drizzle-orm";
import { isValidJalaaliDate, jalaaliMonthLength, toGregorian } from "jalaali-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { hotelAttendance, hotelAttendanceEvents, hotelLeaveRequests, hotelPayrollAdjustments, hotelPayrollEntries, hotelPayrollLeaves, hotelPayrollPeriods, hotelPayrollPolicies, hotelShiftAssignments, hotelShiftSwapRequests, hotelShiftTemplates, hotelShifts, hotelStaff, hotelTasks, type StaffDuty } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { toEnDigits, todayISO } from "@/lib/utils";
import { calculatePayroll, classifyAttendanceInterval, defaultPayrollPolicy, type PayrollMetrics, type PayrollPolicyCore, type PayrollProfileCore } from "@/lib/hotel-payroll-core";
import { staffPayrollPatch } from "@/lib/hotel-payroll-profile";

const duties: StaffDuty[] = ["reception", "housekeeping", "maintenance", "operations"];
const iso = /^\d{4}-\d{2}-\d{2}$/;
const num = (value: FormDataEntryValue | null) => {
  const parsed = Number(toEnDigits(String(value ?? "")).replace(/[,٬]/g, ""));
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
};
const fail = (message: string, page = "/admin/staff"): never => redirect(`${page}?error=${encodeURIComponent(message)}`);
const validDate = (value: string) => {
  if (!iso.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
async function assertPayrollPeriodOpen(dateFrom: string, dateTo = dateFrom) {
  const [period] = await db.select({ id: hotelPayrollPeriods.id, status: hotelPayrollPeriods.status }).from(hotelPayrollPeriods)
    .where(and(ne(hotelPayrollPeriods.status, "draft"), lte(hotelPayrollPeriods.dateFrom, dateTo), gte(hotelPayrollPeriods.dateTo, dateFrom)));
  if (period) fail("این بازه داخل دوره حقوق تأییدشده یا پرداخت‌شده است و سوابق کاری آن قفل شده است.");
}

export async function saveStaff(fd: FormData) {
  const admin = await requireAdmin();
  const id = num(fd.get("id"));
  const fullName = cleanText(fd.get("fullName"), 100);
  const phone = toEnDigits(cleanText(fd.get("phone"), 20)).replace(/[\s-]/g, "");
  const duty = String(fd.get("duty")) as StaffDuty;
  const salaryMode = String(fd.get("salaryMode")) === "fixed" ? "fixed" : "statutory";
  const monthlySalary = Math.min(2_000_000_000, Math.max(0, num(fd.get("monthlySalary"))));
  const hourlyRate = Math.min(2_000_000_000, Math.max(0, num(fd.get("hourlyRate"))));
  if (fullName.length < 2 || !duties.includes(duty)) fail("نام و بخش کاری را درست وارد کنید.");
  if (phone && !/^09\d{9}$/.test(phone)) fail("شماره همراه باید با قالب ۰۹۱۲۱۲۳۴۵۶۷ وارد شود.");
  let profile: Record<string, string | number | boolean | null> = {};
  try {
    profile = staffPayrollPatch(Object.fromEntries([
      ...["nationalId", "birthDate", "fatherName", "maritalStatus", "employmentStartDate", "employmentEndDate", "contractType", "jobCode", "insuranceNumber", "insuredHistoryDays", "childrenCount", "childAllowanceEligible", "monthlyBaseSalaryToman", "fixedAgreedSalaryToman", "managementAllowanceToman", "annualServiceBaseToman", "overtimeEligible", "insuranceEnabled", "incomeTaxEnabled", "includeHousing", "includeFood", "includeMaritalAllowance", "includeChildAllowance", "includeSeniority", "bankAccountName", "bankAccountNumber", "iban"].map((key) => [key, key === "childAllowanceEligible" || key === "overtimeEligible" || key === "insuranceEnabled" || key === "incomeTaxEnabled" || key.startsWith("include") ? fd.get(key) === "on" : fd.get(key)]),
      ["salaryMode", salaryMode], ["jobTitle", cleanText(fd.get("jobTitle"), 100)],
    ]));
  } catch (error) {
    fail(error instanceof Error ? error.message : "اطلاعات قرارداد معتبر نیست.");
  }
  const values = {
    fullName, phone, duty, jobTitle: cleanText(fd.get("jobTitle"), 100), salaryMode,
    monthlySalary: salaryMode === "statutory" ? Math.min(monthlySalary || num(fd.get("monthlyBaseSalaryToman")), 2_000_000_000) : 0,
    hourlyRate: hourlyRate,
    notes: cleanText(fd.get("notes"), 500), isActive: fd.get("isActive") === "on",
    ...profile,
  } as typeof hotelStaff.$inferInsert;
  if (id) await db.update(hotelStaff).set({ ...values, createdBy: undefined, updatedBy: admin.id }).where(eq(hotelStaff.id, id));
  else await db.insert(hotelStaff).values({ ...values, createdBy: admin.id, updatedBy: admin.id });
  revalidatePath("/admin/staff");
  revalidatePath("/admin/operations");
  redirect("/admin/staff");
}

export async function saveShift(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const name = cleanText(fd.get("name"), 60);
  const startTime = String(fd.get("startTime") ?? "");
  const endTime = String(fd.get("endTime") ?? "");
  const breakMinutes = Math.max(0, Math.min(360, Math.trunc(num(fd.get("breakMinutes")))));
  if (!name || !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime) || startTime === endTime) fail("نام شیفت و ساعت شروع و پایان معتبر وارد کنید.");
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const shiftMinutes = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute) + 1440) % 1440;
  if (breakMinutes >= shiftMinutes) fail("زمان استراحت باید کمتر از طول شیفت باشد.");
  const values = { name, startTime, endTime, breakMinutes, isActive: fd.get("isActive") === "on" };
  if (id) {
    const [existing] = await db.select().from(hotelShifts).where(eq(hotelShifts.id, id));
    if (!existing) fail("شیفت پیدا نشد.");
    if (existing.startTime !== startTime || existing.endTime !== endTime || existing.breakMinutes !== breakMinutes) {
      const [assigned] = await db.select({ id: hotelShiftAssignments.id }).from(hotelShiftAssignments).where(eq(hotelShiftAssignments.shiftId, id));
      if (assigned) fail("این شیفت برنامه کاری ثبت‌شده دارد؛ برای ساعت جدید یک شیفت تازه بسازید تا سوابق قبلی دست‌نخورده بماند.");
    }
    await db.update(hotelShifts).set(values).where(eq(hotelShifts.id, id));
  }
  else await db.insert(hotelShifts).values(values);
  revalidatePath("/admin/staff");
  revalidatePath("/admin/operations");
  redirect("/admin/staff");
}

export async function assignShift(fd: FormData) {
  const admin = await requireAdmin();
  const workDate = String(fd.get("workDate") ?? "");
  const staffId = num(fd.get("staffId"));
  const shiftId = num(fd.get("shiftId"));
  const duty = String(fd.get("duty")) as StaffDuty;
  if (!validDate(workDate) || !staffId || !shiftId || !duties.includes(duty)) fail("تاریخ، نیرو، شیفت و مسئولیت را انتخاب کنید.");
  await assertPayrollPeriodOpen(workDate);
  const [[person], [shift]] = await Promise.all([
    db.select({ isActive: hotelStaff.isActive }).from(hotelStaff).where(eq(hotelStaff.id, staffId)),
    db.select().from(hotelShifts).where(eq(hotelShifts.id, shiftId)),
  ]);
  if (!person?.isActive || !shift?.isActive) fail("فقط نیروی فعال و شیفت فعال قابل برنامه‌ریزی است.");
  const existing = await db.select({ assignment: hotelShiftAssignments, shift: hotelShifts }).from(hotelShiftAssignments).innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id)).where(and(eq(hotelShiftAssignments.staffId, staffId), gte(hotelShiftAssignments.workDate, addDays(workDate, -1)), lte(hotelShiftAssignments.workDate, addDays(workDate, 1)), ne(hotelShiftAssignments.status, "cancelled")));
  if (existing.some((row) => row.assignment.workDate !== workDate || row.assignment.shiftId !== shiftId ? shiftConflict(workDate, shift, row.assignment.workDate, row.shift) : false)) fail("این نیرو در بازه زمانی هم‌پوشان شیفت دیگری دارد.");
  const [leave] = await db.select({ id: hotelLeaveRequests.id }).from(hotelLeaveRequests).where(and(eq(hotelLeaveRequests.staffId, staffId), eq(hotelLeaveRequests.status, "approved"), lte(hotelLeaveRequests.startsAt, new Date(`${workDate}T23:59:59`)), gte(hotelLeaveRequests.endsAt, new Date(`${workDate}T00:00:00`))));
  if (leave) fail("این نیرو در تاریخ انتخاب‌شده مرخصی تأییدشده دارد.");
  const values = { workDate, staffId, shiftId, duty, isLead: fd.get("isLead") === "on", notes: cleanText(fd.get("notes"), 300), createdBy: admin.id, updatedBy: admin.id, updatedAt: new Date() };
  if (values.isLead) {
    await db.update(hotelShiftAssignments).set({ isLead: false }).where(and(eq(hotelShiftAssignments.workDate, workDate), eq(hotelShiftAssignments.shiftId, shiftId), eq(hotelShiftAssignments.duty, duty), eq(hotelShiftAssignments.isLead, true)));
  }
  await db.insert(hotelShiftAssignments).values(values).onConflictDoUpdate({
    target: [hotelShiftAssignments.workDate, hotelShiftAssignments.shiftId, hotelShiftAssignments.staffId],
    set: { duty, isLead: values.isLead, notes: values.notes, status: "scheduled", updatedBy: admin.id, updatedAt: new Date(), version: 1 },
  });
  revalidatePath("/admin/staff");
  revalidatePath("/admin/operations");
  redirect(`/admin/staff?day=${workDate}`);
}

export async function removeShiftAssignment(fd: FormData) {
  const admin = await requireAdmin();
  const id = num(fd.get("id"));
  const workDate = String(fd.get("workDate") ?? todayISO());
  if (!id) fail("برنامه شیفت معتبر نیست.");
  await assertPayrollPeriodOpen(workDate);
  const [current] = await db.select({ version: hotelShiftAssignments.version }).from(hotelShiftAssignments).where(eq(hotelShiftAssignments.id, id));
  if (!current) fail("برنامه شیفت پیدا نشد.");
  await db.update(hotelShiftAssignments).set({ status: "cancelled", updatedBy: admin.id, updatedAt: new Date(), version: current.version + 1 }).where(eq(hotelShiftAssignments.id, id));
  revalidatePath("/admin/staff");
  revalidatePath("/admin/operations");
  redirect(`/admin/staff?day=${workDate}`);
}

export async function setAttendanceStatus(fd: FormData) {
  const admin = await requireAdmin();
  const assignmentId = num(fd.get("assignmentId"));
  const status = String(fd.get("status"));
  if (!assignmentId || !["scheduled", "present", "late", "absent", "leave"].includes(status)) fail("وضعیت حضور معتبر نیست.");
  const [assignment] = await db.select({ id: hotelShiftAssignments.id, status: hotelShiftAssignments.status, workDate: hotelShiftAssignments.workDate }).from(hotelShiftAssignments).where(eq(hotelShiftAssignments.id, assignmentId));
  if (!assignment) fail("برنامهٔ شیفت پیدا نشد.");
  if (assignment.status === "cancelled") fail("برنامه لغو شده و امکان ثبت حضور ندارد.");
  await assertPayrollPeriodOpen(assignment.workDate);
  const [old] = await db.select().from(hotelAttendance).where(eq(hotelAttendance.assignmentId, assignmentId));
  const now = new Date();
  const [updated] = await db.insert(hotelAttendance).values({ assignmentId, status: status as "scheduled" | "present" | "late" | "absent" | "leave", updatedBy: admin.id, note: cleanText(fd.get("reason"), 300), updatedAt: now }).onConflictDoUpdate({ target: hotelAttendance.assignmentId, set: { status: status as "scheduled" | "present" | "late" | "absent" | "leave", updatedBy: admin.id, note: cleanText(fd.get("reason"), 300), updatedAt: now } }).returning();
  if (updated && old?.status !== updated.status) await db.insert(hotelAttendanceEvents).values({ recordId: updated.id, action: "status_change", previousAt: null, occurredAt: now, reason: `${old?.status ?? "new"} → ${updated.status}: ${cleanText(fd.get("reason"), 300)}`, recordedBy: admin.id });
  revalidatePath("/admin/staff");
  redirect(`/admin/staff?day=${String(fd.get("workDate") ?? todayISO())}`);
}

export async function punchAttendance(fd: FormData) {
  const admin = await requireAdmin();
  const assignmentId = num(fd.get("assignmentId"));
  const mode = String(fd.get("mode"));
  if (!assignmentId || (mode !== "in" && mode !== "out")) fail("ثبت ورود یا خروج معتبر نیست.");
  const [assignmentExists] = await db.select({ id: hotelShiftAssignments.id, status: hotelShiftAssignments.status, workDate: hotelShiftAssignments.workDate }).from(hotelShiftAssignments).where(eq(hotelShiftAssignments.id, assignmentId));
  if (!assignmentExists) fail("برنامهٔ شیفت پیدا نشد.");
  if (assignmentExists.status === "cancelled") fail("برنامه لغو شده و امکان ثبت حضور ندارد.");
  await assertPayrollPeriodOpen(assignmentExists.workDate);
  const [row] = await db.select().from(hotelAttendance).where(eq(hotelAttendance.assignmentId, assignmentId));
  const now = new Date();
  if (mode === "in") {
    if (row?.clockInAt) fail("ورود این شیفت قبلاً ثبت شده است.");
    let recordId: number;
    if (row) {
      await db.update(hotelAttendance).set({ status: "present", checkInBy: admin.id, updatedBy: admin.id, clockInAt: row.clockInAt ?? now, updatedAt: now }).where(eq(hotelAttendance.id, row.id));
      recordId = row.id;
    } else {
      const [created] = await db.insert(hotelAttendance).values({ assignmentId, status: "present", checkInBy: admin.id, updatedBy: admin.id, clockInAt: now, updatedAt: now }).returning({ id: hotelAttendance.id });
      recordId = created.id;
    }
    await db.insert(hotelAttendanceEvents).values({ recordId, action: "check_in", previousAt: row?.clockInAt ?? null, occurredAt: now, reason: cleanText(fd.get("reason"), 300), recordedBy: admin.id });
  } else if (mode === "out" && row?.clockInAt && !row.clockOutAt) {
    const [assignment] = await db.select({ shift: hotelShifts }).from(hotelShiftAssignments).innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id)).where(eq(hotelShiftAssignments.id, assignmentId));
    let scheduled = 0;
    let breakMinutes = 0;
    if (assignment) {
      const [sh, sm] = assignment.shift.startTime.split(":").map(Number);
      const [eh, em] = assignment.shift.endTime.split(":").map(Number);
      breakMinutes = assignment.shift.breakMinutes;
      scheduled = ((eh * 60 + em) - (sh * 60 + sm) + 1440) % 1440 - breakMinutes;
    }
    const elapsedMinutes = Math.max(0, Math.min(24 * 60, Math.floor((now.getTime() - row.clockInAt.getTime()) / 60_000)));
    const workedMinutes = Math.max(0, elapsedMinutes - breakMinutes);
    await db.update(hotelAttendance).set({ clockOutAt: now, checkOutBy: admin.id, updatedBy: admin.id, workedMinutes, overtimeMinutes: Math.max(0, workedMinutes - scheduled), updatedAt: now }).where(eq(hotelAttendance.id, row.id));
    await db.insert(hotelAttendanceEvents).values({ recordId: row.id, action: "check_out", previousAt: row.clockOutAt ?? null, occurredAt: now, reason: cleanText(fd.get("reason"), 300), recordedBy: admin.id });
  }
  revalidatePath("/admin/staff");
  redirect(`/admin/staff?day=${String(fd.get("workDate") ?? todayISO())}`);
}

export async function updatePayrollEntry(fd: FormData) {
  const admin = await requireAdmin();
  const id = num(fd.get("id"));
  const [entry] = await db.select().from(hotelPayrollEntries).where(eq(hotelPayrollEntries.id, id));
  if (!entry) fail("ردیف حقوق پیدا نشد.");
  const [period] = await db.select().from(hotelPayrollPeriods).where(eq(hotelPayrollPeriods.id, entry.periodId));
  if (!period || period.status !== "draft") fail("محاسبه فقط تا پیش از تایید دوره قابل اصلاح است.");
  const netToman = Math.min(1_000_000_000_000, Math.max(0, num(fd.get("netToman"))));
  const reason = cleanText(fd.get("correctionReason"), 300);
  if (!reason) fail("دلیل اصلاح مبلغ خالص حقوق را ثبت کنید.");
  const paymentRef = cleanText(fd.get("paymentRef"), 100);
  const oldNotes = entry.notes ? entry.notes + "\n" : "";
  await db.update(hotelPayrollEntries).set({ netPay: Math.min(2_147_483_647, netToman), netToman, paymentRef, notes: `${oldNotes}اصلاح دستی خالص توسط مدیر ${admin.id}: ${reason}` }).where(eq(hotelPayrollEntries.id, id));
  revalidatePath("/admin/staff");
  redirect("/admin/staff#payroll");
}

export async function markPayrollPaid(fd: FormData) {
  const admin = await requireAdmin();
  const id = num(fd.get("id"));
  const [entry] = await db.select().from(hotelPayrollEntries).where(eq(hotelPayrollEntries.id, id));
  if (!entry) fail("ردیف حقوق پیدا نشد.");
  if (entry.paymentStatus === "paid") fail("این ردیف حقوق قبلاً پرداخت شده است.");
  const [period] = await db.select().from(hotelPayrollPeriods).where(eq(hotelPayrollPeriods.id, entry.periodId));
  if (!period || period.status === "draft") fail("ابتدا دوره حقوق را تایید کنید.");
  await db.update(hotelPayrollEntries).set({ paymentStatus: "paid", paidAt: new Date(), paidBy: admin.id, paymentRef: cleanText(fd.get("paymentRef"), 100) }).where(eq(hotelPayrollEntries.id, id));
  const unpaid = await db.select({ id: hotelPayrollEntries.id }).from(hotelPayrollEntries).where(and(eq(hotelPayrollEntries.periodId, entry.periodId), eq(hotelPayrollEntries.paymentStatus, "unpaid")));
  if (!unpaid.length) await db.update(hotelPayrollPeriods).set({ status: "paid" }).where(eq(hotelPayrollPeriods.id, entry.periodId));
  revalidatePath("/admin/staff");
  redirect("/admin/staff#payroll");
}

export async function approvePayrollPeriod(fd: FormData) {
  const admin = await requireAdmin();
  const id = num(fd.get("id"));
  const [period] = await db.select().from(hotelPayrollPeriods).where(eq(hotelPayrollPeriods.id, id));
  if (!period || period.status !== "draft") fail("دوره پیش‌نویس برای تایید پیدا نشد.");
  const [entry] = await db.select({ id: hotelPayrollEntries.id }).from(hotelPayrollEntries).where(eq(hotelPayrollEntries.periodId, id));
  if (!entry) fail("این دوره ردیف حقوق ندارد و قابل تأیید نیست.");
  await db.update(hotelPayrollPeriods).set({ status: "approved", approvedBy: admin.id, approvedAt: new Date(), approvalNote: cleanText(fd.get("note"), 300) }).where(eq(hotelPayrollPeriods.id, id));
  revalidatePath("/admin/staff");
  redirect("/admin/staff#payroll");
}

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};
const clockMinutes = (time: string) => { const parts = time.split(":").map(Number); return parts[0] * 60 + parts[1]; };
const shiftLength = (shift: { startTime: string; endTime: string; breakMinutes: number }) => Math.max(0, (clockMinutes(shift.endTime) - clockMinutes(shift.startTime) + 1440) % 1440 - shift.breakMinutes);
function shiftConflict(candidateDate: string, candidate: { startTime: string; endTime: string }, otherDate: string, other: { startTime: string; endTime: string }) {
  const dayDelta = Math.round((Date.parse(`${otherDate}T00:00:00Z`) - Date.parse(`${candidateDate}T00:00:00Z`)) / 86_400_000);
  const firstStart = clockMinutes(candidate.startTime);
  const firstEnd = firstStart + (clockMinutes(candidate.endTime) - firstStart + 1440) % 1440;
  const secondStart = dayDelta * 1440 + clockMinutes(other.startTime);
  const secondEnd = secondStart + (clockMinutes(other.endTime) - clockMinutes(other.startTime) + 1440) % 1440;
  return firstStart < secondEnd && secondStart < firstEnd;
}

export async function saveShiftTemplate(fd: FormData) {
  const admin = await requireAdmin();
  const staffId = num(fd.get("staffId")); const shiftId = num(fd.get("shiftId"));
  const duty = String(fd.get("duty")) as StaffDuty;
  const weekdays = [...new Set(fd.getAll("weekdays").map(String).map((v) => num(v)))].filter((v) => v >= 0 && v <= 6).sort((a, b) => a - b);
  const name = cleanText(fd.get("name"), 80);
  if (!staffId || !shiftId || !duties.includes(duty) || !weekdays.length || !name) fail("نیرو، شیفت، مسئولیت و دست‌کم یک روز هفته را تعیین کنید.");
  const [person] = await db.select({ active: hotelStaff.isActive }).from(hotelStaff).where(eq(hotelStaff.id, staffId));
  const [shift] = await db.select({ active: hotelShifts.isActive }).from(hotelShifts).where(eq(hotelShifts.id, shiftId));
  if (!person?.active || !shift?.active) fail("برای الگوی تکرارشونده فقط نیروی فعال و شیفت فعال قابل انتخاب است.");
  await db.insert(hotelShiftTemplates).values({ staffId, shiftId, duty, weekdays: weekdays.join(","), name, isLead: fd.get("isLead") === "on", location: cleanText(fd.get("location"), 100), createdBy: admin.id }).onConflictDoNothing();
  revalidatePath("/admin/staff");
  redirect("/admin/staff#templates");
}

export async function toggleShiftTemplate(fd: FormData) {
  await requireAdmin(); const id = num(fd.get("id"));
  const [template] = await db.select({ active: hotelShiftTemplates.isActive }).from(hotelShiftTemplates).where(eq(hotelShiftTemplates.id, id));
  if (!template) fail("الگوی شیفت پیدا نشد.");
  await db.update(hotelShiftTemplates).set({ isActive: !template.active }).where(eq(hotelShiftTemplates.id, id));
  revalidatePath("/admin/staff"); redirect("/admin/staff#templates");
}

export async function applyShiftTemplate(fd: FormData) {
  const admin = await requireAdmin();
  const templateId = num(fd.get("templateId")); const dateFrom = String(fd.get("dateFrom") ?? ""); const dateTo = String(fd.get("dateTo") ?? "");
  if (!templateId || !validDate(dateFrom) || !validDate(dateTo) || dateTo < dateFrom) fail("الگوی شیفت و بازه تاریخ را بررسی کنید.");
  const days = (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000 + 1;
  if (days > 62) fail("اعمال الگوی شیفت در هر نوبت حداکثر برای ۶۲ روز ممکن است.");
  await assertPayrollPeriodOpen(dateFrom, dateTo);
  const [template] = await db.select({ template: hotelShiftTemplates, shift: hotelShifts, person: hotelStaff }).from(hotelShiftTemplates).innerJoin(hotelShifts, eq(hotelShiftTemplates.shiftId, hotelShifts.id)).innerJoin(hotelStaff, eq(hotelShiftTemplates.staffId, hotelStaff.id)).where(and(eq(hotelShiftTemplates.id, templateId), eq(hotelShiftTemplates.isActive, true)));
  if (!template || !template.person.isActive || !template.shift.isActive) fail("الگوی انتخاب‌شده فعال نیست.");
  const weekdays = new Set(template.template.weekdays.split(",").map(Number));
  const candidates: string[] = [];
  for (let d = 0; d < days; d++) {
    const date = addDays(dateFrom, d); const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 1) % 7;
    if (weekdays.has(weekday)) candidates.push(date);
  }
  if (!candidates.length) fail("روزهای انتخاب‌شده با این الگو هم‌پوشانی ندارند.");
  await db.transaction(async (tx) => {
    const assignments = await tx.select({ assignment: hotelShiftAssignments, shift: hotelShifts }).from(hotelShiftAssignments).innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id)).where(and(eq(hotelShiftAssignments.staffId, template.person.id), gte(hotelShiftAssignments.workDate, addDays(dateFrom, -1)), lte(hotelShiftAssignments.workDate, addDays(dateTo, 1))));
    const leaves = await tx.select().from(hotelLeaveRequests).where(and(eq(hotelLeaveRequests.staffId, template.person.id), eq(hotelLeaveRequests.status, "approved"), lte(hotelLeaveRequests.startsAt, new Date(`${dateTo}T23:59:59`)), gte(hotelLeaveRequests.endsAt, new Date(`${dateFrom}T00:00:00`))));
    for (const date of candidates) {
      if (leaves.some((leave) => date >= leave.startsAt.toISOString().slice(0, 10) && date <= leave.endsAt.toISOString().slice(0, 10))) throw new Error("این الگو در روز مرخصی تاییدشده نیرو قابل اعمال نیست: " + date);
      const same = assignments.find((item) => item.assignment.workDate === date && item.assignment.shiftId === template.shift.id);
      if (same) {
        if (same.assignment.status === "cancelled") await tx.update(hotelShiftAssignments).set({ status: "scheduled", templateId, duty: template.template.duty, isLead: template.template.isLead, notes: template.template.location, updatedBy: admin.id, updatedAt: new Date(), version: same.assignment.version + 1 }).where(eq(hotelShiftAssignments.id, same.assignment.id));
        continue;
      }
      const conflict = assignments.find((item) => item.assignment.status !== "cancelled" && shiftConflict(date, template.shift, item.assignment.workDate, item.shift));
      if (conflict) throw new Error("شیفت الگو با برنامه موجود هم‌پوشانی دارد: " + date);
      await tx.insert(hotelShiftAssignments).values({ workDate: date, shiftId: template.shift.id, templateId, staffId: template.person.id, duty: template.template.duty, isLead: template.template.isLead, notes: template.template.location, createdBy: admin.id, updatedBy: admin.id }).onConflictDoNothing();
    }
  }).catch((error) => fail(error instanceof Error ? error.message : "اعمال الگو ناموفق بود."));
  revalidatePath("/admin/staff"); revalidatePath("/admin/operations");
  redirect(`/admin/staff?day=${dateFrom}#schedule`);
}

export async function createLeaveRequest(fd: FormData) {
  const admin = await requireAdmin();
  const staffId = num(fd.get("staffId")); const dateFrom = String(fd.get("dateFrom") ?? ""); const dateTo = String(fd.get("dateTo") ?? "");
  const kind = String(fd.get("kind")); const allowed = ["annual", "sick", "unpaid", "personal", "other"];
  if (!staffId || !validDate(dateFrom) || !validDate(dateTo) || dateTo < dateFrom || !allowed.includes(kind)) fail("مشخصات درخواست مرخصی معتبر نیست.");
  const [staff] = await db.select({ active: hotelStaff.isActive }).from(hotelStaff).where(eq(hotelStaff.id, staffId));
  if (!staff) fail("کارمند پیدا نشد.");
  const startTime = String(fd.get("startTime") || "00:00"); const endTime = String(fd.get("endTime") || "23:59");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(endTime)) fail("ساعت شروع و پایان معتبر نیست.");
  const startsAt = new Date(`${dateFrom}T${startTime}:00Z`); const endsAt = new Date(`${dateTo}T${endTime}:00Z`);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt) fail("زمان پایان مرخصی باید بعد از زمان شروع باشد.");
  await assertPayrollPeriodOpen(dateFrom, dateTo);
  const [overlap] = await db.select({ id: hotelLeaveRequests.id }).from(hotelLeaveRequests).where(and(eq(hotelLeaveRequests.staffId, staffId), ne(hotelLeaveRequests.status, "rejected"), lte(hotelLeaveRequests.startsAt, endsAt), gte(hotelLeaveRequests.endsAt, startsAt)));
  if (overlap) fail("این بازه با درخواست مرخصی دیگری هم‌پوشانی دارد.");
  const reason = cleanText(fd.get("reason"), 300);
  await db.insert(hotelLeaveRequests).values({ staffId, startsAt, endsAt, kind: kind as "annual" | "sick" | "unpaid" | "personal" | "other", reason, createdBy: admin.id });
  revalidatePath("/admin/staff"); redirect("/admin/staff#leave");
}

export async function decideLeaveRequest(fd: FormData) {
  const admin = await requireAdmin(); const id = num(fd.get("id")); const status = String(fd.get("status"));
  if (!id || !["approved", "rejected"].includes(status)) fail("تصمیم مرخصی معتبر نیست.");
  const [request] = await db.select().from(hotelLeaveRequests).where(eq(hotelLeaveRequests.id, id));
  if (!request || request.status !== "pending") fail("درخواست مرخصی در انتظار بررسی پیدا نشد.");
  if (status === "approved") {
    await assertPayrollPeriodOpen(request.startsAt.toISOString().slice(0, 10), request.endsAt.toISOString().slice(0, 10));
    const [overlap] = await db.select({ id: hotelLeaveRequests.id }).from(hotelLeaveRequests).where(and(eq(hotelLeaveRequests.staffId, request.staffId), eq(hotelLeaveRequests.status, "approved"), ne(hotelLeaveRequests.id, id), lte(hotelLeaveRequests.startsAt, request.endsAt), gte(hotelLeaveRequests.endsAt, request.startsAt)));
    if (overlap) fail("این بازه با مرخصی تأییدشده دیگری هم‌پوشانی دارد.");
  }
  const decisionTime = new Date();
  await db.transaction(async (tx) => {
    await tx.update(hotelLeaveRequests).set({ status: status as "approved" | "rejected", decisionNote: cleanText(fd.get("note"), 300), decidedBy: admin.id, decidedAt: decisionTime }).where(eq(hotelLeaveRequests.id, id));
    if (status !== "approved") return;
    const fromDay = request.startsAt.toISOString().slice(0, 10); const toDay = request.endsAt.toISOString().slice(0, 10);
    const assignments = await tx.select({ assignment: hotelShiftAssignments, shift: hotelShifts }).from(hotelShiftAssignments)
      .innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id))
      .where(and(eq(hotelShiftAssignments.staffId, request.staffId), gte(hotelShiftAssignments.workDate, fromDay), lte(hotelShiftAssignments.workDate, toDay), ne(hotelShiftAssignments.status, "cancelled")));
    for (const { assignment, shift } of assignments) {
      const start = new Date(`${assignment.workDate}T${shift.startTime}:00Z`); const end = new Date(`${assignment.workDate}T${shift.endTime}:00Z`);
      if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
      if (Math.min(end.getTime(), request.endsAt.getTime()) <= Math.max(start.getTime(), request.startsAt.getTime())) continue;
      const [attendance] = await tx.select().from(hotelAttendance).where(eq(hotelAttendance.assignmentId, assignment.id));
      if (attendance?.clockInAt) continue;
      const [updated] = await tx.insert(hotelAttendance).values({ assignmentId: assignment.id, status: "leave", updatedBy: admin.id, note: "مرخصی تأییدشده: " + request.kind, updatedAt: decisionTime })
        .onConflictDoUpdate({ target: hotelAttendance.assignmentId, set: { status: "leave", updatedBy: admin.id, note: "مرخصی تأییدشده: " + request.kind, updatedAt: decisionTime } }).returning();
      if (updated && attendance?.status !== "leave") await tx.insert(hotelAttendanceEvents).values({ recordId: updated.id, action: "status_change", previousAt: null, occurredAt: decisionTime, reason: `${attendance?.status ?? "new"} → leave: درخواست #${request.id} تأیید شد`, recordedBy: admin.id });
    }
  });
  revalidatePath("/admin/staff"); redirect("/admin/staff#leave");
}

export async function createShiftSwapRequest(fd: FormData) {
  const admin = await requireAdmin(); const assignmentId = num(fd.get("assignmentId")); const toStaffId = num(fd.get("toStaffId"));
  const [assignment] = await db.select().from(hotelShiftAssignments).where(eq(hotelShiftAssignments.id, assignmentId));
  if (!assignment || !toStaffId || assignment.staffId === toStaffId) fail("برنامه شیفت یا نیروی جایگزین معتبر نیست.");
  await assertPayrollPeriodOpen(assignment.workDate);
  const [target] = await db.select({ active: hotelStaff.isActive }).from(hotelStaff).where(eq(hotelStaff.id, toStaffId));
  if (!target?.active) fail("نیروی جایگزین باید فعال باشد.");
  await db.insert(hotelShiftSwapRequests).values({ assignmentId, fromStaffId: assignment.staffId, toStaffId, reason: cleanText(fd.get("reason"), 300), createdBy: admin.id });
  revalidatePath("/admin/staff"); redirect("/admin/staff#swaps");
}

export async function decideShiftSwap(fd: FormData) {
  const admin = await requireAdmin(); const id = num(fd.get("id")); const status = String(fd.get("status"));
  if (!id || !["approved", "rejected"].includes(status)) fail("تصمیم جابه‌جایی شیفت معتبر نیست.");
  const [request] = await db.select({ request: hotelShiftSwapRequests, assignment: hotelShiftAssignments, shift: hotelShifts }).from(hotelShiftSwapRequests).innerJoin(hotelShiftAssignments, eq(hotelShiftSwapRequests.assignmentId, hotelShiftAssignments.id)).innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id)).where(eq(hotelShiftSwapRequests.id, id));
  if (!request || request.request.status !== "pending") fail("درخواست جابه‌جایی در انتظار بررسی پیدا نشد.");
  if (status === "approved") {
    await assertPayrollPeriodOpen(request.assignment.workDate);
    const [attendance] = await db.select({ id: hotelAttendance.id, clockInAt: hotelAttendance.clockInAt, clockOutAt: hotelAttendance.clockOutAt }).from(hotelAttendance).where(eq(hotelAttendance.assignmentId, request.assignment.id));
    if (attendance?.clockInAt || attendance?.clockOutAt) fail("پس از ثبت ورود یا خروج، جابه‌جایی این شیفت قابل تأیید نیست.");
    const existing = await db.select({ assignment: hotelShiftAssignments, shift: hotelShifts }).from(hotelShiftAssignments).innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id)).where(and(eq(hotelShiftAssignments.staffId, request.request.toStaffId), gte(hotelShiftAssignments.workDate, addDays(request.assignment.workDate, -1)), lte(hotelShiftAssignments.workDate, addDays(request.assignment.workDate, 1)), ne(hotelShiftAssignments.status, "cancelled")));
    if (existing.some((row) => shiftConflict(request.assignment.workDate, request.shift, row.assignment.workDate, row.shift))) fail("نیروی جایگزین در همان بازه شیفت دیگری دارد.");
    const [duplicate] = await db.select({ id: hotelShiftAssignments.id }).from(hotelShiftAssignments).where(and(eq(hotelShiftAssignments.workDate, request.assignment.workDate), eq(hotelShiftAssignments.shiftId, request.assignment.shiftId), eq(hotelShiftAssignments.staffId, request.request.toStaffId)));
    if (duplicate) fail("نیروی جایگزین از قبل در همین شیفت برنامه‌ریزی شده است.");
    const [leave] = await db.select({ id: hotelLeaveRequests.id }).from(hotelLeaveRequests).where(and(eq(hotelLeaveRequests.staffId, request.request.toStaffId), eq(hotelLeaveRequests.status, "approved"), lte(hotelLeaveRequests.startsAt, new Date(`${request.assignment.workDate}T23:59:59`)), gte(hotelLeaveRequests.endsAt, new Date(`${request.assignment.workDate}T00:00:00`))));
    if (leave) fail("نیروی جایگزین در این تاریخ مرخصی تأییدشده دارد.");
    await db.update(hotelShiftAssignments).set({ staffId: request.request.toStaffId, updatedBy: admin.id, updatedAt: new Date(), version: request.assignment.version + 1 }).where(eq(hotelShiftAssignments.id, request.assignment.id));
    await db.update(hotelTasks).set({ assignedStaffId: request.request.toStaffId }).where(and(eq(hotelTasks.assignmentId, request.assignment.id), or(eq(hotelTasks.status, "open"), eq(hotelTasks.status, "in_progress"))));
  }
  await db.update(hotelShiftSwapRequests).set({ status: status as "approved" | "rejected", decisionNote: cleanText(fd.get("note"), 300), decidedBy: admin.id, decidedAt: new Date() }).where(eq(hotelShiftSwapRequests.id, id));
  revalidatePath("/admin/staff"); revalidatePath("/admin/operations"); redirect("/admin/staff#swaps");
}

export async function savePayrollPolicy(fd: FormData) {
  const admin = await requireAdmin(); const year = num(fd.get("jalaliYear"));
  if (year < 1300 || year > 1600) fail("سال شمسی معتبر نیست.");
  let bands: { upToToman: number | null; ratePercent: number }[] = [];
  try { bands = JSON.parse(String(fd.get("taxBrackets") || "[]")); } catch { fail("پله‌های مالیات باید به صورت JSON معتبر وارد شوند."); }
  if (!Array.isArray(bands) || bands.some((band) => !band || (band.upToToman !== null && (!Number.isSafeInteger(band.upToToman) || band.upToToman <= 0)) || !Number.isFinite(band.ratePercent) || band.ratePercent < 0 || band.ratePercent > 100)) fail("ساختار پله‌های مالیات یا نرخ درصد معتبر نیست.");
  let prior = 0;
  for (const band of bands) { if (band.upToToman !== null && band.upToToman <= prior) fail("سقف پله‌های مالیات باید صعودی باشد."); if (band.upToToman !== null) prior = band.upToToman; }
  const base = defaultPayrollPolicy(year);
  const allowedComponents = ["base", "housing", "food", "marital", "children", "seniority", "management", "overtime", "friday", "holiday", "night", "reward"];
  const taxableComponentKeys = [...new Set(fd.getAll("taxableComponentKeys").map(String))];
  const insurableComponentKeys = [...new Set(fd.getAll("insurableComponentKeys").map(String))];
  if (taxableComponentKeys.some((key) => !allowedComponents.includes(key)) || insurableComponentKeys.some((key) => !allowedComponents.includes(key))) fail("ترکیب‌های مشمول بیمه یا مالیات معتبر نیستند.");
  const holidayDates: string[] = [];
  for (const item of cleanText(fd.get("publicHolidayDates"), 4_000).split(/[\n,،]/).map((value) => value.trim()).filter(Boolean)) {
    const match = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(toEnDigits(item));
    if (!match) return fail("تعطیلات عمومی را هر کدام در یک خط با قالب سال/ماه/روز شمسی وارد کنید.");
    const jy = Number(match[1]); const jm = Number(match[2]); const jd = Number(match[3]);
    if (!isValidJalaaliDate(jy, jm, jd)) fail("یکی از تاریخ‌های تعطیل عمومی معتبر نیست.");
    const g = toGregorian(jy, jm, jd);
    holidayDates.push(`${g.gy}-${String(g.gm).padStart(2, "0")}-${String(g.gd).padStart(2, "0")}`);
  }
  const amount = (key: string, fallback: number) => Math.min(1_000_000_000_000, Math.max(0, num(fd.get(key) ?? String(fallback))));
  const percent = (key: string, fallback: number) => Math.min(100, Math.max(0, num(fd.get(key) ?? String(fallback))));
  const values = {
    jalaliYear: year,
    minimumDailyWageToman: amount("minimumDailyWageToman", base.minimumDailyWageToman),
    monthlyHousingToman: amount("monthlyHousingToman", base.monthlyHousingToman),
    monthlyFoodToman: amount("monthlyFoodToman", base.monthlyFoodToman),
    monthlyMaritalToman: amount("monthlyMaritalToman", base.monthlyMaritalToman),
    monthlyChildToman: amount("monthlyChildToman", base.monthlyChildToman),
    monthlySeniorityToman: amount("monthlySeniorityToman", base.monthlySeniorityToman),
    monthlyTaxExemptionToman: amount("monthlyTaxExemptionToman", base.monthlyTaxExemptionToman),
    publicHolidayDates: [...new Set(holidayDates)],
    taxBrackets: bands,
    taxableComponentKeys, insurableComponentKeys,
    employeeInsurancePercent: percent("employeeInsurancePercent", base.employeeInsurancePercent),
    employerInsurancePercent: percent("employerInsurancePercent", base.employerInsurancePercent),
    unemploymentInsurancePercent: percent("unemploymentInsurancePercent", base.unemploymentInsurancePercent),
    overtimePercent: percent("overtimePercent", base.overtimePercent), fridayPremiumPercent: percent("fridayPremiumPercent", base.fridayPremiumPercent),
    holidayPremiumPercent: percent("holidayPremiumPercent", base.holidayPremiumPercent), nightPremiumPercent: percent("nightPremiumPercent", base.nightPremiumPercent),
    standardMonthlyHours: Math.min(744, Math.max(1, num(fd.get("standardMonthlyHours") ?? String(base.standardMonthlyHours)))),
    minimumInsuredHistoryDaysForChildAllowance: Math.min(20_000, Math.max(0, num(fd.get("minimumInsuredHistoryDaysForChildAllowance") ?? String(base.minimumInsuredHistoryDaysForChildAllowance)))),
    annualLeaveDays: Math.min(365, Math.max(0, num(fd.get("annualLeaveDays") ?? String(base.annualLeaveDays)))),
    legalSourceNote: cleanText(fd.get("legalSourceNote"), 500), updatedBy: admin.id, updatedAt: new Date(),
  };
  await db.insert(hotelPayrollPolicies).values(values).onConflictDoUpdate({ target: hotelPayrollPolicies.jalaliYear, set: values });
  revalidatePath("/admin/staff"); redirect(`/admin/staff?policyYear=${year}#policy`);
}

export async function createPayrollAdjustment(fd: FormData) {
  const admin = await requireAdmin(); const staffId = num(fd.get("staffId")); const year = num(fd.get("jalaliYear")); const month = num(fd.get("jalaliMonth"));
  const kind = String(fd.get("kind")); const amountToman = num(fd.get("amountToman")); const description = cleanText(fd.get("description"), 200);
  if (!staffId || year < 1300 || year > 1600 || month < 1 || month > 12 || !["reward", "penalty"].includes(kind) || amountToman < 1 || amountToman > 1_000_000_000_000 || !description) fail("مشخصات تعدیل حقوق را بررسی کنید.");
  const [closed] = await db.select({ id: hotelPayrollPeriods.id }).from(hotelPayrollPeriods).where(and(eq(hotelPayrollPeriods.jalaliYear, year), eq(hotelPayrollPeriods.jalaliMonth, month), ne(hotelPayrollPeriods.status, "draft")));
  if (closed) fail("دوره حقوق این ماه بسته شده و تعدیل تازه نمی‌پذیرد.");
  await db.insert(hotelPayrollAdjustments).values({ staffId, jalaliYear: year, jalaliMonth: month, kind: kind as "reward" | "penalty", amountToman, description, legalBasis: cleanText(fd.get("legalBasis"), 300), taxable: fd.get("taxable") === "on", insurable: fd.get("insurable") === "on", createdBy: admin.id });
  revalidatePath("/admin/staff"); redirect("/admin/staff#adjustments");
}

export async function decidePayrollAdjustment(fd: FormData) {
  const admin = await requireAdmin(); const id = num(fd.get("id")); const status = String(fd.get("status"));
  if (!id || !["approved", "rejected"].includes(status)) fail("تصمیم تعدیل حقوق معتبر نیست.");
  const [row] = await db.select().from(hotelPayrollAdjustments).where(eq(hotelPayrollAdjustments.id, id));
  if (!row || row.status !== "pending") fail("تعدیل در انتظار بررسی پیدا نشد.");
  const [period] = await db.select().from(hotelPayrollPeriods).where(and(eq(hotelPayrollPeriods.jalaliYear, row.jalaliYear), eq(hotelPayrollPeriods.jalaliMonth, row.jalaliMonth)));
  if (period && period.status !== "draft") fail("دوره حقوق بسته شده است و تعدیل آن قابل تغییر نیست.");
  await db.update(hotelPayrollAdjustments).set({ status: status as "approved" | "rejected", approvedBy: admin.id, approvedAt: new Date() }).where(eq(hotelPayrollAdjustments.id, id));
  revalidatePath("/admin/staff"); redirect("/admin/staff#adjustments");
}

export async function generateJalaliPayroll(fd: FormData) {
  const admin = await requireAdmin(); const year = num(fd.get("jalaliYear")); const month = num(fd.get("jalaliMonth"));
  if (year < 1300 || year > 1600 || month < 1 || month > 12) fail("ماه و سال شمسی دوره حقوق را درست انتخاب کنید.");
  const monthDays = jalaaliMonthLength(year, month); const start = toGregorian(year, month, 1); const finish = toGregorian(year, month, monthDays);
  const dateFrom = `${start.gy}-${String(start.gm).padStart(2, "0")}-${String(start.gd).padStart(2, "0")}`;
  const dateTo = `${finish.gy}-${String(finish.gm).padStart(2, "0")}-${String(finish.gd).padStart(2, "0")}`;
  const [policyRow] = await db.select().from(hotelPayrollPolicies).where(eq(hotelPayrollPolicies.jalaliYear, year));
  const defaults = defaultPayrollPolicy(year);
  if (!policyRow && year !== 1405) fail("ابتدا نرخ‌ها و مقررات سال انتخاب‌شده را در بخش تنظیمات حقوق ثبت کنید.");
  const policy: PayrollPolicyCore = policyRow ? {
    jalaliYear: year, minimumDailyWageToman: policyRow.minimumDailyWageToman, monthlyHousingToman: policyRow.monthlyHousingToman,
    monthlyFoodToman: policyRow.monthlyFoodToman, monthlyMaritalToman: policyRow.monthlyMaritalToman, monthlyChildToman: policyRow.monthlyChildToman,
    monthlySeniorityToman: policyRow.monthlySeniorityToman, monthlyTaxExemptionToman: policyRow.monthlyTaxExemptionToman, publicHolidayDates: policyRow.publicHolidayDates, taxBrackets: policyRow.taxBrackets,
    taxableComponentKeys: policyRow.taxableComponentKeys, insurableComponentKeys: policyRow.insurableComponentKeys,
    employeeInsurancePercent: policyRow.employeeInsurancePercent, employerInsurancePercent: policyRow.employerInsurancePercent,
    unemploymentInsurancePercent: policyRow.unemploymentInsurancePercent, overtimePercent: policyRow.overtimePercent,
    fridayPremiumPercent: policyRow.fridayPremiumPercent, holidayPremiumPercent: policyRow.holidayPremiumPercent,
    nightPremiumPercent: policyRow.nightPremiumPercent, standardMonthlyHours: policyRow.standardMonthlyHours,
    minimumInsuredHistoryDaysForChildAllowance: policyRow.minimumInsuredHistoryDaysForChildAllowance,
    annualLeaveDays: policyRow.annualLeaveDays, legalSourceNote: policyRow.legalSourceNote,
  } : defaults;
  if (!policyRow && year === 1405) await db.insert(hotelPayrollPolicies).values({ ...defaults, updatedBy: admin.id }).onConflictDoNothing();
  const [inserted] = await db.insert(hotelPayrollPeriods).values({ title: cleanText(fd.get("title"), 80) || `${year}/${String(month).padStart(2, "0")}`, dateFrom, dateTo, jalaliYear: year, jalaliMonth: month, policySnapshot: policy as unknown as Record<string, unknown>, createdBy: admin.id }).onConflictDoNothing().returning();
  const period = inserted ?? (await db.select().from(hotelPayrollPeriods).where(and(eq(hotelPayrollPeriods.jalaliYear, year), eq(hotelPayrollPeriods.jalaliMonth, month))))[0];
  if (!period || period.status !== "draft") fail("دوره حقوق این ماه وجود دارد و قابل بازسازی نیست.");
  const [entries, people, workedRows, leaveRequests, leaveRows, adjustments] = await Promise.all([
    db.select({ id: hotelPayrollEntries.id }).from(hotelPayrollEntries).where(eq(hotelPayrollEntries.periodId, period.id)),
    db.select().from(hotelStaff),
    db.select({ assignment: hotelShiftAssignments, shift: hotelShifts, attendance: hotelAttendance }).from(hotelShiftAssignments)
      .innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id)).leftJoin(hotelAttendance, eq(hotelAttendance.assignmentId, hotelShiftAssignments.id))
      .where(and(gte(hotelShiftAssignments.workDate, dateFrom), lte(hotelShiftAssignments.workDate, dateTo), ne(hotelShiftAssignments.status, "cancelled"))),
    db.select().from(hotelLeaveRequests).where(and(eq(hotelLeaveRequests.status, "approved"), lte(hotelLeaveRequests.startsAt, new Date(`${dateTo}T23:59:59Z`)), gte(hotelLeaveRequests.endsAt, new Date(`${dateFrom}T00:00:00Z`)))),
    db.select().from(hotelPayrollLeaves).where(and(eq(hotelPayrollLeaves.jalaliYear, year), eq(hotelPayrollLeaves.jalaliMonth, month), eq(hotelPayrollLeaves.status, "approved"))),
    db.select().from(hotelPayrollAdjustments).where(and(eq(hotelPayrollAdjustments.jalaliYear, year), eq(hotelPayrollAdjustments.jalaliMonth, month), eq(hotelPayrollAdjustments.status, "approved"))),
  ]);
  if (entries.length) {
    if (fd.get("rebuild") !== "on") fail("برای این دوره قبلاً پیش‌نویس ساخته شده است. برای محاسبه مجدد از دکمه بازسازی استفاده کنید.");
    await db.delete(hotelPayrollEntries).where(eq(hotelPayrollEntries.periodId, period.id));
  }
  if (!inserted) await db.update(hotelPayrollPeriods).set({ policySnapshot: policy as unknown as Record<string, unknown>, title: cleanText(fd.get("title"), 80) || period.title, createdBy: period.createdBy ?? admin.id }).where(eq(hotelPayrollPeriods.id, period.id));
  const maxInt = 2_147_483_647;
  const entryValues: (typeof hotelPayrollEntries.$inferInsert)[] = [];
  for (const person of people) {
    const rows = workedRows.filter((row) => row.assignment.staffId === person.id); const warnings: string[] = [];
    const employedInPeriod = !!person.employmentStartDate && person.employmentStartDate <= dateTo && (!person.employmentEndDate || person.employmentEndDate >= dateFrom);
    if (!person.isActive && !rows.length && !employedInPeriod) continue;
    const metrics: PayrollMetrics = { workMinutes: 0, overtimeMinutes: 0, fridayMinutes: 0, holidayMinutes: 0, nightMinutes: 0, annualLeaveMinutes: 0, sickLeaveMinutes: 0, unpaidLeaveMinutes: 0, otherLeaveMinutes: 0, shortMinutes: 0, rewardToman: 0, taxableRewardToman: 0, insurableRewardToman: 0, penaltyToman: 0, warnings };
    for (const row of rows) {
      const planned = shiftLength(row.shift); const attendance = row.attendance;
      if (attendance?.clockInAt && attendance.clockOutAt) {
        const worked = Math.max(0, attendance.workedMinutes); const overtime = Math.min(worked, Math.max(0, attendance.overtimeMinutes));
        metrics.workMinutes += worked; metrics.overtimeMinutes += overtime; metrics.shortMinutes += Math.max(0, planned - worked);
        const classified = classifyAttendanceInterval(attendance.clockInAt, attendance.clockOutAt, new Set(policy.publicHolidayDates)); const scale = classified.totalMinutes ? worked / classified.totalMinutes : 0;
        metrics.fridayMinutes += Math.round(classified.fridayMinutes * scale); metrics.nightMinutes += Math.round(classified.nightMinutes * scale); metrics.holidayMinutes += Math.round(classified.holidayMinutes * scale);
      } else if (attendance?.status === "absent" || row.assignment.status === "absent") metrics.shortMinutes += planned;
      else if (attendance?.status === "present" || attendance?.status === "late") warnings.push("برای برنامه " + row.assignment.workDate + " ساعت خروج ثبت نشده است.");
      else if (attendance?.status !== "leave") warnings.push("برای برنامه " + row.assignment.workDate + " حضور یا غیبت ثبت نشده است.");
    }
    const employeeLeaves = leaveRequests.filter((leave) => leave.staffId === person.id);
    for (const leave of employeeLeaves) {
      const leaveMinutes = rows.reduce((sum, row) => {
        const start = new Date(`${row.assignment.workDate}T${row.shift.startTime}:00Z`);
        const end = new Date(`${row.assignment.workDate}T${row.shift.endTime}:00Z`);
        if (end <= start) end.setUTCDate(end.getUTCDate() + 1);
        const overlap = Math.max(0, Math.floor((Math.min(end.getTime(), leave.endsAt.getTime()) - Math.max(start.getTime(), leave.startsAt.getTime())) / 60_000));
        const worked = row.attendance?.workedMinutes ?? 0;
        return sum + Math.max(0, Math.min(shiftLength(row.shift), overlap) - worked);
      }, 0);
      if (leave.kind === "annual") metrics.annualLeaveMinutes += leaveMinutes;
      else if (leave.kind === "sick") metrics.sickLeaveMinutes += leaveMinutes;
      else if (leave.kind === "unpaid") metrics.unpaidLeaveMinutes += leaveMinutes;
      else metrics.otherLeaveMinutes += leaveMinutes;
    }
    for (const leave of leaveRows.filter((row) => row.staffId === person.id)) {
      const minutes = Math.round(leave.hours * 60);
      if (leave.kind === "annual") metrics.annualLeaveMinutes += minutes;
      else if (leave.kind === "sick") metrics.sickLeaveMinutes += minutes;
      else if (leave.kind === "unpaid") metrics.unpaidLeaveMinutes += minutes;
      else metrics.otherLeaveMinutes += minutes;
    }
    const approvedAdjustments = adjustments.filter((row) => row.staffId === person.id);
    metrics.rewardToman = approvedAdjustments.filter((row) => row.kind === "reward").reduce((sum, row) => sum + row.amountToman, 0);
    metrics.taxableRewardToman = approvedAdjustments.filter((row) => row.kind === "reward" && row.taxable).reduce((sum, row) => sum + row.amountToman, 0);
    metrics.insurableRewardToman = approvedAdjustments.filter((row) => row.kind === "reward" && row.insurable).reduce((sum, row) => sum + row.amountToman, 0);
    metrics.penaltyToman = approvedAdjustments.filter((row) => row.kind === "penalty").reduce((sum, row) => sum + row.amountToman, 0);
    const profile: PayrollProfileCore = {
      id: person.id, name: person.fullName, nationalId: person.nationalId, insuranceNumber: person.insuranceNumber,
      jobTitle: person.jobTitle, jobCode: person.jobCode, bankAccountName: person.bankAccountName, bankAccountNumber: person.bankAccountNumber, iban: person.iban,
      employmentStartDate: person.employmentStartDate, employmentEndDate: person.employmentEndDate, maritalStatus: person.maritalStatus, childrenCount: person.childrenCount,
      childAllowanceEligible: person.childAllowanceEligible, insuredHistoryDays: person.insuredHistoryDays,
      salaryMode: person.salaryMode === "fixed" ? "fixed" : "statutory",
      monthlyBaseSalaryToman: person.monthlyBaseSalaryToman || person.monthlySalary,
      fixedAgreedSalaryToman: person.fixedAgreedSalaryToman || (person.salaryMode === "fixed" ? person.monthlySalary : person.salaryMode === "hourly" ? person.hourlyRate * policy.standardMonthlyHours : 0),
      managementAllowanceToman: person.managementAllowanceToman, annualServiceBaseToman: person.annualServiceBaseToman,
      overtimeEligible: person.overtimeEligible, insuranceEnabled: person.insuranceEnabled, incomeTaxEnabled: person.incomeTaxEnabled,
      includeHousing: person.includeHousing, includeFood: person.includeFood, includeMaritalAllowance: person.includeMaritalAllowance,
      includeChildAllowance: person.includeChildAllowance, includeSeniority: person.includeSeniority,
    };
    const result = calculatePayroll({ profile, policy, year, month, monthDays, metrics });
    entryValues.push({
      periodId: period.id, staffId: person.id, staffSnapshot: profile as unknown as Record<string, unknown>,
      regularMinutes: Math.max(0, metrics.workMinutes - metrics.overtimeMinutes), overtimeMinutes: result.overtimeMinutes,
      fridayMinutes: result.fridayMinutes, holidayMinutes: result.holidayMinutes, nightMinutes: result.nightMinutes,
      leaveMinutes: result.leaveMinutes, unpaidLeaveMinutes: result.unpaidLeaveMinutes, shortMinutes: result.shortMinutes,
      earningComponents: result.earnings, deductionComponents: result.deductions,
      basePay: Math.min(maxInt, result.earnings.find((item) => item.key === "base")?.amountToman ?? 0),
      overtimePay: Math.min(maxInt, result.earnings.filter((item) => ["overtime", "friday", "holiday", "night"].includes(item.key)).reduce((sum, item) => sum + item.amountToman, 0)),
      bonus: Math.min(maxInt, metrics.rewardToman), deductions: Math.min(maxInt, result.deductions.reduce((sum, item) => sum + item.amountToman, 0)),
      grossToman: result.grossToman, employeeInsuranceToman: result.employeeInsuranceToman, employerInsuranceToman: result.employerInsuranceToman,
      incomeTaxToman: result.incomeTaxToman, penaltyToman: result.penaltyToman, netPay: Math.min(maxInt, result.netToman), netToman: result.netToman,
      approvedTaxableAdjustmentsToman: metrics.taxableRewardToman, approvedInsurableAdjustmentsToman: metrics.insurableRewardToman, notes: result.warnings.join("\n"),
    });
  }
  if (!entryValues.length) fail("برای این دوره نیروی فعال یا دارای سابقه کاری تعریف نشده است.");
  if (entryValues.length) await db.transaction(async (tx) => { await tx.insert(hotelPayrollEntries).values(entryValues).onConflictDoNothing(); });
  revalidatePath("/admin/staff"); redirect("/admin/staff#payroll");
}
