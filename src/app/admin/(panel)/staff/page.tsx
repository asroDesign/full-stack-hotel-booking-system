import { asc, desc, eq } from "drizzle-orm";
import { toJalaali } from "jalaali-js";
import { db } from "@/db";
import { admins, hotelAttendance, hotelAttendanceEvents, hotelLeaveRequests, hotelPayrollAdjustments, hotelPayrollEntries, hotelPayrollLeaves, hotelPayrollPeriods, hotelPayrollPolicies, hotelShiftAssignments, hotelShiftSwapRequests, hotelShiftTemplates, hotelShifts, hotelStaff } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { StaffAdmin } from "@/components/admin/staff-admin";
import { hotelBusinessDate } from "@/lib/hotel-operations";
import { defaultPayrollPolicy } from "@/lib/hotel-payroll-core";

export const dynamic = "force-dynamic";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ day?: string; error?: string; policyYear?: string }> }) {
  const params = await searchParams;
  const requestedDay = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : "";
  const parsedDay = requestedDay ? new Date(`${requestedDay}T12:00:00Z`) : null;
  const day = parsedDay && parsedDay.toISOString().slice(0, 10) === requestedDay ? requestedDay : hotelBusinessDate();
  const parts = day.split("-").map(Number) as [number, number, number];
  const { jy: currentJalaliYear } = toJalaali(parts[0], parts[1], parts[2]);
  const requestedPolicyYear = Number(params.policyYear);
  const policyYear = Number.isInteger(requestedPolicyYear) && requestedPolicyYear >= 1300 && requestedPolicyYear <= 1600 ? requestedPolicyYear : currentJalaliYear;
  const [staff, shifts, schedule, payroll, templates, leaveRequests, swaps, adjustments, payrollLeaves, policy, attendanceEvents] = await Promise.all([
    db.select().from(hotelStaff).orderBy(asc(hotelStaff.fullName)),
    db.select().from(hotelShifts).orderBy(asc(hotelShifts.startTime)),
    db.select({ assignment: hotelShiftAssignments, staff: hotelStaff, shift: hotelShifts, attendance: hotelAttendance })
      .from(hotelShiftAssignments)
      .innerJoin(hotelStaff, eq(hotelShiftAssignments.staffId, hotelStaff.id))
      .innerJoin(hotelShifts, eq(hotelShiftAssignments.shiftId, hotelShifts.id))
      .leftJoin(hotelAttendance, eq(hotelAttendance.assignmentId, hotelShiftAssignments.id))
      .where(eq(hotelShiftAssignments.workDate, day))
      .orderBy(asc(hotelShifts.startTime), asc(hotelStaff.fullName)),
    db.select({ entry: hotelPayrollEntries, period: hotelPayrollPeriods, staff: hotelStaff })
      .from(hotelPayrollEntries)
      .innerJoin(hotelPayrollPeriods, eq(hotelPayrollEntries.periodId, hotelPayrollPeriods.id))
      .innerJoin(hotelStaff, eq(hotelPayrollEntries.staffId, hotelStaff.id))
      .orderBy(desc(hotelPayrollPeriods.dateFrom), asc(hotelStaff.fullName))
      .limit(200),
    db.select({ template: hotelShiftTemplates, staff: hotelStaff, shift: hotelShifts }).from(hotelShiftTemplates)
      .innerJoin(hotelStaff, eq(hotelShiftTemplates.staffId, hotelStaff.id)).innerJoin(hotelShifts, eq(hotelShiftTemplates.shiftId, hotelShifts.id))
      .orderBy(asc(hotelStaff.fullName), asc(hotelShiftTemplates.name)),
    db.select({ request: hotelLeaveRequests, staff: hotelStaff }).from(hotelLeaveRequests)
      .innerJoin(hotelStaff, eq(hotelLeaveRequests.staffId, hotelStaff.id)).orderBy(desc(hotelLeaveRequests.createdAt)).limit(100),
    db.select({ request: hotelShiftSwapRequests, assignment: hotelShiftAssignments }).from(hotelShiftSwapRequests)
      .innerJoin(hotelShiftAssignments, eq(hotelShiftSwapRequests.assignmentId, hotelShiftAssignments.id))
      .orderBy(desc(hotelShiftSwapRequests.createdAt)).limit(100),
    db.select({ adjustment: hotelPayrollAdjustments, staff: hotelStaff }).from(hotelPayrollAdjustments)
      .innerJoin(hotelStaff, eq(hotelPayrollAdjustments.staffId, hotelStaff.id)).orderBy(desc(hotelPayrollAdjustments.createdAt)).limit(100),
    db.select({ leave: hotelPayrollLeaves, staff: hotelStaff }).from(hotelPayrollLeaves)
      .innerJoin(hotelStaff, eq(hotelPayrollLeaves.staffId, hotelStaff.id)).orderBy(desc(hotelPayrollLeaves.createdAt)).limit(200),
    db.select().from(hotelPayrollPolicies).where(eq(hotelPayrollPolicies.jalaliYear, policyYear)).then((rows) => rows[0] ?? null),
    db.select({ event: hotelAttendanceEvents, admin: { id: admins.id, name: admins.name } }).from(hotelAttendanceEvents)
      .innerJoin(hotelAttendance, eq(hotelAttendanceEvents.recordId, hotelAttendance.id))
      .innerJoin(hotelShiftAssignments, eq(hotelAttendance.assignmentId, hotelShiftAssignments.id))
      .innerJoin(admins, eq(hotelAttendanceEvents.recordedBy, admins.id))
      .where(eq(hotelShiftAssignments.workDate, day)).orderBy(desc(hotelAttendanceEvents.createdAt)).limit(200),
  ]);
  return (
    <div className="space-y-2">
      <PageHeader title="نیروی انسانی، شیفت و حقوق" desc="تعریف نیرو و برنامه کاری، ثبت حضور و غیاب و آماده‌سازی و تسویه حقوق" />
      {params.error && <div role="alert" className="alert alert-error mb-4">{params.error}</div>}
      <StaffAdmin staff={staff} shifts={shifts} schedule={schedule} payroll={payroll} day={day} currentJalaliYear={currentJalaliYear} templates={templates} leaveRequests={leaveRequests} swaps={swaps} adjustments={adjustments} payrollLeaves={payrollLeaves} policy={policy ?? defaultPayrollPolicy(policyYear)} attendanceEvents={attendanceEvents} />
    </div>
  );
}
