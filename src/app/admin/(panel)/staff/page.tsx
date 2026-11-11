import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { hotelAttendance, hotelPayrollEntries, hotelPayrollPeriods, hotelShiftAssignments, hotelShifts, hotelStaff } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { StaffAdmin } from "@/components/admin/staff-admin";
import { hotelBusinessDate } from "@/lib/hotel-operations";

export const dynamic = "force-dynamic";

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ day?: string; error?: string }> }) {
  const params = await searchParams;
  const day = params.day && /^\d{4}-\d{2}-\d{2}$/.test(params.day) ? params.day : hotelBusinessDate();
  const [staff, shifts, schedule, payroll] = await Promise.all([
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
  ]);
  return (
    <div className="space-y-2">
      <PageHeader title="نیروی انسانی، شیفت و حقوق" desc="تعریف نیرو و برنامه کاری، ثبت حضور و غیاب و آماده‌سازی و تسویه حقوق" />
      {params.error && <div role="alert" className="alert alert-error mb-4">{params.error}</div>}
      <StaffAdmin staff={staff} shifts={shifts} schedule={schedule} payroll={payroll} day={day} />
    </div>
  );
}
