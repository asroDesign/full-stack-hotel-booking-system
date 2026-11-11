"use client";

import { useState } from "react";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { faNum, formatJalali } from "@/lib/utils";
import { approvePayrollPeriod, assignShift, generatePayroll, markPayrollPaid, punchAttendance, removeShiftAssignment, saveShift, saveStaff, setAttendanceStatus, updatePayrollEntry } from "@/app/actions/staff";
import type { hotelAttendance, hotelPayrollEntries, hotelPayrollPeriods, hotelShiftAssignments, hotelShifts, hotelStaff } from "@/db/schema";

type Staff = typeof hotelStaff.$inferSelect;
type Shift = typeof hotelShifts.$inferSelect;
type Schedule = { assignment: typeof hotelShiftAssignments.$inferSelect; staff: Staff; shift: Shift; attendance: typeof hotelAttendance.$inferSelect | null };
type Payroll = { entry: typeof hotelPayrollEntries.$inferSelect; period: typeof hotelPayrollPeriods.$inferSelect; staff: Staff };

const dutyLabel: Record<string, string> = { reception: "پذیرش", housekeeping: "خانه‌داری", maintenance: "تأسیسات", operations: "عملیات" };
const attendanceLabel: Record<string, string> = { scheduled: "برنامه‌ریزی‌شده", present: "حاضر", late: "تاخیر", absent: "غایب", leave: "مرخصی" };
const money = (amount: number) => `${faNum(amount.toLocaleString("en-US"))} تومان`;

function StaffForm({ staff }: { staff?: Staff }) {
  return (
    <form action={saveStaff} className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 md:grid-cols-4">
      {staff && <input type="hidden" name="id" value={staff.id} />}
      <label className="form-control"><span className="field-label">نام و نام خانوادگی</span><input className="input" name="fullName" required defaultValue={staff?.fullName} maxLength={100} /></label>
      <label className="form-control"><span className="field-label">شماره همراه برای پیامک</span><input className="input" name="phone" dir="ltr" inputMode="tel" placeholder="0912..." defaultValue={staff?.phone} maxLength={20} /></label>
      <label className="form-control"><span className="field-label">عنوان شغلی</span><input className="input" name="jobTitle" placeholder="مثلاً اپراتور پذیرش" defaultValue={staff?.jobTitle} maxLength={80} /></label>
      <label className="form-control"><span className="field-label">بخش اصلی</span><select className="select" name="duty" defaultValue={staff?.duty ?? "reception"}>{Object.entries(dutyLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="form-control"><span className="field-label">روش حقوق</span><select className="select" name="salaryMode" defaultValue={staff?.salaryMode ?? "monthly"}><option value="monthly">ماهانه</option><option value="hourly">ساعتی</option></select></label>
      <label className="form-control"><span className="field-label">حقوق ماهانه (تومان)</span><input className="input" name="monthlySalary" type="number" min="0" defaultValue={staff?.monthlySalary ?? 0} /></label>
      <label className="form-control"><span className="field-label">نرخ هر ساعت (تومان)</span><input className="input" name="hourlyRate" type="number" min="0" defaultValue={staff?.hourlyRate ?? 0} /></label>
      <label className="form-control md:col-span-2"><span className="field-label">یادداشت</span><input className="input" name="notes" defaultValue={staff?.notes} maxLength={500} /></label>
      <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="isActive" defaultChecked={staff?.isActive ?? true} /> نیروی فعال</label>
      <button className="btn btn-primary">{staff ? "ذخیره تغییرات" : "افزودن نیرو"}</button>
    </form>
  );
}

function ShiftForm({ shift }: { shift?: Shift }) {
  return (
    <form action={saveShift} className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 md:grid-cols-6">
      {shift && <input type="hidden" name="id" value={shift.id} />}
      <label className="form-control"><span className="field-label">نام شیفت</span><input className="input" name="name" required placeholder="صبح" defaultValue={shift?.name} /></label>
      <label className="form-control"><span className="field-label">شروع</span><input className="input" type="time" name="startTime" required defaultValue={shift?.startTime ?? "08:00"} /></label>
      <label className="form-control"><span className="field-label">پایان</span><input className="input" type="time" name="endTime" required defaultValue={shift?.endTime ?? "16:00"} /></label>
      <label className="form-control"><span className="field-label">استراحت (دقیقه)</span><input className="input" type="number" min="0" max="360" name="breakMinutes" defaultValue={shift?.breakMinutes ?? 0} /></label>
      <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" name="isActive" type="checkbox" defaultChecked={shift?.isActive ?? true} /> فعال</label>
      <button className="btn btn-primary">{shift ? "ذخیره شیفت" : "افزودن شیفت"}</button>
    </form>
  );
}

function AssignmentForm({ staff, shifts, day }: { staff: Staff[]; shifts: Shift[]; day: string }) {
  const [date, setDate] = useState(day);
  return (
    <form action={assignShift} className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 md:grid-cols-6">
      <JalaliDatePicker name="workDate" label="تاریخ شیفت" value={date} onChange={setDate} />
      <label className="form-control"><span className="field-label">نیرو</span><select className="select" name="staffId" required defaultValue=""><option value="" disabled>انتخاب نیرو</option>{staff.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select></label>
      <label className="form-control"><span className="field-label">شیفت</span><select className="select" name="shiftId" required defaultValue=""><option value="" disabled>انتخاب شیفت</option>{shifts.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime} تا {s.endTime})</option>)}</select></label>
      <label className="form-control"><span className="field-label">مسئولیت همین شیفت</span><select className="select" name="duty" defaultValue="reception">{Object.entries(dutyLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="isLead" /> سرشیفت / اپراتور اصلی</label>
      <button className="btn btn-primary">ثبت برنامه شیفت</button>
      <p className="text-xs text-base-content/60 md:col-span-6">یک نیرو می‌تواند در روزهای مختلف یا در بخش‌های جدا برنامه‌ریزی شود. اپراتور اصلی پذیرش، پیام رزروها را دریافت می‌کند.</p>
    </form>
  );
}

function AttendanceActions({ row, day }: { row: Schedule; day: string }) {
  const attendance = row.attendance;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="badge badge-soft">{attendanceLabel[attendance?.status ?? "scheduled"]}</span>
      {attendance?.clockInAt && <span className="text-xs text-base-content/60">ورود: {new Date(attendance.clockInAt).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" })}</span>}
      {attendance?.clockOutAt && <span className="text-xs text-base-content/60">خروج: {new Date(attendance.clockOutAt).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" })} · {faNum(attendance.workedMinutes)} دقیقه</span>}
      {!attendance?.clockInAt && <form action={punchAttendance}><input type="hidden" name="assignmentId" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><input type="hidden" name="mode" value="in" /><button className="btn btn-xs btn-success">ثبت ورود</button></form>}
      {attendance?.clockInAt && !attendance.clockOutAt && <form action={punchAttendance}><input type="hidden" name="assignmentId" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><input type="hidden" name="mode" value="out" /><button className="btn btn-xs btn-warning">ثبت خروج</button></form>}
      <form action={setAttendanceStatus} className="flex items-center gap-1"><input type="hidden" name="assignmentId" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><select className="select select-xs" name="status" defaultValue={attendance?.status ?? "scheduled"}>{Object.entries(attendanceLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><button className="btn btn-xs">ثبت وضعیت</button></form>
    </div>
  );
}

function PayrollEditor({ row }: { row: Payroll }) {
  return (
    <details className="rounded-box border border-base-300 p-3">
      <summary className="cursor-pointer text-sm font-semibold">جزئیات و اصلاح محاسبه · {money(row.entry.netPay)}</summary>
      {row.period.status === "draft" && <form action={updatePayrollEntry} className="mt-3 grid gap-2 md:grid-cols-5">
        <input type="hidden" name="id" value={row.entry.id} />
        <label className="form-control"><span className="field-label">حقوق پایه</span><input className="input input-sm" type="number" min="0" name="basePay" defaultValue={row.entry.basePay} /></label>
        <label className="form-control"><span className="field-label">اضافه‌کاری</span><input className="input input-sm" type="number" min="0" name="overtimePay" defaultValue={row.entry.overtimePay} /></label>
        <label className="form-control"><span className="field-label">پاداش</span><input className="input input-sm" type="number" min="0" name="bonus" defaultValue={row.entry.bonus} /></label>
        <label className="form-control"><span className="field-label">کسورات</span><input className="input input-sm" type="number" min="0" name="deductions" defaultValue={row.entry.deductions} /></label>
        <label className="form-control"><span className="field-label">شناسه پرداخت</span><input className="input input-sm" name="paymentRef" defaultValue={row.entry.paymentRef} /></label>
        <button className="btn btn-sm btn-primary md:col-span-5">ذخیره محاسبه</button>
      </form>}
      {row.entry.paymentStatus !== "paid" && row.period.status !== "draft" && <form action={markPayrollPaid} className="mt-2"><input type="hidden" name="id" value={row.entry.id} /><button className="btn btn-sm btn-success">ثبت پرداخت حقوق</button></form>}
      {row.entry.paymentStatus === "paid" && <span className="badge badge-success mt-2">پرداخت‌شده</span>}
    </details>
  );
}

export function StaffAdmin({ staff, shifts, schedule, payroll, day }: { staff: Staff[]; shifts: Shift[]; schedule: Schedule[]; payroll: Payroll[]; day: string }) {
  const [scheduleDate, setScheduleDate] = useState(day);
  const [from, setFrom] = useState(day.slice(0, 8) + "01");
  const [to, setTo] = useState(day);
  const periods = Array.from(new Map(payroll.map((p) => [p.period.id, p.period])).values());
  return (
    <div className="space-y-8">
      <section id="people" className="space-y-3">
        <h2 className="text-lg font-extrabold">تعریف نیروی انسانی <span className="badge badge-ghost">{faNum(staff.length)}</span></h2>
        <p className="text-sm text-base-content/60">اطلاعات تماس و نرخ پرداخت را برای هر نیرو ثبت کنید. شماره همراه برای پیامک‌های وظایف شیفت استفاده می‌شود.</p>
        <StaffForm />
        <div className="grid gap-3 lg:grid-cols-2">{staff.map((person) => <StaffForm key={person.id} staff={person} />)}</div>
      </section>

      <section id="shifts" className="space-y-3">
        <h2 className="text-lg font-extrabold">تعریف شیفت‌های کاری</h2>
        <p className="text-sm text-base-content/60">ساعت پایان کمتر از شروع به‌عنوان شیفت شبانه در نظر گرفته می‌شود.</p>
        <ShiftForm />
        <div className="grid gap-3 lg:grid-cols-2">{shifts.map((shift) => <ShiftForm key={shift.id} shift={shift} />)}</div>
      </section>

      <section id="schedule" className="space-y-3">
        <h2 className="text-lg font-extrabold">برنامه و حضور شیفت‌ها</h2>
        <form method="get" action="/admin/staff" className="flex flex-wrap items-end gap-3 rounded-box bg-base-100 p-4"><JalaliDatePicker name="day" label="تاریخ برنامه" value={scheduleDate} onChange={setScheduleDate} /><button className="btn btn-sm">نمایش روز</button></form>
        <AssignmentForm staff={staff} shifts={shifts} day={day} />
        {schedule.length ? <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100"><table className="table"><thead><tr><th>نیرو</th><th>شیفت / بخش</th><th>سرشیفت</th><th>حضور و غیاب</th><th /></tr></thead><tbody>{schedule.map((row) => <tr key={row.assignment.id}><td><div className="font-bold">{row.staff.fullName}</div><div className="text-xs text-base-content/60">{row.staff.phone || "شماره ثبت نشده"}</div></td><td>{row.shift.name} · {row.shift.startTime} تا {row.shift.endTime}<div className="text-xs text-base-content/60">{dutyLabel[row.assignment.duty]}</div></td><td>{row.assignment.isLead ? <span className="badge badge-primary">مسئول اصلی</span> : "—"}</td><td><AttendanceActions row={row} day={day} /></td><td><form action={removeShiftAssignment}><input type="hidden" name="id" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><button className="btn btn-xs btn-ghost text-error">حذف برنامه</button></form></td></tr>)}</tbody></table></div> : <div className="rounded-box border border-dashed p-6 text-center text-sm text-base-content/60">برای {formatJalali(day, true)} هنوز برنامه شیفتی ثبت نشده است.</div>}
      </section>

      <section id="payroll" className="space-y-3">
        <h2 className="text-lg font-extrabold">حقوق و دستمزد</h2>
        <p className="text-sm text-base-content/60">حقوق ماهانه برای تعداد روزهای دوره به نسبت روزهای هر ماه محاسبه می‌شود. حقوق ساعتی و اضافه‌کاری از ساعات ثبت‌شده و نرخ واردشده به دست می‌آید؛ پاداش و کسورات قابل اصلاح هستند.</p>
        <form action={generatePayroll} className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 md:grid-cols-4">
          <label className="form-control"><span className="field-label">عنوان دوره</span><input className="input" name="title" placeholder="مثلاً آبان ۱۴۰۵" /></label>
          <JalaliDatePicker name="dateFrom" label="از تاریخ" value={from} onChange={setFrom} />
          <JalaliDatePicker name="dateTo" label="تا تاریخ" value={to} onChange={setTo} />
          <button className="btn btn-primary self-end">ساخت پیش‌نویس حقوق</button>
        </form>
        {!periods.length ? <div className="rounded-box border border-dashed p-5 text-center text-sm text-base-content/60">هنوز دوره‌ای ساخته نشده است.</div> : periods.map((period) => (
          <div key={period.id} className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{period.title} · {formatJalali(period.dateFrom)} تا {formatJalali(period.dateTo)}</h3><div className="flex items-center gap-2"><span className="badge">{period.status === "paid" ? "پرداخت‌شده" : period.status === "approved" ? "تاییدشده" : "پیش‌نویس"}</span>{period.status === "draft" && <form action={approvePayrollPeriod}><input type="hidden" name="id" value={period.id} /><button className="btn btn-xs btn-primary">تایید دوره</button></form>}</div></div>
            {payroll.filter((row) => row.period.id === period.id).map((row) => <div key={row.entry.id} className="grid gap-2 border-t border-base-200 pt-3 md:grid-cols-[1fr_1fr_2fr]"><div><b>{row.staff.fullName}</b><div className="text-xs text-base-content/60">حضور: {faNum(row.entry.regularMinutes)} دقیقه · اضافه‌کاری: {faNum(row.entry.overtimeMinutes)} دقیقه</div></div><div className="font-bold">خالص: {money(row.entry.netPay)}</div><PayrollEditor row={row} /></div>)}
          </div>
        ))}
      </section>
    </div>
  );
}
