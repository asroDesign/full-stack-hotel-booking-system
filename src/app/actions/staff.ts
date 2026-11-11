"use server";

import { and, eq, gte, lte, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { hotelAttendance, hotelPayrollEntries, hotelPayrollPeriods, hotelShiftAssignments, hotelShifts, hotelStaff, type StaffDuty } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { toEnDigits, todayISO } from "@/lib/utils";

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

export async function saveStaff(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const fullName = cleanText(fd.get("fullName"), 100);
  const phone = toEnDigits(cleanText(fd.get("phone"), 20)).replace(/[\s-]/g, "");
  const duty = String(fd.get("duty")) as StaffDuty;
  const salaryMode: "hourly" | "monthly" = String(fd.get("salaryMode")) === "hourly" ? "hourly" : "monthly";
  const monthlySalary = Math.min(2_000_000_000, Math.max(0, num(fd.get("monthlySalary"))));
  const hourlyRate = Math.min(2_000_000_000, Math.max(0, num(fd.get("hourlyRate"))));
  if (fullName.length < 2 || !duties.includes(duty)) fail("نام و بخش کاری را درست وارد کنید.");
  if (phone && !/^09\d{9}$/.test(phone)) fail("شماره همراه باید با قالب ۰۹۱۲۱۲۳۴۵۶۷ وارد شود.");
  const values = { fullName, phone, duty, jobTitle: cleanText(fd.get("jobTitle"), 80), salaryMode, monthlySalary, hourlyRate, notes: cleanText(fd.get("notes"), 500), isActive: fd.get("isActive") === "on" };
  if (id) await db.update(hotelStaff).set(values).where(eq(hotelStaff.id, id));
  else await db.insert(hotelStaff).values(values);
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
  if (id) await db.update(hotelShifts).set(values).where(eq(hotelShifts.id, id));
  else await db.insert(hotelShifts).values(values);
  revalidatePath("/admin/staff");
  revalidatePath("/admin/operations");
  redirect("/admin/staff");
}

export async function assignShift(fd: FormData) {
  await requireAdmin();
  const workDate = String(fd.get("workDate") ?? "");
  const staffId = num(fd.get("staffId"));
  const shiftId = num(fd.get("shiftId"));
  const duty = String(fd.get("duty")) as StaffDuty;
  if (!validDate(workDate) || !staffId || !shiftId || !duties.includes(duty)) fail("تاریخ، نیرو، شیفت و مسئولیت را انتخاب کنید.");
  const [[person], [shift]] = await Promise.all([
    db.select({ isActive: hotelStaff.isActive }).from(hotelStaff).where(eq(hotelStaff.id, staffId)),
    db.select({ isActive: hotelShifts.isActive }).from(hotelShifts).where(eq(hotelShifts.id, shiftId)),
  ]);
  if (!person?.isActive || !shift?.isActive) fail("فقط نیروی فعال و شیفت فعال قابل برنامه‌ریزی است.");
  const values = { workDate, staffId, shiftId, duty, isLead: fd.get("isLead") === "on", notes: cleanText(fd.get("notes"), 300) };
  if (values.isLead) {
    await db.update(hotelShiftAssignments).set({ isLead: false }).where(and(eq(hotelShiftAssignments.workDate, workDate), eq(hotelShiftAssignments.shiftId, shiftId), eq(hotelShiftAssignments.duty, duty), eq(hotelShiftAssignments.isLead, true)));
  }
  await db.insert(hotelShiftAssignments).values(values).onConflictDoUpdate({
    target: [hotelShiftAssignments.workDate, hotelShiftAssignments.shiftId, hotelShiftAssignments.staffId],
    set: { duty, isLead: values.isLead, notes: values.notes },
  });
  revalidatePath("/admin/staff");
  revalidatePath("/admin/operations");
  redirect(`/admin/staff?day=${workDate}`);
}

export async function removeShiftAssignment(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const workDate = String(fd.get("workDate") ?? todayISO());
  if (!id) fail("برنامه شیفت معتبر نیست.");
  await db.delete(hotelShiftAssignments).where(eq(hotelShiftAssignments.id, id));
  revalidatePath("/admin/staff");
  revalidatePath("/admin/operations");
  redirect(`/admin/staff?day=${workDate}`);
}

export async function setAttendanceStatus(fd: FormData) {
  await requireAdmin();
  const assignmentId = num(fd.get("assignmentId"));
  const status = String(fd.get("status"));
  if (!assignmentId || !["scheduled", "present", "late", "absent", "leave"].includes(status)) fail("وضعیت حضور معتبر نیست.");
  const [assignment] = await db.select({ id: hotelShiftAssignments.id }).from(hotelShiftAssignments).where(eq(hotelShiftAssignments.id, assignmentId));
  if (!assignment) fail("برنامهٔ شیفت پیدا نشد.");
  await db.insert(hotelAttendance).values({ assignmentId, status: status as "scheduled" | "present" | "late" | "absent" | "leave", updatedAt: new Date() }).onConflictDoUpdate({ target: hotelAttendance.assignmentId, set: { status: status as "scheduled" | "present" | "late" | "absent" | "leave", updatedAt: new Date() } });
  revalidatePath("/admin/staff");
  redirect(`/admin/staff?day=${String(fd.get("workDate") ?? todayISO())}`);
}

export async function punchAttendance(fd: FormData) {
  await requireAdmin();
  const assignmentId = num(fd.get("assignmentId"));
  const mode = String(fd.get("mode"));
  if (!assignmentId || (mode !== "in" && mode !== "out")) fail("ثبت ورود یا خروج معتبر نیست.");
  const [assignmentExists] = await db.select({ id: hotelShiftAssignments.id }).from(hotelShiftAssignments).where(eq(hotelShiftAssignments.id, assignmentId));
  if (!assignmentExists) fail("برنامهٔ شیفت پیدا نشد.");
  const [row] = await db.select().from(hotelAttendance).where(eq(hotelAttendance.assignmentId, assignmentId));
  const now = new Date();
  if (mode === "in") {
    if (row) await db.update(hotelAttendance).set({ status: "present", clockInAt: row.clockInAt ?? now, updatedAt: now }).where(eq(hotelAttendance.id, row.id));
    else await db.insert(hotelAttendance).values({ assignmentId, status: "present", clockInAt: now, updatedAt: now });
  } else if (mode === "out" && row?.clockInAt) {
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
    await db.update(hotelAttendance).set({ clockOutAt: now, workedMinutes, overtimeMinutes: Math.max(0, workedMinutes - scheduled), updatedAt: now }).where(eq(hotelAttendance.id, row.id));
  }
  revalidatePath("/admin/staff");
  redirect(`/admin/staff?day=${String(fd.get("workDate") ?? todayISO())}`);
}

function monthlyPayForRange(monthlySalary: number, from: string, to: string) {
  let total = 0;
  const cursor = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth();
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    total += monthlySalary / daysInMonth;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return Math.round(total);
}

export async function generatePayroll(fd: FormData) {
  await requireAdmin();
  const dateFrom = String(fd.get("dateFrom") ?? "");
  const dateTo = String(fd.get("dateTo") ?? "");
  const title = cleanText(fd.get("title"), 80) || `${dateFrom} تا ${dateTo}`;
  if (!validDate(dateFrom) || !validDate(dateTo) || dateTo < dateFrom) fail("بازه پرداخت حقوق معتبر نیست.");
  const periodDays = (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000;
  if (periodDays > 366) fail("طول دوره حقوق نمی‌تواند بیشتر از یک سال باشد.");
  const [period] = await db.insert(hotelPayrollPeriods).values({ title, dateFrom, dateTo }).onConflictDoNothing().returning();
  const existing = period ?? (await db.select().from(hotelPayrollPeriods).where(and(eq(hotelPayrollPeriods.dateFrom, dateFrom), eq(hotelPayrollPeriods.dateTo, dateTo))))[0];
  if (!existing) fail("دوره پرداخت ایجاد نشد.");
  const staffList = await db.select().from(hotelStaff).where(eq(hotelStaff.isActive, true));
  const attendances = await db.select({ assignment: hotelShiftAssignments, attendance: hotelAttendance }).from(hotelShiftAssignments).innerJoin(hotelAttendance, eq(hotelAttendance.assignmentId, hotelShiftAssignments.id)).where(and(gte(hotelShiftAssignments.workDate, dateFrom), lte(hotelShiftAssignments.workDate, dateTo)));
  for (const staff of staffList) {
    const rows = attendances.filter((row) => row.assignment.staffId === staff.id && ["present", "late"].includes(row.attendance.status));
    const overtimeMinutes = rows.reduce((sum, row) => sum + row.attendance.overtimeMinutes, 0);
    const workedMinutes = rows.reduce((sum, row) => sum + row.attendance.workedMinutes, 0);
    const regularMinutes = Math.max(0, workedMinutes - overtimeMinutes);
    const basePay = staff.salaryMode === "monthly" ? monthlyPayForRange(staff.monthlySalary, dateFrom, dateTo) : Math.round((regularMinutes * staff.hourlyRate) / 60);
    const overtimePay = Math.round((overtimeMinutes * staff.hourlyRate) / 60);
    await db.insert(hotelPayrollEntries).values({ periodId: existing.id, staffId: staff.id, regularMinutes, overtimeMinutes, basePay, overtimePay, netPay: basePay + overtimePay }).onConflictDoNothing();
  }
  revalidatePath("/admin/staff");
  redirect("/admin/staff#payroll");
}

export async function updatePayrollEntry(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const [entry] = await db.select().from(hotelPayrollEntries).where(eq(hotelPayrollEntries.id, id));
  if (!entry) fail("ردیف حقوق پیدا نشد.");
  const [period] = await db.select().from(hotelPayrollPeriods).where(eq(hotelPayrollPeriods.id, entry.periodId));
  if (!period || period.status !== "draft") fail("محاسبه فقط تا پیش از تایید دوره قابل اصلاح است.");
  const basePay = Math.min(2_000_000_000, Math.max(0, num(fd.get("basePay"))));
  const overtimePay = Math.min(2_000_000_000, Math.max(0, num(fd.get("overtimePay"))));
  const bonus = Math.min(2_000_000_000, Math.max(0, num(fd.get("bonus"))));
  const deductions = Math.min(2_000_000_000, Math.max(0, num(fd.get("deductions"))));
  const paymentRef = cleanText(fd.get("paymentRef"), 100);
  await db.update(hotelPayrollEntries).set({ basePay, overtimePay, bonus, deductions, paymentRef, netPay: Math.min(2_000_000_000, Math.max(0, basePay + overtimePay + bonus - deductions)) }).where(eq(hotelPayrollEntries.id, id));
  revalidatePath("/admin/staff");
  redirect("/admin/staff#payroll");
}

export async function markPayrollPaid(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const [entry] = await db.select().from(hotelPayrollEntries).where(eq(hotelPayrollEntries.id, id));
  if (!entry) fail("ردیف حقوق پیدا نشد.");
  const [period] = await db.select().from(hotelPayrollPeriods).where(eq(hotelPayrollPeriods.id, entry.periodId));
  if (!period || period.status === "draft") fail("ابتدا دوره حقوق را تایید کنید.");
  await db.update(hotelPayrollEntries).set({ paymentStatus: "paid", paidAt: new Date() }).where(eq(hotelPayrollEntries.id, id));
  const unpaid = await db.select({ id: hotelPayrollEntries.id }).from(hotelPayrollEntries).where(and(eq(hotelPayrollEntries.periodId, entry.periodId), eq(hotelPayrollEntries.paymentStatus, "unpaid")));
  if (!unpaid.length) await db.update(hotelPayrollPeriods).set({ status: "paid" }).where(eq(hotelPayrollPeriods.id, entry.periodId));
  revalidatePath("/admin/staff");
  redirect("/admin/staff#payroll");
}

export async function approvePayrollPeriod(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const [period] = await db.select().from(hotelPayrollPeriods).where(eq(hotelPayrollPeriods.id, id));
  if (!period || period.status !== "draft") fail("دوره پیش‌نویس برای تایید پیدا نشد.");
  await db.update(hotelPayrollPeriods).set({ status: "approved" }).where(eq(hotelPayrollPeriods.id, id));
  revalidatePath("/admin/staff");
  redirect("/admin/staff#payroll");
}
