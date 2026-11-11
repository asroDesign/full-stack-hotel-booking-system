"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { hotelStaff, hotelTasks, type HotelTaskStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { cleanText } from "@/lib/security";
import { todayISO, toEnDigits } from "@/lib/utils";
import { getCurrentShiftCoverage } from "@/lib/hotel-operations";
import { sendBulkText } from "@/lib/sms";

const num = (value: FormDataEntryValue | null) => Number(toEnDigits(String(value ?? "")).replace(/[,٬]/g, "")) || 0;
const fail = (message: string): never => redirect(`/admin/operations?error=${encodeURIComponent(message)}`);
const validDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

export async function createManualTask(fd: FormData) {
  await requireAdmin();
  const title = cleanText(fd.get("title"), 120);
  const description = cleanText(fd.get("description"), 1000);
  const workDateRaw = String(fd.get("workDate") ?? todayISO());
  if (!validDate(workDateRaw)) fail("تاریخ انجام کار معتبر نیست.");
  const workDate = workDateRaw;
  const priority = String(fd.get("priority"));
  const assignedStaffId = num(fd.get("assignedStaffId")) || null;
  if (title.length < 3) fail("عنوان کار را کامل وارد کنید.");
  if (assignedStaffId) {
    const [staff] = await db.select({ id: hotelStaff.id }).from(hotelStaff).where(and(eq(hotelStaff.id, assignedStaffId), eq(hotelStaff.isActive, true)));
    if (!staff) fail("نیروی انتخاب‌شده پیدا نشد.");
  }
  await db.insert(hotelTasks).values({ taskType: "manual", title, description, workDate, priority: ["low", "normal", "high", "urgent"].includes(priority) ? priority as "low" | "normal" | "high" | "urgent" : "normal", assignedStaffId, smsStatus: "manual" });
  revalidatePath("/admin/operations");
  redirect("/admin/operations");
}

export async function updateHotelTask(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const status = String(fd.get("status")) as HotelTaskStatus;
  const priority = String(fd.get("priority"));
  const assignedStaffId = num(fd.get("assignedStaffId")) || null;
  if (!id || !["open", "in_progress", "done", "cancelled"].includes(status)) fail("وضعیت کار معتبر نیست.");
  if (assignedStaffId) {
    const [staff] = await db.select({ id: hotelStaff.id }).from(hotelStaff).where(and(eq(hotelStaff.id, assignedStaffId), eq(hotelStaff.isActive, true)));
    if (!staff) fail("نیروی انتخاب‌شده پیدا نشد.");
  }
  await db.update(hotelTasks).set({ status, priority: ["low", "normal", "high", "urgent"].includes(priority) ? priority as "low" | "normal" | "high" | "urgent" : "normal", assignedStaffId, completedAt: status === "done" ? new Date() : null }).where(eq(hotelTasks.id, id));
  revalidatePath("/admin/operations");
  redirect("/admin/operations");
}

export async function resendShiftTaskSms(fd: FormData) {
  await requireAdmin();
  const id = num(fd.get("id"));
  const [task] = await db.select().from(hotelTasks).where(eq(hotelTasks.id, id));
  if (!task || !task.duty || task.taskType === "manual") fail("این کار به شیفت مشخصی متصل نیست.");
  const coverage = await getCurrentShiftCoverage();
  const crew = coverage.find((row) => row.duty === task.duty)?.crew ?? [];
  if (!crew.length) {
    await db.update(hotelTasks).set({ smsStatus: "no_shift" }).where(eq(hotelTasks.id, task.id));
    revalidatePath("/admin/operations");
    redirect("/admin/operations?error=برای%20این%20مسئولیت%20در%20شیفت%20فعلی%20نیرویی%20ثبت%20نشده%20است.");
  }
  const lead = crew.find((row) => row.assignment.isLead) ?? (task.duty === "reception" ? undefined : crew[0]);
  if (!lead) {
    await db.update(hotelTasks).set({ smsStatus: "no_operator", assignmentId: null, assignedStaffId: null }).where(eq(hotelTasks.id, task.id));
    revalidatePath("/admin/operations");
    redirect("/admin/operations?error=برای%20شیفت%20پذیرش%20اپراتور%20اصلی%20تعیین%20کنید.");
  }
  const recipients = task.duty === "reception" ? [lead.staff.phone] : crew.map((row) => row.staff.phone);
  const result = await sendBulkText(recipients, `${task.title} · کار ${task.id}. لطفاً جزئیات را در پنل هماهنگی شیفت پیگیری کنید.`, { event: task.taskType === "reservation" || task.taskType === "checkin" ? "staff_reservation" : "staff_task" });
  const smsStatus = result.disabled ? "disabled" : result.sent && result.failed ? "partial" : result.failed ? "failed" : result.sent ? "sent" : "no_phone";
  await db.update(hotelTasks).set({ smsStatus, smsSentAt: result.sent ? new Date() : null, assignmentId: lead.assignment.id, assignedStaffId: lead.staff.id }).where(eq(hotelTasks.id, task.id));
  revalidatePath("/admin/operations");
  redirect("/admin/operations");
}
