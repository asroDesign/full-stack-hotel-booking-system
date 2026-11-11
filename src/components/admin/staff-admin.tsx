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
    {templates.length > 0 && <details className="border-t border-base-200 pt-3"><summary className="cursor-pointer text-sm font-semibold">الگوهای ثبت‌شده <span className="badge badge-ghost badge-sm">{faNum(templates.length)}</span></summary><div className="mt-3 space-y-2">{templates.map(({ template, staff: person, shift }) => <div key={template.id} className="grid items-end gap-2 rounded-xl bg-base-200/40 p-3 md:grid-cols-[1fr_1fr_2fr_2fr_auto]">
      <div className="text-sm font-semibold">{template.name}</div><div className="text-sm">{person.fullName} · {shift.name}</div><div className="text-xs text-base-content/60">{template.weekdays.split(",").map((v) => weekdays[Number(v)]).filter(Boolean).join("، ")} · {dutyLabel[template.duty]}{template.isLead ? " · سرشیفت" : ""}</div>
      <form action={applyShiftTemplate} className="flex flex-wrap items-end gap-2"><input type="hidden" name="templateId" value={template.id} /><JalaliDatePicker name="dateFrom" label="از" value={from} onChange={setFrom} /><JalaliDatePicker name="dateTo" label="تا" value={to} onChange={setTo} /><button className="btn btn-sm btn-secondary">اعمال الگو</button></form>
      <form action={toggleShiftTemplate}><input type="hidden" name="id" value={template.id} /><button className={`btn btn-xs ${template.isActive ? "btn-success" : "btn-ghost"}`}>{template.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}</button></form>
    </div>)}</div></details>}
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

function InsuranceSection({ staff, payroll, search, setSearch }: { staff: Staff[]; payroll: Map<number, Payroll>; search: string; setSearch: (value: string) => void }) {
  const rows = staff.filter((person) => `${person.fullName} ${person.jobTitle} ${person.insuranceNumber} ${person.nationalId}`.toLowerCase().includes(search.trim().toLowerCase()));
  const insured = staff.filter((person) => person.insuranceEnabled && person.insuranceNumber).length;
  return <section id="insurance" role="tabpanel" className="space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-xl font-extrabold">پروندهٔ بیمه</h2><p className="mt-1 text-sm text-base-content/60">وضعیت پوشش، سابقه و مبالغ بیمهٔ آخرین لیست حقوق ثبت‌شده.</p></div>
      <label className="form-control w-full max-w-xs"><span className="field-label">جست‌وجوی پرسنل</span><input className="input input-bordered" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام، کد ملی یا شماره بیمه" /></label>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4"><div className="text-xs text-base-content/60">کل پرونده‌ها</div><div className="mt-1 text-2xl font-black">{faNum(staff.length)}</div></div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><div className="text-xs text-emerald-900/70">دارای شماره بیمه</div><div className="mt-1 text-2xl font-black text-emerald-900">{faNum(insured)}</div></div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4"><div className="text-xs text-amber-900/70">نیازمند تکمیل اطلاعات</div><div className="mt-1 text-2xl font-black text-amber-900">{faNum(staff.length - insured)}</div></div>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-sm">
      <table className="table table-zebra">
        <thead><tr><th>کارمند</th><th>کد ملی</th><th>شماره بیمه</th><th>سابقه</th><th>مبنای بیمه آخرین دوره</th><th>سهم کارمند</th><th>سهم کارفرما</th><th>وضعیت</th></tr></thead>
        <tbody>{rows.map((person) => {
          const latest = payroll.get(person.id);
          const base = latest?.entry.earningComponents.filter((item) => item.insurable).reduce((sum, item) => sum + item.amountToman, 0) ?? 0;
          return <tr key={person.id}>
            <td><div className="font-bold">{person.fullName}</div><div className="text-xs text-base-content/60">{person.jobTitle || dutyLabel[person.duty]}</div></td>
            <td dir="ltr" className="text-right font-mono text-xs">{person.nationalId || "—"}</td>
            <td dir="ltr" className="text-right font-mono text-xs">{person.insuranceNumber || "ثبت نشده"}</td>
            <td>{faNum(person.insuredHistoryDays)} روز</td>
            <td>{latest ? money(base) : "—"}</td>
            <td>{latest ? money(latest.entry.employeeInsuranceToman) : "—"}</td>
            <td>{latest ? money(latest.entry.employerInsuranceToman) : "—"}</td>
            <td><span className={`badge ${person.insuranceEnabled && person.insuranceNumber ? "badge-success" : "badge-warning"}`}>{person.insuranceEnabled && person.insuranceNumber ? "فعال" : person.insuranceEnabled ? "فاقد شماره" : "غیرفعال"}</span></td>
          </tr>;
        })}</tbody>
      </table>
      {!rows.length && <div className="p-8 text-center text-sm text-base-content/60">پرسنلی با این مشخصات پیدا نشد.</div>}
    </div>
  </section>;
}

export function StaffAdmin({ staff, shifts, schedule, payroll, day, currentJalaliYear, templates, leaveRequests, swaps, adjustments, payrollLeaves, policy, attendanceEvents }: { staff: Staff[]; shifts: Shift[]; schedule: Schedule[]; payroll: Payroll[]; day: string; currentJalaliYear: number; templates: Template[]; leaveRequests: Leave[]; swaps: Swap[]; adjustments: Adjustment[]; payrollLeaves: PayrollLeave[]; policy: PayrollPolicyCore; attendanceEvents: AttendanceEvent[] }) {
  const [activeTab, setActiveTab] = useState<"people" | "insurance" | "shifts" | "payroll">("people");
  const [shiftTab, setShiftTab] = useState<"definitions" | "templates" | "schedule" | "swaps">("definitions");
  const [payrollTab, setPayrollTab] = useState<"list" | "extras" | "policy">("list");
  const [scheduleDate, setScheduleDate] = useState(day);
  const [search, setSearch] = useState("");
  const [dutyFilter, setDutyFilter] = useState("all");
  const { jm: currentMonth } = toJalaali(...day.split("-").map(Number) as [number, number, number]);
  const [payrollYear, setPayrollYear] = useState(currentJalaliYear);
  const [payrollMonth, setPayrollMonth] = useState(currentMonth);
  const periods = Array.from(new Map(payroll.map((row) => [row.period.id, row.period])).values());
  const latestPayroll = new Map<number, Payroll>();
  for (const row of payroll) if (!latestPayroll.has(row.staff.id)) latestPayroll.set(row.staff.id, row);
  const filteredStaff = staff.filter((person) => (dutyFilter === "all" || person.duty === dutyFilter) && `${person.fullName} ${person.jobTitle} ${person.phone}`.toLowerCase().includes(search.trim().toLowerCase()));
  const insuredCount = staff.filter((person) => person.insuranceEnabled && person.insuranceNumber).length;
  const setHash = (hash: string) => window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${hash}`);
  const selectMainTab = (id: "people" | "insurance" | "shifts" | "payroll") => {
    setActiveTab(id);
    setHash(id === "people" ? "people" : id === "insurance" ? "insurance" : id === "shifts" ? shiftTab : "payroll");
  };
  const selectShiftTab = (id: "definitions" | "templates" | "schedule" | "swaps") => {
    setShiftTab(id);
    setHash(id === "definitions" ? "shifts" : id);
  };
  const selectPayrollTab = (id: "list" | "extras" | "policy") => {
    setPayrollTab(id);
    setHash(id === "list" ? "payroll" : id === "extras" ? "leave" : "policy");
  };

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === "insurance") setActiveTab("insurance");
    if (hash === "people") setActiveTab("people");
    if (["shifts", "templates", "schedule", "swaps"].includes(hash)) {
      setActiveTab("shifts");
      if (hash === "templates") setShiftTab("templates");
      if (hash === "schedule") setShiftTab("schedule");
      if (hash === "swaps") setShiftTab("swaps");
    }
    if (["payroll", "leave", "adjustments", "policy"].includes(hash)) {
      setActiveTab("payroll");
      if (hash === "leave" || hash === "adjustments") setPayrollTab("extras");
      if (hash === "policy") setPayrollTab("policy");
    }
    if (!hash && new URLSearchParams(window.location.search).has("day")) {
      setActiveTab("shifts");
      setShiftTab("schedule");
    }
  }, []);

  const mainTabs = [["people", "نیروی انسانی"], ["insurance", "بیمه"], ["shifts", "شیفت‌ها"], ["payroll", "حقوق و دستمزد"]] as const;
  const shiftTabs = [["definitions", "تعریف شیفت"], ["templates", "الگوهای هفتگی"], ["schedule", "برنامه و حضور"], ["swaps", "جابه‌جایی شیفت"]] as const;
  const payrollTabs = [["list", "لیست حقوق ماهانه"], ["extras", "مرخصی، تشویقی و جریمه"], ["policy", "تنظیمات قانونی سالانه"]] as const;

  return <div className="space-y-5">
    <section className="rounded-3xl border border-base-300 bg-gradient-to-br from-base-100 via-base-100 to-primary/5 p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="badge badge-outline mb-2">مدیریت منابع انسانی</span><h2 className="text-2xl font-black tracking-tight">همراهی تیم، از شیفت تا پرداخت</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-base-content/65">پروندهٔ کارکنان، پوشش بیمه، برنامهٔ شیفت و لیست حقوق را از یک پنل مرتب پیگیری کنید.</p></div>
        <div className="rounded-2xl bg-primary/10 px-4 py-3 text-sm"><div className="text-xs text-base-content/60">دورهٔ جاری</div><div className="mt-1 font-bold">{faNum(currentJalaliYear)} · {faNum(currentMonth)}</div></div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[["پرسنل فعال", staff.filter((person) => person.isActive).length, "از " + faNum(staff.length) + " پرونده"], ["پروندهٔ بیمه", insuredCount, "دارای شمارهٔ بیمه"], ["تعریف شیفت", shifts.filter((shift) => shift.isActive).length, "شیفت فعال"], ["برنامهٔ امروز", schedule.length, formatJalali(day, true)]].map(([label, value, hint]) => <div key={String(label)} className="rounded-2xl border border-base-300/80 bg-base-100/85 p-3.5"><div className="text-xs text-base-content/60">{label}</div><div className="mt-1 text-2xl font-black">{faNum(Number(value))}</div><div className="mt-1 text-[11px] text-base-content/50">{hint}</div></div>)}
      </div>
    </section>

    <div role="tablist" aria-label="بخش‌های نیروی انسانی" className="tabs tabs-boxed w-full flex-wrap rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-sm">
      {mainTabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={`tab flex-1 rounded-xl font-bold ${activeTab === id ? "tab-active" : ""}`} onClick={() => selectMainTab(id)}>{label}</button>)}
    </div>

    {activeTab === "people" && <section id="people" role="tabpanel" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-xl font-extrabold">فهرست نیروی انسانی</h3><p className="mt-1 text-sm text-base-content/60">اطلاعات شغلی و مالی را باز کنید تا پروندهٔ کامل هر نفر را ویرایش کنید.</p></div><details className="dropdown dropdown-end">
        <summary className="btn btn-primary rounded-xl">افزودن نیروی جدید</summary><div className="dropdown-content z-20 mt-3 w-[min(92vw,900px)] rounded-2xl border border-base-300 bg-base-100 p-4 shadow-2xl"><StaffForm /></div>
      </details></div>
      <div className="grid gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 md:grid-cols-[1fr_220px]"><label className="form-control"><span className="field-label">جست‌وجو</span><input className="input input-bordered" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="نام، عنوان شغلی یا شماره همراه" /></label><label className="form-control"><span className="field-label">بخش کاری</span><select className="select select-bordered" value={dutyFilter} onChange={(event) => setDutyFilter(event.target.value)}><option value="all">همهٔ بخش‌ها</option>{Object.entries(dutyLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label></div>
      {filteredStaff.length ? <div className="grid gap-3 xl:grid-cols-2">{filteredStaff.map((person) => <article key={person.id} className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 font-black text-primary">{person.fullName.slice(0, 1)}</div><div><div className="font-extrabold">{person.fullName}</div><div className="mt-0.5 text-xs text-base-content/60">{person.jobTitle || dutyLabel[person.duty]} · {person.phone || "شماره همراه ثبت نشده"}</div></div></div><span className={`badge ${person.isActive ? "badge-success" : "badge-ghost"}`}>{person.isActive ? "فعال" : "غیرفعال"}</span></div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4"><div className="rounded-xl bg-base-200/60 p-2"><div className="text-base-content/50">بخش</div><b>{dutyLabel[person.duty]}</b></div><div className="rounded-xl bg-base-200/60 p-2"><div className="text-base-content/50">حقوق پایه</div><b>{money(person.salaryMode === "fixed" ? person.fixedAgreedSalaryToman : person.monthlyBaseSalaryToman || person.monthlySalary)}</b></div><div className="rounded-xl bg-base-200/60 p-2"><div className="text-base-content/50">بیمه</div><b>{person.insuranceEnabled && person.insuranceNumber ? "پرونده کامل" : "نیازمند تکمیل"}</b></div><div className="rounded-xl bg-base-200/60 p-2"><div className="text-base-content/50">شماره بیمه</div><b dir="ltr" className="font-mono">{person.insuranceNumber || "—"}</b></div></div>
        <details className="mt-3 border-t border-base-200 pt-3"><summary className="cursor-pointer text-sm font-bold text-primary">ویرایش پروندهٔ پرسنلی و بیمه</summary><div className="mt-3"><StaffForm staff={person} /></div></details>
      </article>)}</div> : <div className="rounded-2xl border border-dashed border-base-300 p-10 text-center text-sm text-base-content/60">کارمندی با این فیلتر پیدا نشد.</div>}
    </section>}

    {activeTab === "insurance" && <InsuranceSection staff={staff} payroll={latestPayroll} search={search} setSearch={setSearch} />}

    {activeTab === "shifts" && <section id="shifts" role="tabpanel" className="space-y-4">
      <div><h3 className="text-xl font-extrabold">مدیریت شیفت و حضور</h3><p className="mt-1 text-sm text-base-content/60">از تعریف ساعت کاری تا برنامهٔ نیروها و ثبت ورود و خروج.</p></div>
      <div role="tablist" aria-label="بخش‌های شیفت" className="tabs tabs-bordered w-full overflow-x-auto whitespace-nowrap">
        {shiftTabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={shiftTab === id} className={`tab font-semibold ${shiftTab === id ? "tab-active" : ""}`} onClick={() => selectShiftTab(id)}>{label}</button>)}
      </div>
      {shiftTab === "definitions" && <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h4 className="font-bold">تعریف ساعت‌های کاری</h4><p className="mt-1 text-xs text-base-content/60">پایان قبل از شروع، شیفت شبانه محسوب می‌شود.</p></div><details className="dropdown dropdown-end"><summary className="btn btn-primary btn-sm rounded-xl">تعریف شیفت تازه</summary><div className="dropdown-content z-20 mt-3 w-[min(92vw,760px)] rounded-2xl border border-base-300 bg-base-100 p-4 shadow-2xl"><ShiftForm /></div></details></div>
        <div className="grid gap-3 lg:grid-cols-3">{shifts.map((shift) => <div key={shift.id} className="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm"><div className="mb-3 flex items-center justify-between"><div><div className="font-extrabold">{shift.name}</div><div className="mt-1 text-xs text-base-content/60">{shift.startTime} تا {shift.endTime} · {faNum(shift.breakMinutes)} دقیقه استراحت</div></div><span className={`badge ${shift.isActive ? "badge-success" : "badge-ghost"}`}>{shift.isActive ? "فعال" : "غیرفعال"}</span></div><details className="border-t border-base-200 pt-3"><summary className="cursor-pointer text-sm font-semibold">ویرایش مشخصات شیفت</summary><div className="mt-3"><ShiftForm shift={shift} /></div></details></div>)}</div>
      </div>}
      {shiftTab === "templates" && <TemplateSection staff={staff} shifts={shifts} templates={templates} day={day} />}
      {shiftTab === "schedule" && <section id="schedule" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h4 className="font-bold">برنامه و حضور روزانه</h4><p className="mt-1 text-xs text-base-content/60">برنامهٔ {formatJalali(day, true)} را بررسی و وضعیت حضور را ثبت کنید.</p></div><form method="get" action="/admin/staff" className="flex flex-wrap items-end gap-2 rounded-2xl border border-base-300 bg-base-100 p-3"><JalaliDatePicker name="day" label="تاریخ برنامه" value={scheduleDate} onChange={setScheduleDate} /><button className="btn btn-sm btn-outline">نمایش تاریخ</button></form></div>
        <details className="rounded-2xl border border-base-300 bg-base-100 p-4"><summary className="cursor-pointer font-bold text-primary">ثبت برنامهٔ جدید</summary><div className="mt-4"><AssignmentForm staff={staff} shifts={shifts} day={day} /></div></details>
        {schedule.length ? <div className="overflow-x-auto rounded-2xl border border-base-300 bg-base-100 shadow-sm"><table className="table table-zebra"><thead><tr><th>نیرو</th><th>شیفت / بخش</th><th>سرشیفت</th><th>حضور و غیاب</th><th>مدیریت</th></tr></thead><tbody>{schedule.map((row) => <tr key={row.assignment.id}><td><div className="font-bold">{row.staff.fullName}</div><div className="text-xs text-base-content/60">{row.staff.phone || "شماره ثبت نشده"}</div></td><td>{row.shift.name} · {row.shift.startTime} تا {row.shift.endTime}<div className="text-xs text-base-content/60">{dutyLabel[row.assignment.duty]}</div></td><td>{row.assignment.isLead ? <span className="badge badge-primary">مسئول اصلی</span> : "—"}</td><td><AttendanceActions row={row} day={day} events={attendanceEvents.filter((item) => item.event.recordId === row.attendance?.id)} /></td><td>{row.assignment.status !== "cancelled" && <form action={removeShiftAssignment}><input type="hidden" name="id" value={row.assignment.id} /><input type="hidden" name="workDate" value={day} /><button className="btn btn-xs btn-ghost text-error">لغو برنامه</button></form>}</td></tr>)}</tbody></table></div> : <div className="rounded-2xl border border-dashed border-base-300 p-8 text-center text-sm text-base-content/60">برای این روز برنامه‌ای ثبت نشده است.</div>}
      </section>}
      {shiftTab === "swaps" && <section id="swaps" className="space-y-4 rounded-2xl border border-base-300 bg-base-100 p-4">
        <div><h4 className="font-bold">درخواست‌های جابه‌جایی شیفت</h4><p className="mt-1 text-xs text-base-content/60">تغییر مسئول برنامه پس از بررسی تداخل و تأیید مدیر اعمال می‌شود.</p></div>
        {schedule.length > 0 && <div className="space-y-2">{schedule.map((row) => <form key={row.assignment.id} action={createShiftSwapRequest} className="grid gap-2 rounded-xl bg-base-200/40 p-3 md:grid-cols-[1fr_1fr_1fr_auto]"><input type="hidden" name="assignmentId" value={row.assignment.id} /><div className="self-center text-sm"><b>{row.staff.fullName}</b><div className="text-xs text-base-content/60">{row.shift.name} · {formatJalali(day, true)}</div></div><label className="form-control"><span className="field-label">جایگزین پیشنهادی</span><select className="select select-sm" name="toStaffId" required defaultValue=""><option value="" disabled>انتخاب نیرو</option>{staff.filter((person) => person.isActive && person.id !== row.staff.id).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}</select></label><label className="form-control"><span className="field-label">دلیل</span><input className="input input-sm" name="reason" maxLength={300} /></label><button className="btn btn-sm btn-outline self-end">ثبت درخواست</button></form>)}</div>}
        {swaps.length > 0 ? <div className="divide-y divide-base-200">{swaps.map(({ request, assignment }) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div>{staff.find((person) => person.id === request.fromStaffId)?.fullName || "نیروی حذف‌شده"} ← {staff.find((person) => person.id === request.toStaffId)?.fullName || "نیروی حذف‌شده"} · {formatJalali(assignment.workDate, true)}<div className="text-xs text-base-content/60">{request.reason || "بدون توضیح"} · {statusLabel[request.status]}</div></div>{request.status === "pending" && <div className="flex gap-2">{["approved", "rejected"].map((status) => <form key={status} action={decideShiftSwap}><input type="hidden" name="id" value={request.id} /><input type="hidden" name="status" value={status} /><button className={`btn btn-xs ${status === "approved" ? "btn-success" : "btn-error"}`}>{status === "approved" ? "تأیید" : "رد"}</button></form>)}</div>}</div>)}</div> : <div className="rounded-xl bg-base-200/50 p-5 text-center text-sm text-base-content/60">درخواست جابه‌جایی ثبت‌شده‌ای وجود ندارد.</div>}
      </section>}
    </section>}

    {activeTab === "payroll" && <section id="payroll" role="tabpanel" className="space-y-4">
      <div><span className="badge badge-outline mb-2">محاسبات ماهانه و مقررات</span><h3 className="text-xl font-extrabold">حقوق و دستمزد</h3><p className="mt-1 text-sm text-base-content/60">فهرست ماهانه، مزایا و مرخصی‌ها، و نرخ‌های قانونی در تب‌های جداگانه.</p></div>
      <div role="tablist" aria-label="بخش‌های حقوق و دستمزد" className="tabs tabs-boxed w-full flex-wrap rounded-2xl border border-base-300 bg-base-100 p-1.5 shadow-sm">{payrollTabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={payrollTab === id} className={`tab flex-1 rounded-xl font-bold ${payrollTab === id ? "tab-active" : ""}`} onClick={() => selectPayrollTab(id)}>{label}</button>)}</div>
      {payrollTab === "list" && <div className="space-y-4">
        <form action={generateJalaliPayroll} className="grid gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm md:grid-cols-4"><label className="form-control"><span className="field-label">سال شمسی</span><input className="input input-bordered" name="jalaliYear" type="number" min="1300" max="1600" value={payrollYear} onChange={(event) => setPayrollYear(Number(event.target.value))} /></label><label className="form-control"><span className="field-label">ماه شمسی</span><select className="select select-bordered" name="jalaliMonth" value={payrollMonth} onChange={(event) => setPayrollMonth(Number(event.target.value))}>{["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label><label className="form-control"><span className="field-label">عنوان دوره</span><input className="input input-bordered" name="title" placeholder="اختیاری" /></label><button className="btn btn-primary self-end rounded-xl">ساخت لیست حقوق</button></form>
        {!periods.length ? <div className="rounded-2xl border border-dashed border-base-300 p-10 text-center text-sm text-base-content/60">هنوز لیست حقوقی ساخته نشده است. سال و ماه را انتخاب و «ساخت لیست حقوق» را بزنید.</div> : periods.map((period) => {
          const rows = payroll.filter((row) => row.period.id === period.id);
          const grossTotal = rows.reduce((sum, row) => sum + row.entry.grossToman, 0);
          const netTotal = rows.reduce((sum, row) => sum + row.entry.netToman, 0);
          return <section key={period.id} className="overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-200 bg-base-200/30 p-4"><div><h4 className="font-extrabold">{period.title}</h4><div className="mt-1 text-xs text-base-content/60">{formatJalali(period.dateFrom)} تا {formatJalali(period.dateTo)} · {faNum(rows.length)} نفر</div></div><div className="flex flex-wrap items-center gap-2"><span className={`badge ${period.status === "paid" ? "badge-success" : period.status === "approved" ? "badge-info" : "badge-warning"}`}>{period.status === "paid" ? "پرداخت‌شده" : period.status === "approved" ? "تأییدشده" : "پیش‌نویس"}</span>{period.status === "draft" && <>{period.jalaliYear > 0 && <form action={generateJalaliPayroll}><input type="hidden" name="jalaliYear" value={period.jalaliYear} /><input type="hidden" name="jalaliMonth" value={period.jalaliMonth} /><input type="hidden" name="rebuild" value="on" /><button className="btn btn-sm btn-outline rounded-xl">بازسازی محاسبه</button></form>}<form action={approvePayrollPeriod}><input type="hidden" name="id" value={period.id} /><button className="btn btn-sm btn-primary rounded-xl">تأیید لیست</button></form></>}</div></div>
            <div className="grid gap-3 border-b border-base-200 p-4 sm:grid-cols-3"><div className="rounded-xl bg-base-200/50 p-3 text-xs">جمع ناخالص <b className="mt-1 block text-sm">{money(grossTotal)}</b></div><div className="rounded-xl bg-base-200/50 p-3 text-xs">خالص پرداختی <b className="mt-1 block text-sm">{money(netTotal)}</b></div><div className="rounded-xl bg-base-200/50 p-3 text-xs">افراد دارای ردیف حقوق <b className="mt-1 block text-sm">{faNum(rows.length)} نفر</b></div></div>
            <div className="overflow-x-auto"><table className="table table-zebra"><thead><tr><th>کارمند</th><th>کارکرد</th><th>اضافه‌کاری</th><th>بیمه</th><th>مالیات</th><th>خالص پرداختی</th><th>جزئیات</th></tr></thead><tbody>{rows.map((row) => <tr key={row.entry.id}><td className="font-bold">{row.staff.fullName}<div className="text-xs font-normal text-base-content/60">{row.staff.jobTitle || dutyLabel[row.staff.duty]}</div></td><td>{faNum(Math.round(row.entry.regularMinutes / 60))} ساعت</td><td>{faNum(Math.round(row.entry.overtimeMinutes / 60))} ساعت</td><td>{money(row.entry.employeeInsuranceToman)}</td><td>{money(row.entry.incomeTaxToman)}</td><td className="font-extrabold text-primary">{money(row.entry.netToman)}{row.entry.paymentStatus === "paid" && <span className="badge badge-success badge-sm ms-2">پرداخت شد</span>}</td><td><PayrollEditor row={row} /></td></tr>)}</tbody></table></div>
          </section>;
        })}
      </div>}
      {payrollTab === "extras" && <div className="space-y-4">
        <div className="grid gap-3 rounded-2xl border border-base-300 bg-base-100 p-4 md:grid-cols-2"><label className="form-control"><span className="field-label">سال شمسی</span><input className="input input-bordered" type="number" min="1300" max="1600" value={payrollYear} onChange={(event) => setPayrollYear(Number(event.target.value))} /></label><label className="form-control"><span className="field-label">ماه شمسی</span><select className="select select-bordered" value={payrollMonth} onChange={(event) => setPayrollMonth(Number(event.target.value))}>{["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label></div>
        <PayrollLeaveSection staff={staff} leaves={payrollLeaves} year={payrollYear} month={payrollMonth} /><LeaveSection staff={staff} requests={leaveRequests} /><AdjustmentSection staff={staff} adjustments={adjustments} year={payrollYear} month={payrollMonth} />
      </div>}
      {payrollTab === "policy" && <PayrollPolicySection policy={policy} />}
    </section>}
  </div>;
}
