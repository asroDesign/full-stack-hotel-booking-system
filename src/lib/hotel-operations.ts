import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { hotelShiftAssignments, hotelShifts, hotelStaff, hotelTasks, type Reservation, type StaffDuty } from "@/db/schema";
import { formatJalali } from "@/lib/utils";
import { sendBulkText } from "@/lib/sms";

function tehranClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function hotelBusinessDate() {
  return tehranClock().date;
}

function previousDate(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

async function onDuty(duty: StaffDuty, now = new Date()) {
  const { date, time } = tehranClock(now);
  const yesterday = previousDate(date);
  const rows = await db
    .select({ assignment: hotelShiftAssignments, shift: hotelShifts, staff: hotelStaff })
    .from(hotelShiftAssignments)
    .innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id))
    .innerJoin(hotelStaff, eq(hotelShiftAssignments.staffId, hotelStaff.id))
    .where(and(inArray(hotelShiftAssignments.workDate, [yesterday, date]), eq(hotelShiftAssignments.status, "scheduled"), eq(hotelShiftAssignments.duty, duty), eq(hotelShifts.isActive, true), eq(hotelStaff.isActive, true)));
  return rows.filter(({ assignment, shift }) => {
    if (shift.startTime < shift.endTime) return assignment.workDate === date && time >= shift.startTime && time < shift.endTime;
    return (assignment.workDate === date && time >= shift.startTime) || (assignment.workDate === yesterday && time < shift.endTime);
  });
}

export async function getCurrentShiftCoverage() {
  const duties: StaffDuty[] = ["reception", "housekeeping", "maintenance", "operations"];
  return Promise.all(duties.map(async (duty) => ({ duty, crew: await onDuty(duty) })));
}

async function createTask(input: {
  taskType: "reservation" | "checkin" | "housekeeping" | "guest_request" | "maintenance";
  title: string;
  description: string;
  priority: "normal" | "high";
  roomId?: number | null;
  reservationId?: number | null;
  sourceKey: string;
  duty: StaffDuty;
  smsEvent: "staff_task" | "staff_reservation";
  smsText: string;
  notifyAll?: boolean;
}) {
  const crew = await onDuty(input.duty);
  const lead = crew.find((row) => row.assignment.isLead) ?? (input.duty === "reception" ? undefined : crew[0]);
  const [task] = await db.insert(hotelTasks).values({
    taskType: input.taskType,
    duty: input.duty,
    title: input.title,
    description: input.description,
    workDate: tehranClock().date,
    priority: input.priority,
    roomId: input.roomId ?? null,
    reservationId: input.reservationId ?? null,
    assignmentId: lead?.assignment.id ?? null,
    assignedStaffId: lead?.staff.id ?? null,
    sourceKey: input.sourceKey,
    smsStatus: !crew.length ? "no_shift" : input.duty === "reception" && !lead ? "no_operator" : "pending",
  }).onConflictDoNothing({ target: hotelTasks.sourceKey }).returning({ id: hotelTasks.id });
  if (!task) return;

  if (crew.length && lead) {
    const recipients = input.notifyAll ? crew.map((row) => row.staff.phone) : [lead.staff.phone];
    const response = await sendBulkText(recipients, input.smsText, { event: input.smsEvent });
    const smsStatus = response.disabled ? "disabled" : response.sent && response.failed ? "partial" : response.failed ? "failed" : response.sent ? "sent" : "no_phone";
    await db.update(hotelTasks).set({ smsStatus, smsSentAt: response.sent ? new Date() : null }).where(eq(hotelTasks.id, task.id));
  }
}

export async function notifyReceptionShiftForReservation(reservation: Reservation, event: "reservation" | "checkin" = "reservation") {
  const date = formatJalali(reservation.checkIn);
  const title = event === "checkin" ? `پذیرش مهمان: ${reservation.guestName}` : `رزرو جدید: ${reservation.guestName}`;
  const description = `${reservation.itemName} · ورود ${date} · کد پیگیری ${reservation.trackingCode} · ${reservation.phone}`;
  const smsText = event === "checkin"
    ? `پذیرش هتل: ${reservation.guestName} وارد شد. ${reservation.itemName}، کد ${reservation.trackingCode}`
    : `رزرو جدید هتل: ${reservation.guestName}، ${reservation.itemName}، ورود ${date}، کد ${reservation.trackingCode}`;
  await createTask({
    taskType: event,
    title,
    description,
    priority: event === "checkin" ? "high" : "normal",
    roomId: reservation.roomId,
    reservationId: reservation.id,
    sourceKey: `reservation:${reservation.id}:${event}`,
    duty: "reception",
    smsEvent: "staff_reservation",
    smsText,
  }).catch((error) => console.error("Could not create reception shift task", error));
}

export async function createHousekeepingTask(input: { roomId: number; roomName: string; roomNumber: string; reservationId?: number | null; sourceKey: string }) {
  await createTask({
    taskType: "housekeeping",
    title: `نظافت اتاق ${input.roomNumber || input.roomName}`,
    description: `وضعیت اتاق به نظافت نیاز دارد: ${input.roomName}${input.reservationId ? ` · رزرو ${input.reservationId}` : ""}`,
    priority: "high",
    roomId: input.roomId,
    reservationId: input.reservationId,
    sourceKey: input.sourceKey,
    duty: "housekeeping",
    smsEvent: "staff_task",
    smsText: `نیاز به نظافت: اتاق ${input.roomNumber || input.roomName} (${input.roomName}). لطفاً وضعیت را در پنل عملیات پیگیری کنید.`,
    notifyAll: true,
  }).catch((error) => console.error("Could not create housekeeping task", error));
}

export async function notifyShiftForGuestRequest(input: { reservation: Reservation; requestId: number; messageId: number; category: string; body: string }) {
  const categoryInfo: Record<string, { label: string; duty: StaffDuty; type: "guest_request" | "maintenance"; broadcast: boolean }> = {
    housekeeping: { label: "خانه‌داری", duty: "housekeeping", type: "guest_request", broadcast: true },
    room_service: { label: "سرویس اتاق", duty: "operations", type: "guest_request", broadcast: true },
    maintenance: { label: "تأسیسات", duty: "maintenance", type: "maintenance", broadcast: true },
    reception: { label: "پذیرش", duty: "reception", type: "guest_request", broadcast: false },
    transfer: { label: "ترانسفر", duty: "operations", type: "guest_request", broadcast: true },
    extend: { label: "تمدید اقامت", duty: "reception", type: "guest_request", broadcast: false },
    other: { label: "درخواست مهمان", duty: "reception", type: "guest_request", broadcast: false },
  };
  const category = categoryInfo[input.category] ?? categoryInfo.other;
  await createTask({
    taskType: category.type,
    duty: category.duty,
    title: `${category.label} · ${input.reservation.guestName}`,
    description: `${input.reservation.itemName} · درخواست شماره ${input.requestId}: ${input.body}`,
    priority: category.duty === "maintenance" || category.duty === "housekeeping" ? "high" : "normal",
    roomId: input.reservation.roomId,
    reservationId: input.reservation.id,
    sourceKey: `guest-request:${input.requestId}:${input.messageId}`,
    smsEvent: "staff_task",
    smsText: `درخواست مهمان (${category.label}): ${input.reservation.guestName} · ${input.reservation.itemName}. جزئیات و پیگیری در پنل هماهنگی کارها.`,
    notifyAll: category.broadcast,
  }).catch((error) => console.error("Could not create guest request shift task", error));
}
