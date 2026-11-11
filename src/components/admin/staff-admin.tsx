"use client";

import { useEffect, useState } from "react";
import { toJalaali } from "jalaali-js";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { faNum, formatJalali } from "@/lib/utils";
import type { PayrollPolicyCore, TaxBand } from "@/lib/hotel-payroll-core";
import { applyShiftTemplate, approvePayrollPeriod, assignShift, createLeaveRequest, createPayrollAdjustment, createPayrollLeave, createShiftSwapRequest, decideLeaveRequest, decidePayrollAdjustment, decidePayrollLeave, decideShiftSwap, generateJalaliPayroll, markPayrollPaid, punchAttendance, removeShiftAssignment, savePayrollPolicy, saveShift, saveShiftTemplate, saveStaff, setAttendanceStatus, toggleShiftTemplate, updatePayrollEntry } from "@/app/actions/staff";
import type { hotelAttendance, hotelAttendanceEvents, hotelLeaveRequests, hotelPayrollAdjustments, hotelPayrollEntries, hotelPayrollLeaves, hotelPayrollPeriods, hotelShiftAssignments, hotelShiftSwapRequests, hotelShiftTemplates, hotelShifts, hotelStaff } from "@/db/schema";

type Staff = typeof hotelStaff.$inferSelect;
type Shift = typeof hotelShifts.$inferSelect;
type Schedule = { assignment: typeof hotelShiftAssignments.$inferSelect; staff: Staff; shift: Shift; attendance: typeof hotelAttendance.$inferSelect | null };
type Payroll = { entry: typeof hotelPayrollEntries.$inferSelect; period: typeof hotelPayrollPeriods.$inferSelect; staff: Staff };
type Template = { template: typeof hotelShiftTemplates.$inferSelect; staff: Staff; shift: Shift };
type Leave = { request: typeof hotelLeaveRequests.$inferSelect; staff: Staff };
type PayrollLeave = { leave: typeof hotelPayrollLeaves.$inferSelect; staff: Staff };
type Swap = { request: typeof hotelShiftSwapRequests.$inferSelect; assignment: typeof hotelShiftAssignments.$inferSelect };
type Adjustment = { adjustment: typeof hotelPayrollAdjustments.$inferSelect; staff: Staff };
type AttendanceEvent = { event: typeof hotelAttendanceEvents.$inferSelect; admin: { id: number; name: string } };

const dutyLabel: Record<string, string> = { reception: "پذیرش", housekeeping: "خانه‌داری", maintenance: "تأسیسات", operations: "عملیات" };
const attendanceLabel: Record<string, string> = { scheduled: "برنامه‌ریزی‌شده", present: "حاضر", late: "تاخیر", absent: "غایب", leave: "مرخصی" };
const money = (amount: number) => `${faNum(amount.toLocaleString("en-US"))} تومان`;
const weekdays = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
const leaveLabel: Record<string, string> = { annual: "استحقاقی", sick: "استعلاجی", unpaid: "بدون حقوق", personal: "شخصی", other: "سایر" };
const statusLabel: Record<string, string> = { pending: "در انتظار", approved: "تأییدشده", rejected: "ردشده" };
const componentLabel: Record<string, string> = { base: "حقوق پایه", housing: "مسکن", food: "اقلام مصرفی", marital: "تأهل", children: "اولاد", seniority: "سنوات", management: "مدیریت", overtime: "اضافه‌کاری", friday: "جمعه‌کاری", holiday: "تعطیل‌کاری", night: "شب‌کاری", reward: "پاداش" };

function JalaliDateField({ name, label, initial = "" }: { name: string; label: string; initial?: string }) {
  const [value, setValue] = useState(initial);
  return <div className="form-control"><JalaliDatePicker name={name} label={label} value={value} onChange={setValue} /><button type="button" className="btn btn-ghost btn-xs self-start" onClick={() => setValue("")}>پاک کردن تاریخ</button></div>;
}

function StaffForm({ staff }: { staff?: Staff }) {
  return (
    <form action={saveStaff} className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 md:grid-cols-4">
      {staff && <input type="hidden" name="id" value={staff.id} />}
      <label className="form-control"><span className="field-label">نام و نام خانوادگی</span><input className="input" name="fullName" required defaultValue={staff?.fullName} maxLength={100} /></label>
      <label className="form-control"><span className="field-label">شماره همراه برای پیامک</span><input className="input" name="phone" dir="ltr" inputMode="tel" placeholder="0912..." defaultValue={staff?.phone} maxLength={20} /></label>
      <label className="form-control"><span className="field-label">عنوان شغلی</span><input className="input" name="jobTitle" placeholder="مثلاً اپراتور پذیرش" defaultValue={staff?.jobTitle} maxLength={80} /></label>
      <label className="form-control"><span className="field-label">بخش اصلی</span><select className="select" name="duty" defaultValue={staff?.duty ?? "reception"}>{Object.entries(dutyLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="form-control"><span className="field-label">روش محاسبه حقوق</span><select className="select" name="salaryMode" defaultValue={staff?.salaryMode === "fixed" ? "fixed" : "statutory"}><option value="statutory">مزد پایه و مزایای سالانه</option><option value="fixed">حقوق توافقی ثابت</option></select></label>
      <label className="form-control"><span className="field-label">حقوق پایه ماهانه (تومان)</span><input className="input" name="monthlyBaseSalaryToman" type="number" min="0" defaultValue={staff?.monthlyBaseSalaryToman || staff?.monthlySalary || 0} /></label>
      <label className="form-control"><span className="field-label">حقوق توافقی ثابت (تومان)</span><input className="input" name="fixedAgreedSalaryToman" type="number" min="0" defaultValue={staff?.fixedAgreedSalaryToman || (staff?.salaryMode === "fixed" ? staff.monthlySalary : 0)} /></label>
      <label className="form-control md:col-span-2"><span className="field-label">یادداشت</span><input className="input" name="notes" defaultValue={staff?.notes} maxLength={500} /></label>
      <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="isActive" defaultChecked={staff?.isActive ?? true} /> نیروی فعال</label>
      <button className="btn btn-primary">{staff ? "ذخیره تغییرات" : "افزودن نیرو"}</button>
      <details className="rounded-box border border-base-300 p-3 md:col-span-4">
        <summary className="cursor-pointer font-semibold">پرونده پرسنلی، بیمه و مزایا</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <label className="form-control"><span className="field-label">کد ملی</span><input className="input" name="nationalId" inputMode="numeric" maxLength={10} defaultValue={staff?.nationalId} /></label>
          <label className="form-control"><span className="field-label">نام پدر</span><input className="input" name="fatherName" defaultValue={staff?.fatherName} /></label>
          <label className="form-control"><span className="field-label">وضعیت تأهل</span><select className="select" name="maritalStatus" defaultValue={staff?.maritalStatus ?? "single"}><option value="single">مجرد</option><option value="married">متأهل</option><option value="unknown">ثبت‌نشده</option></select></label>
          <label className="form-control"><span className="field-label">نوع قرارداد</span><select className="select" name="contractType" defaultValue={staff?.contractType ?? "temporary"}><option value="permanent">دائم</option><option value="temporary">موقت</option><option value="fixed_term">مدت‌معین</option><option value="part_time">پاره‌وقت</option><option value="project">پروژه‌ای</option></select></label>
          <JalaliDateField name="birthDate" label="تاریخ تولد" initial={staff?.birthDate ?? ""} />
          <JalaliDateField name="employmentStartDate" label="شروع همکاری" initial={staff?.employmentStartDate ?? ""} />
          <JalaliDateField name="employmentEndDate" label="پایان همکاری" initial={staff?.employmentEndDate ?? ""} />
          <label className="form-control"><span className="field-label">کد شغلی</span><input className="input" name="jobCode" defaultValue={staff?.jobCode} /></label>
          <label className="form-control"><span className="field-label">شماره بیمه</span><input className="input" name="insuranceNumber" dir="ltr" defaultValue={staff?.insuranceNumber} /></label>
          <label className="form-control"><span className="field-label">سابقه بیمه (روز)</span><input className="input" type="number" min="0" name="insuredHistoryDays" defaultValue={staff?.insuredHistoryDays ?? 0} /></label>
          <label className="form-control"><span className="field-label">تعداد فرزند</span><input className="input" type="number" min="0" name="childrenCount" defaultValue={staff?.childrenCount ?? 0} /></label>
          <label className="form-control"><span className="field-label">حق مدیریت ماهانه (تومان)</span><input className="input" type="number" min="0" name="managementAllowanceToman" defaultValue={staff?.managementAllowanceToman ?? 0} /></label>
          <label className="form-control"><span className="field-label">مبنای سنوات سالانه (تومان)</span><input className="input" type="number" min="0" name="annualServiceBaseToman" defaultValue={staff?.annualServiceBaseToman ?? 0} /></label>
          <label className="form-control"><span className="field-label">نام صاحب حساب</span><input className="input" name="bankAccountName" defaultValue={staff?.bankAccountName} /></label>
          <label className="form-control"><span className="field-label">شماره حساب</span><input className="input" name="bankAccountNumber" dir="ltr" defaultValue={staff?.bankAccountNumber} /></label>
          <label className="form-control"><span className="field-label">شماره شبا</span><input className="input" name="iban" dir="ltr" placeholder="IR000000000000000000000000" defaultValue={staff?.iban} /></label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="childAllowanceEligible" defaultChecked={staff?.childAllowanceEligible ?? false} /> مشمول حق اولاد</label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="overtimeEligible" defaultChecked={staff?.overtimeEligible ?? true} /> مشمول اضافه‌کاری</label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="insuranceEnabled" defaultChecked={staff?.insuranceEnabled ?? true} /> محاسبه بیمه</label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="incomeTaxEnabled" defaultChecked={staff?.incomeTaxEnabled ?? true} /> محاسبه مالیات</label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="includeHousing" defaultChecked={staff?.includeHousing ?? true} /> کمک‌هزینه مسکن</label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="includeFood" defaultChecked={staff?.includeFood ?? true} /> کمک‌هزینه اقلام مصرفی</label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="includeMaritalAllowance" defaultChecked={staff?.includeMaritalAllowance ?? true} /> حق تأهل</label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="includeChildAllowance" defaultChecked={staff?.includeChildAllowance ?? true} /> حق اولاد</label>
          <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="includeSeniority" defaultChecked={staff?.includeSeniority ?? true} /> پایه سنوات</label>
        </div>
      </details>
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

function TemplateSection({ staff, shifts, templates, day }: { staff: Staff[]; shifts: Shift[]; templates: Template[]; day: string }) {
  const [from, setFrom] = useState(day); const [to, setTo] = useState(day);
  return <section id="templates" className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
    <div><h3 className="font-bold">الگوی تکرارشونده هفتگی</h3><p className="text-xs text-base-content/60">روزهای هفته را مشخص کنید، سپس الگو را برای حداکثر ۶۲ روز روی تقویم شمسی اعمال کنید. تداخل شیفت و مرخصی تأییدشده بررسی می‌شود.</p></div>
    <form action={saveShiftTemplate} className="grid gap-3 md:grid-cols-4">
      <label className="form-control"><span className="field-label">نام الگو</span><input className="input" name="name" required placeholder="پذیرش شیفت صبح" /></label>
      <label className="form-control"><span className="field-label">نیرو</span><select className="select" name="staffId" required defaultValue=""><option value="" disabled>انتخاب نیرو</option>{staff.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label>
      <label className="form-control"><span className="field-label">شیفت</span><select className="select" name="shiftId" required defaultValue=""><option value="" disabled>انتخاب شیفت</option>{shifts.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.startTime} تا {s.endTime})</option>)}</select></label>
      <label className="form-control"><span className="field-label">بخش کاری</span><select className="select" name="duty" defaultValue="reception">{Object.entries(dutyLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="form-control"><span className="field-label">محل یا توضیح</span><input className="input" name="location" maxLength={100} /></label>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-3">{weekdays.map((dayName, index) => <label key={dayName} className="flex items-center gap-1 text-sm"><input className="checkbox checkbox-sm checkbox-primary" type="checkbox" name="weekdays" value={index} defaultChecked={index < 5} />{dayName}</label>)}</div>
      <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" name="isLead" type="checkbox" /> سرشیفت این بخش</label>
      <button className="btn btn-primary md:col-span-4">ساخت الگوی هفتگی</button>
    </form>
    {templates.length > 0 && <div className="space-y-2 border-t border-base-200 pt-3">{templates.map(({ template, staff: person, shift }) => <div key={template.id} className="grid items-end gap-2 md:grid-cols-[1fr_1fr_2fr_2fr_auto]">
      <div className="text-sm font-semibold">{template.name}</div><div className="text-sm">{person.fullName} · {shift.name}</div><div className="text-xs text-base-content/60">{template.weekdays.split(",").map((v) => weekdays[Number(v)]).filter(Boolean).join("، ")} · {dutyLabel[template.duty]}{template.isLead ? " · سرشیفت" : ""}</div>
      <form action={applyShiftTemplate} className="flex flex-wrap items-end gap-2"><input type="hidden" name="templateId" value={template.id} /><JalaliDatePicker name="dateFrom" label="از" value={from} onChange={setFrom} /><JalaliDatePicker name="dateTo" label="تا" value={to} onChange={setTo} /><button className="btn btn-sm btn-secondary">اعمال الگو</button></form>
      <form action={toggleShiftTemplate}><input type="hidden" name="id" value={template.id} /><button className={`btn btn-xs ${template.isActive ? "btn-success" : "btn-ghost"}`}>{template.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}</button></form>
    </div>)}</div>}
  </section>;
}

function LeaveSection({ staff, requests }: { staff: Staff[]; requests: Leave[] }) {
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  return <section id="leave" className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
    <div><h3 className="font-bold">مرخصی و غیبت</h3><p className="text-xs text-base-content/60">درخواست‌ها پس از تأیید مدیر در محاسبه ماهانه حقوق و گزارش حضور لحاظ می‌شوند.</p></div>
    <form action={createLeaveRequest} className="grid gap-3 md:grid-cols-6">
      <label className="form-control"><span className="field-label">کارمند</span><select className="select" name="staffId" required defaultValue=""><option value="" disabled>انتخاب</option>{staff.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label>
      <JalaliDatePicker name="dateFrom" label="از تاریخ" value={from} onChange={setFrom} /><JalaliDatePicker name="dateTo" label="تا تاریخ" value={to} onChange={setTo} />
      <label className="form-control"><span className="field-label">نوع مرخصی</span><select className="select" name="kind" defaultValue="annual">{Object.entries(leaveLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <label className="form-control"><span className="field-label">دلیل</span><input className="input" name="reason" maxLength={300} /></label>
      <div className="flex items-end gap-2"><label className="form-control"><span className="field-label">از ساعت</span><input className="input" type="time" name="startTime" defaultValue="00:00" /></label><label className="form-control"><span className="field-label">تا ساعت</span><input className="input" type="time" name="endTime" defaultValue="23:59" /></label></div>
      <button className="btn btn-primary md:col-span-6">ثبت درخواست و ارسال برای بررسی</button>
    </form>
    {requests.length > 0 && <div className="divide-y divide-base-200">{requests.map(({ request, staff: person }) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><div><b>{person.fullName}</b> · {leaveLabel[request.kind]} · {formatJalali(request.startsAt.toISOString().slice(0, 10), true)} تا {formatJalali(request.endsAt.toISOString().slice(0, 10), true)}<div className="text-xs text-base-content/60">{request.reason || "بدون توضیح"} · {statusLabel[request.status]} {request.decisionNote && `· ${request.decisionNote}`}</div></div>{request.status === "pending" && <div className="flex gap-2">{["approved", "rejected"].map((status) => <form key={status} action={decideLeaveRequest}><input type="hidden" name="id" value={request.id} /><input type="hidden" name="status" value={status} /><button className={`btn btn-xs ${status === "approved" ? "btn-success" : "btn-error"}`}>{status === "approved" ? "تأیید" : "رد"}</button></form>)}</div>}</div>)}</div>}
  </section>;
}

function PayrollLeaveSection({ staff, leaves, year, month }: { staff: Staff[]; leaves: PayrollLeave[]; year: number; month: number }) {
  const target = leaves.filter(({ leave }) => leave.jalaliYear === year && leave.jalaliMonth === month);
  return <section id="payroll-leave" className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
    <div><h3 className="font-bold">مرخصی ماهانه بر اساس ساعت</h3><p className="text-xs text-base-content/60">مرخصی پس از تأیید مدیر در محاسبهٔ حقوق ماه انتخاب‌شده ثبت می‌شود.</p></div>
    <form action={createPayrollLeave} className="grid gap-3 md:grid-cols-6">
      <label className="form-control"><span className="field-label">کارمند</span><select className="select" name="staffId" required defaultValue=""><option value="" disabled>انتخاب</option>{staff.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label>
      <input type="hidden" name="jalaliYear" value={year} /><input type="hidden" name="jalaliMonth" value={month} />
      <label className="form-control"><span className="field-label">نوع مرخصی</span><select className="select" name="kind" defaultValue="annual">{Object.entries(leaveLabel).filter(([key]) => key !== "personal").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="form-control"><span className="field-label">مدت (ساعت)</span><input className="input" name="hours" type="number" min="0.25" max="744" step="0.25" required /></label>
      <label className="form-control md:col-span-2"><span className="field-label">توضیحات</span><input className="input" name="note" maxLength={300} /></label>
      <button className="btn btn-primary md:col-span-6">ثبت مرخصی برای بررسی</button>
    </form>
    {target.length > 0 && <div className="divide-y divide-base-200">{target.map(({ leave, staff: person }) => <div key={leave.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><div><b>{person.fullName}</b> · {leaveLabel[leave.kind]} · {faNum(leave.hours)} ساعت<div className="text-xs text-base-content/60">{leave.note || "بدون توضیح"} · {statusLabel[leave.status]}</div></div>{leave.status === "pending" && <div className="flex gap-2">{["approved", "rejected"].map((status) => <form key={status} action={decidePayrollLeave}><input type="hidden" name="id" value={leave.id} /><input type="hidden" name="status" value={status} /><button className={`btn btn-xs ${status === "approved" ? "btn-success" : "btn-error"}`}>{status === "approved" ? "تأیید" : "رد"}</button></form>)}</div>}</div>)}</div>}
    {!target.length && <p className="text-sm text-base-content/60">برای این ماه مرخصی ساعتی ثبت نشده است.</p>}
  </section>;
}

function TaxBracketEditor({ initial }: { initial: TaxBand[] }) {
  const [bands, setBands] = useState<TaxBand[]>(initial);
  const update = (index: number, patch: Partial<TaxBand>) => setBands((current) => current.map((band, i) => i === index ? { ...band, ...patch } : band));
  const add = () => setBands((current) => {
    const next = [...current]; const openIndex = next.findIndex((band) => band.upToToman === null);
    if (openIndex >= 0) {
      const priorLimit = openIndex > 0 ? next[openIndex - 1].upToToman ?? 0 : 0;
      const priorRate = next[openIndex].ratePercent;
      next[openIndex] = { ...next[openIndex], upToToman: priorLimit + 20_000_000 };
      next.splice(openIndex + 1, 0, { upToToman: null, ratePercent: Math.min(100, priorRate + 5) });
      return next;
    }
    return [...next, { upToToman: null, ratePercent: next.length ? Math.min(100, next[next.length - 1].ratePercent + 5) : 10 }];
  });
  return <fieldset className="rounded-box border border-base-300 p-3 md:col-span-4">
    <legend className="px-1 text-sm font-semibold">پلکان مالیات حقوق</legend>
    <input type="hidden" name="taxBrackets" value={JSON.stringify(bands)} />
    <p className="mb-2 text-xs text-base-content/60">حد پلکان‌ها پس از معافیت ماهانه محاسبه می‌شود. خالی گذاشتن حد، آن را به آخرین پلکان باز تبدیل می‌کند.</p>
    <div className="space-y-2">{bands.map((band, index) => <div key={index} className="grid items-end gap-2 md:grid-cols-[1fr_1fr_auto]">
      <label className="form-control"><span className="field-label">حد بالای پلکان {faNum(index + 1)} (تومان بیش از معافیت)</span><input className="input" type="number" min="1" value={band.upToToman ?? ""} onChange={(event) => update(index, { upToToman: event.target.value === "" ? null : Number(event.target.value) })} /></label>
      <label className="form-control"><span className="field-label">نرخ مالیات %</span><input className="input" type="number" min="0" max="100" value={band.ratePercent} onChange={(event) => update(index, { ratePercent: Number(event.target.value) })} /></label>
      <button type="button" className="btn btn-error btn-outline" onClick={() => setBands((current) => current.filter((_, i) => i !== index))}>حذف پلکان</button>
    </div>)}</div>
    <button type="button" className="btn btn-sm btn-outline mt-3" onClick={add}>افزودن پلکان</button>
  </fieldset>;
}

function PayrollPolicySection({ policy }: { policy: PayrollPolicyCore }) {
  const holidayInput = policy.publicHolidayDates.map((value) => {
    const [gy, gm, gd] = value.split("-").map(Number); const date = toJalaali(gy, gm, gd);
    return `${date.jy}/${String(date.jm).padStart(2, "0")}/${String(date.jd).padStart(2, "0")}`;
  }).join("\n");
  return <section id="policy" className="rounded-box border border-base-300 bg-base-100 p-4">
    <h3 className="font-bold">تنظیمات قانونی و نرخ‌های حقوق سال {faNum(policy.jalaliYear)}</h3>
    <p className="my-2 text-xs text-base-content/60">مبالغ بر حسب تومان هستند. مقادیر نمونه باید با بخشنامه رسمی همان سال بررسی و توسط مدیر تنظیم شوند.</p>
    <form action={savePayrollPolicy} className="grid gap-3 md:grid-cols-4">
      <label className="form-control"><span className="field-label">سال شمسی این سیاست</span><input className="input" name="jalaliYear" type="number" min="1300" max="1600" defaultValue={policy.jalaliYear} /></label>
      {([
        ["minimumDailyWageToman", "حداقل مزد روزانه"], ["monthlyHousingToman", "کمک‌هزینه مسکن"], ["monthlyFoodToman", "کمک‌هزینه اقلام مصرفی"], ["monthlyMaritalToman", "حق تأهل"], ["monthlyChildToman", "حق اولاد هر فرزند"], ["monthlySeniorityToman", "سنوات ماهانه"], ["monthlyTaxExemptionToman", "معافیت مالیات ماهانه"],
      ] as [keyof PayrollPolicyCore, string][]).map(([key, label]) => <label key={key} className="form-control"><span className="field-label">{label} (تومان)</span><input className="input" name={key} type="number" min="0" defaultValue={policy[key] as number} /></label>)}
      {([
        ["employeeInsurancePercent", "بیمه کارمند %"], ["employerInsurancePercent", "بیمه کارفرما %"], ["unemploymentInsurancePercent", "بیمه بیکاری %"], ["overtimePercent", "فوق‌العاده اضافه‌کاری %"], ["fridayPremiumPercent", "فوق‌العاده جمعه‌کاری %"], ["holidayPremiumPercent", "فوق‌العاده تعطیل‌کاری %"], ["nightPremiumPercent", "فوق‌العاده شب‌کاری %"], ["standardMonthlyHours", "ساعت استاندارد ماهانه"], ["minimumInsuredHistoryDaysForChildAllowance", "حداقل سابقه بیمه حق اولاد (روز)"], ["annualLeaveDays", "مرخصی استحقاقی سالانه (روز)"],
      ] as [keyof PayrollPolicyCore, string][]).map(([key, label]) => <label key={key} className="form-control"><span className="field-label">{label}</span><input className="input" name={key} type="number" min="0" max={key === "standardMonthlyHours" ? 744 : 100} defaultValue={policy[key] as number} /></label>)}
      <TaxBracketEditor initial={policy.taxBrackets} />
      <label className="form-control md:col-span-2"><span className="field-label">تعطیلات رسمی (هر تاریخ شمسی در یک خط: ۱۴۰۵/۰۱/۰۱)</span><textarea className="textarea min-h-28 font-mono text-xs" name="publicHolidayDates" dir="ltr" defaultValue={holidayInput} /></label>
      <fieldset className="rounded-box border border-base-300 p-3 md:col-span-2"><legend className="px-1 text-sm font-semibold">اجزای مشمول مالیات</legend><div className="grid grid-cols-2 gap-2">{Object.entries(componentLabel).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-sm checkbox-primary" type="checkbox" name="taxableComponentKeys" value={key} defaultChecked={policy.taxableComponentKeys.includes(key)} />{label}</label>)}</div></fieldset>
      <fieldset className="rounded-box border border-base-300 p-3 md:col-span-2"><legend className="px-1 text-sm font-semibold">اجزای مشمول بیمه</legend><div className="grid grid-cols-2 gap-2">{Object.entries(componentLabel).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-sm checkbox-primary" type="checkbox" name="insurableComponentKeys" value={key} defaultChecked={policy.insurableComponentKeys.includes(key)} />{label}</label>)}</div></fieldset>
      <label className="form-control md:col-span-2"><span className="field-label">منبع و یادداشت حقوقی</span><textarea className="textarea min-h-28" name="legalSourceNote" maxLength={500} defaultValue={policy.legalSourceNote} /></label>
      <button className="btn btn-primary md:col-span-4">ذخیره سیاست حقوق سال شمسی</button>
    </form>
  </section>;
}

function AdjustmentSection({ staff, adjustments, year, month }: { staff: Staff[]; adjustments: Adjustment[]; year: number; month: number }) {
  const target = adjustments.filter((row) => row.adjustment.jalaliYear === year && row.adjustment.jalaliMonth === month);
  return <section id="adjustments" className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
    <div><h3 className="font-bold">پاداش، جریمه و تعدیلات ماهانه</h3><p className="text-xs text-base-content/60">تعدیلات ابتدا در انتظار می‌مانند و تنها پس از تأیید مدیر وارد پیش‌نویس حقوق می‌شوند.</p></div>
    <form action={createPayrollAdjustment} className="grid gap-3 md:grid-cols-6">
      <label className="form-control"><span className="field-label">کارمند</span><select className="select" name="staffId" required defaultValue=""><option value="" disabled>انتخاب</option>{staff.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label>
      <input type="hidden" name="jalaliYear" value={year} /><input type="hidden" name="jalaliMonth" value={month} />
      <label className="form-control"><span className="field-label">نوع</span><select className="select" name="kind"><option value="reward">پاداش</option><option value="penalty">جریمه / کسر</option></select></label>
      <label className="form-control"><span className="field-label">مبلغ (تومان)</span><input className="input" name="amountToman" type="number" min="1" required /></label>
      <label className="form-control md:col-span-2"><span className="field-label">شرح</span><input className="input" name="description" required maxLength={200} /></label>
      <label className="form-control md:col-span-2"><span className="field-label">مبنای پرداخت / کسر</span><input className="input" name="legalBasis" maxLength={300} /></label>
      <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="taxable" defaultChecked /> مشمول مالیات</label>
      <label className="flex items-center gap-2 text-sm"><input className="checkbox checkbox-primary" type="checkbox" name="insurable" defaultChecked /> مشمول بیمه</label>
      <button className="btn btn-primary md:col-span-6">ثبت تعدیل برای بررسی</button>
    </form>
    {target.length > 0 && <div className="divide-y divide-base-200">{target.map(({ adjustment, staff: person }) => <div key={adjustment.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><div><b>{person.fullName}</b> · {adjustment.kind === "reward" ? "پاداش" : "کسر"} · {money(adjustment.amountToman)}<div className="text-xs text-base-content/60">{adjustment.description} · {statusLabel[adjustment.status]}</div></div>{adjustment.status === "pending" && <div className="flex gap-2">{["approved", "rejected"].map((status) => <form key={status} action={decidePayrollAdjustment}><input type="hidden" name="id" value={adjustment.id} /><input type="hidden" name="status" value={status} /><button className={`btn btn-xs ${status === "approved" ? "btn-success" : "btn-error"}`}>{status === "approved" ? "تأیید" : "رد"}</button></form>)}</div>}</div>)}</div>}
  </section>;
}

function AttendanceActions({ row, day, events }: { row: Schedule; day: string; events: AttendanceEvent[] }) {
  const attendance = row.attendance;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="badge badge-soft">{attendanceLabel[attendance?.status ?? "scheduled"]}</span>
      {row.assignment.status === "cancelled" && <span className="badge badge-error">برنامه لغو شده</span>}
      {attendance?.clockInAt && <span className="text-xs text-base-content/60">ورود: {new Date(attendance.clockInAt).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" })}</span>}
      {attendance?.clockOutAt && <span className="text-xs text-base-content/60">خروج: {new Date(attendance.clockOutAt).toLocaleTimeString("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" })} · {faNum(attendance.workedMinutes)} دقیقه</span>}
      {!attendance?.clockInAt && row.assignment.status !== "cancelled" && <form action={punchAttendance}><input type="hidden" name="assignmentId" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><input type="hidden" name="mode" value="in" /><input className="input input-xs w-32" name="reason" placeholder="یادداشت ورود" /><button className="btn btn-xs btn-success">ثبت ورود</button></form>}
      {attendance?.clockInAt && !attendance.clockOutAt && row.assignment.status !== "cancelled" && <form action={punchAttendance}><input type="hidden" name="assignmentId" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><input type="hidden" name="mode" value="out" /><input className="input input-xs w-32" name="reason" placeholder="یادداشت خروج" /><button className="btn btn-xs btn-warning">ثبت خروج</button></form>}
      {row.assignment.status !== "cancelled" && <form action={setAttendanceStatus} className="flex flex-wrap items-center gap-1"><input type="hidden" name="assignmentId" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><select className="select select-xs" name="status" defaultValue={attendance?.status ?? "scheduled"}>{Object.entries(attendanceLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><input className="input input-xs w-36" name="reason" placeholder="دلیل اصلاح وضعیت" /><button className="btn btn-xs">ثبت وضعیت</button></form>}
      {events.length > 0 && <details className="basis-full text-xs"><summary className="cursor-pointer">سوابق ثبت و اصلاح ({faNum(events.length)})</summary><ul className="mt-1 space-y-1">{events.map(({ event, admin }) => <li key={event.id}>{new Date(event.createdAt).toLocaleString("fa-IR", { timeZone: "Asia/Tehran" })} · {admin.name} · {event.action} · {event.reason || "بدون توضیح"}</li>)}</ul></details>}
    </div>
  );
}

function PayrollEditor({ row }: { row: Payroll }) {
  return (
    <details className="rounded-box border border-base-300 p-3">
      <summary className="cursor-pointer text-sm font-semibold">ریز محاسبه · {money(row.entry.netToman)}</summary>
      <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
        <div>جمع ناخالص: <b>{money(row.entry.grossToman)}</b></div>
        <div>بیمه سهم کارمند: <b>{money(row.entry.employeeInsuranceToman)}</b></div>
        <div>بیمه سهم کارفرما: <b>{money(row.entry.employerInsuranceToman)}</b></div>
        <div>مالیات حقوق: <b>{money(row.entry.incomeTaxToman)}</b></div>
        <div>جرایم مصوب: <b>{money(row.entry.penaltyToman)}</b></div>
        <div>خالص پرداختی: <b>{money(row.entry.netToman)}</b></div>
      </div>
      {row.entry.earningComponents.length > 0 && <div className="mt-3 space-y-1 border-t border-base-200 pt-2">{row.entry.earningComponents.map((component) => <div key={component.key} className="flex justify-between text-sm"><span>{component.label}</span><span>{money(component.amountToman)}</span></div>)}</div>}
      {row.entry.deductionComponents.length > 0 && <div className="mt-3 space-y-1 border-t border-base-200 pt-2">{row.entry.deductionComponents.map((component) => <div key={component.key} className="flex justify-between text-sm"><span>{component.label}</span><span>{money(component.amountToman)}</span></div>)}</div>}
      {row.entry.notes && <div className="alert alert-warning mt-3 whitespace-pre-line text-xs">{row.entry.notes}</div>}
      {row.period.status === "draft" && <form action={updatePayrollEntry} className="mt-3 grid gap-2 md:grid-cols-5">
        <input type="hidden" name="id" value={row.entry.id} />
        <label className="form-control"><span className="field-label">خالص پرداختی اصلاح‌شده (تومان)</span><input className="input input-sm" type="number" min="0" name="netToman" defaultValue={row.entry.netToman} /></label>
        <label className="form-control md:col-span-3"><span className="field-label">دلیل اصلاح</span><input className="input input-sm" name="correctionReason" required maxLength={300} /></label>
        <label className="form-control"><span className="field-label">شناسه پرداخت</span><input className="input input-sm" name="paymentRef" defaultValue={row.entry.paymentRef} /></label>
        <button className="btn btn-sm btn-primary md:col-span-5">ثبت اصلاح با دلیل</button>
      </form>}
      {row.entry.paymentStatus !== "paid" && row.period.status !== "draft" && <form action={markPayrollPaid} className="mt-2 flex flex-wrap items-end gap-2"><input type="hidden" name="id" value={row.entry.id} /><label className="form-control"><span className="field-label">شناسه / شماره پیگیری واریز</span><input className="input input-sm" name="paymentRef" defaultValue={row.entry.paymentRef} maxLength={100} /></label><button className="btn btn-sm btn-success">ثبت پرداخت حقوق</button></form>}
      {row.entry.paymentStatus === "paid" && <span className="badge badge-success mt-2">پرداخت‌شده</span>}
    </details>
  );
}

export function StaffAdmin({ staff, shifts, schedule, payroll, day, currentJalaliYear, templates, leaveRequests, swaps, adjustments, payrollLeaves, policy, attendanceEvents }: { staff: Staff[]; shifts: Shift[]; schedule: Schedule[]; payroll: Payroll[]; day: string; currentJalaliYear: number; templates: Template[]; leaveRequests: Leave[]; swaps: Swap[]; adjustments: Adjustment[]; payrollLeaves: PayrollLeave[]; policy: PayrollPolicyCore; attendanceEvents: AttendanceEvent[] }) {
  const [activeTab, setActiveTab] = useState<"people" | "shifts" | "schedule" | "payroll">("people");
  const [payrollTab, setPayrollTab] = useState<"list" | "extras" | "policy">("list");
  const [scheduleDate, setScheduleDate] = useState(day);
  const { jm: currentMonth } = toJalaali(...day.split("-").map(Number) as [number, number, number]);
  const [payrollYear, setPayrollYear] = useState(currentJalaliYear);
  const [payrollMonth, setPayrollMonth] = useState(currentMonth);
  const periods = Array.from(new Map(payroll.map((p) => [p.period.id, p.period])).values());
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (["people"].includes(hash)) setActiveTab("people");
    if (["shifts", "templates"].includes(hash)) setActiveTab("shifts");
    if (["schedule", "swaps"].includes(hash)) setActiveTab("schedule");
    if (["payroll", "leave", "adjustments", "policy"].includes(hash)) setActiveTab("payroll");
    if (hash === "leave" || hash === "adjustments") setPayrollTab("extras");
    if (hash === "policy") setPayrollTab("policy");
  }, []);
  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="بخش‌های نیروی انسانی" className="tabs tabs-boxed w-fit max-w-full flex-wrap">
        {([ ["people", "نیروی انسانی"], ["shifts", "تعریف شیفت‌ها"], ["schedule", "برنامه و حضور"], ["payroll", "حقوق و دستمزد"] ] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={`tab ${activeTab === id ? "tab-active" : ""}`} onClick={() => setActiveTab(id)}>{label}</button>)}
      </div>
      {activeTab === "people" && <section id="people" role="tabpanel" className="space-y-3">
        <h2 className="text-lg font-extrabold">تعریف نیروی انسانی <span className="badge badge-ghost">{faNum(staff.length)}</span></h2>
        <p className="text-sm text-base-content/60">اطلاعات تماس و نرخ پرداخت را برای هر نیرو ثبت کنید. شماره همراه برای پیامک‌های وظایف شیفت استفاده می‌شود.</p>
        <StaffForm />
        <div className="grid gap-3 lg:grid-cols-2">{staff.map((person) => <StaffForm key={person.id} staff={person} />)}</div>
      </section>}

      {activeTab === "shifts" && <section id="shifts" role="tabpanel" className="space-y-3">
        <h2 className="text-lg font-extrabold">تعریف شیفت‌های کاری</h2>
        <p className="text-sm text-base-content/60">ساعت پایان کمتر از شروع به‌عنوان شیفت شبانه در نظر گرفته می‌شود.</p>
        <ShiftForm />
        <div className="grid gap-3 lg:grid-cols-2">{shifts.map((shift) => <ShiftForm key={shift.id} shift={shift} />)}</div>
        <TemplateSection staff={staff} shifts={shifts} templates={templates} day={day} />
      </section>}

      {activeTab === "schedule" && <section id="schedule" role="tabpanel" className="space-y-3">
        <h2 className="text-lg font-extrabold">برنامه و حضور شیفت‌ها</h2>
        <form method="get" action="/admin/staff" className="flex flex-wrap items-end gap-3 rounded-box bg-base-100 p-4"><JalaliDatePicker name="day" label="تاریخ برنامه" value={scheduleDate} onChange={setScheduleDate} /><button className="btn btn-sm">نمایش روز</button></form>
        <AssignmentForm staff={staff} shifts={shifts} day={day} />
        {schedule.length ? <div className="overflow-x-auto rounded-box border border-base-300 bg-base-100"><table className="table"><thead><tr><th>نیرو</th><th>شیفت / بخش</th><th>سرشیفت</th><th>حضور و غیاب</th><th /></tr></thead><tbody>{schedule.map((row) => <tr key={row.assignment.id}><td><div className="font-bold">{row.staff.fullName}</div><div className="text-xs text-base-content/60">{row.staff.phone || "شماره ثبت نشده"}</div></td><td>{row.shift.name} · {row.shift.startTime} تا {row.shift.endTime}<div className="text-xs text-base-content/60">{dutyLabel[row.assignment.duty]}</div></td><td>{row.assignment.isLead ? <span className="badge badge-primary">مسئول اصلی</span> : "—"}</td><td><AttendanceActions row={row} day={day} events={attendanceEvents.filter((item) => item.event.recordId === row.attendance?.id)} /></td><td>{row.assignment.status !== "cancelled" && <form action={removeShiftAssignment}><input type="hidden" name="id" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><button className="btn btn-xs btn-ghost text-error">لغو برنامه</button></form>}</td></tr>)}</tbody></table></div> : <div className="rounded-box border border-dashed p-6 text-center text-sm text-base-content/60">برای {formatJalali(day, true)} هنوز برنامه شیفتی ثبت نشده است.</div>}
      </section>}

      {activeTab === "schedule" && <section id="swaps" role="tabpanel" className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
        <div><h3 className="font-bold">جابه‌جایی شیفت‌ها</h3><p className="text-xs text-base-content/60">تغییر مسئول برنامه فقط پس از بررسی هم‌پوشانی و تأیید مدیر اعمال می‌شود.</p></div>
        {schedule.length > 0 && <div className="space-y-2">{schedule.map((row) => <form key={row.assignment.id} action={createShiftSwapRequest} className="flex flex-wrap items-end gap-2 border-b border-base-200 pb-2">
          <input type="hidden" name="assignmentId" value={row.assignment.id} /><div className="min-w-40 text-sm"><b>{row.staff.fullName}</b> · {row.shift.name} · {formatJalali(day, true)}</div>
          <label className="form-control"><span className="field-label">جایگزین پیشنهادی</span><select className="select select-sm" name="toStaffId" required defaultValue=""><option value="" disabled>انتخاب</option>{staff.filter((p) => p.isActive && p.id !== row.staff.id).map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label>
          <label className="form-control"><span className="field-label">دلیل</span><input className="input input-sm" name="reason" maxLength={300} /></label><button className="btn btn-sm">ثبت درخواست</button>
        </form>)}</div>}
        {swaps.length > 0 && <div className="divide-y divide-base-200">{swaps.map(({ request, assignment }) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><div>{staff.find((p) => p.id === request.fromStaffId)?.fullName || "نیروی حذف‌شده"} ← {staff.find((p) => p.id === request.toStaffId)?.fullName || "نیروی حذف‌شده"} · {formatJalali(assignment.workDate, true)}<div className="text-xs text-base-content/60">{request.reason || "بدون توضیح"} · {statusLabel[request.status]}</div></div>{request.status === "pending" && <div className="flex gap-2">{["approved", "rejected"].map((status) => <form key={status} action={decideShiftSwap}><input type="hidden" name="id" value={request.id} /><input type="hidden" name="status" value={status} /><button className={`btn btn-xs ${status === "approved" ? "btn-success" : "btn-error"}`}>{status === "approved" ? "تأیید" : "رد"}</button></form>)}</div>}</div>)}</div>}
      </section>}

      {activeTab === "payroll" && <section id="payroll" role="tabpanel" className="space-y-3">
        <h2 className="text-lg font-extrabold">حقوق و دستمزد</h2>
        <p className="text-sm text-base-content/60">دوره بر اساس ماه شمسی ساخته می‌شود. مزد پایه، مزایا، اضافه‌کاری، جمعه‌کاری، شب‌کاری، مرخصی، بیمه و مالیات از پروفایل و حضور ثبت‌شده snapshot می‌شوند.</p>
        <div role="tablist" aria-label="بخش‌های حقوق و دستمزد" className="tabs tabs-boxed w-fit max-w-full flex-wrap">
          {([["list", "لیست حقوق ماهانه"], ["extras", "مرخصی، تشویقی و جریمه"], ["policy", "تنظیمات قانونی سالانه"]] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={payrollTab === id} className={`tab ${payrollTab === id ? "tab-active" : ""}`} onClick={() => setPayrollTab(id)}>{label}</button>)}
        </div>
        {payrollTab === "list" && <div className="space-y-3">
        <div className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4">
          <form action={generateJalaliPayroll} className="grid gap-3 md:grid-cols-4">
            <label className="form-control"><span className="field-label">سال شمسی</span><input className="input" name="jalaliYear" type="number" min="1300" max="1600" value={payrollYear} onChange={(e) => setPayrollYear(Number(e.target.value))} /></label>
            <label className="form-control"><span className="field-label">ماه شمسی</span><select className="select" name="jalaliMonth" value={payrollMonth} onChange={(e) => setPayrollMonth(Number(e.target.value))}>{["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
            <label className="form-control"><span className="field-label">عنوان دوره</span><input className="input" name="title" placeholder="اختیاری" /></label>
            <button className="btn btn-primary self-end">ساخت snapshot پیش‌نویس</button>
          </form>
        </div>
        {!periods.length ? <div className="rounded-box border border-dashed p-5 text-center text-sm text-base-content/60">هنوز دوره‌ای ساخته نشده است.</div> : periods.map((period) => (
          <div key={period.id} className="space-y-3 rounded-box border border-base-300 bg-base-100 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{period.title} · {formatJalali(period.dateFrom)} تا {formatJalali(period.dateTo)}</h3><div className="flex items-center gap-2"><span className="badge">{period.status === "paid" ? "پرداخت‌شده" : period.status === "approved" ? "تأییدشده" : "پیش‌نویس"}</span>{period.status === "draft" && <>{period.jalaliYear > 0 && <form action={generateJalaliPayroll}><input type="hidden" name="jalaliYear" value={period.jalaliYear} /><input type="hidden" name="jalaliMonth" value={period.jalaliMonth} /><input type="hidden" name="rebuild" value="on" /><button className="btn btn-xs btn-outline" title="بازسازی محاسبه، ردیف فعلی و اصلاح دستی آن را جایگزین می‌کند">بازسازی پیش‌نویس</button></form>}<form action={approvePayrollPeriod}><input type="hidden" name="id" value={period.id} /><button className="btn btn-xs btn-primary">تأیید دوره</button></form></>}</div></div>
            {payroll.filter((row) => row.period.id === period.id).map((row) => <div key={row.entry.id} className="grid gap-2 border-t border-base-200 pt-3 md:grid-cols-[1fr_1fr_2fr]"><div><b>{row.staff.fullName}</b><div className="text-xs text-base-content/60">حضور: {faNum(row.entry.regularMinutes)} دقیقه · اضافه‌کاری: {faNum(row.entry.overtimeMinutes)} دقیقه · مرخصی: {faNum(row.entry.leaveMinutes)} دقیقه</div></div><div className="font-bold">خالص: {money(row.entry.netToman)}</div><PayrollEditor row={row} /></div>)}
          </div>
        ))}
        </div>}
        {payrollTab === "extras" && <div className="space-y-3">
          <div className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 md:grid-cols-2">
            <label className="form-control"><span className="field-label">سال شمسی مرخصی و تعدیلات</span><input className="input" type="number" min="1300" max="1600" value={payrollYear} onChange={(event) => setPayrollYear(Number(event.target.value))} /></label>
            <label className="form-control"><span className="field-label">ماه شمسی مرخصی و تعدیلات</span><select className="select" value={payrollMonth} onChange={(event) => setPayrollMonth(Number(event.target.value))}>{["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
          </div>
          <PayrollLeaveSection staff={staff} leaves={payrollLeaves} year={payrollYear} month={payrollMonth} />
          <LeaveSection staff={staff} requests={leaveRequests} />
          <AdjustmentSection staff={staff} adjustments={adjustments} year={payrollYear} month={payrollMonth} />
        </div>}
        {payrollTab === "policy" && <PayrollPolicySection policy={policy} />}
      </section>}
    </div>
  );
}
