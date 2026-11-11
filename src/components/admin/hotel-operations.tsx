"use client";

import { useState } from "react";
import Link from "next/link";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { faNum, formatJalali } from "@/lib/utils";
import { createManualTask, resendShiftTaskSms, updateHotelTask } from "@/app/actions/operations";
import type { hotelShiftAssignments, hotelShifts, hotelStaff, hotelTasks, StaffDuty } from "@/db/schema";

type Staff = typeof hotelStaff.$inferSelect;
type TaskRow = { task: typeof hotelTasks.$inferSelect; roomName: string | null; roomNumber: string | null; reservationGuest: string | null; staffName: string | null };
type CoverageRow = { duty: StaffDuty; crew: { assignment: typeof hotelShiftAssignments.$inferSelect; shift: typeof hotelShifts.$inferSelect; staff: Staff }[] };

const dutyLabel: Record<string, string> = { reception: "پذیرش", housekeeping: "خانه‌داری", maintenance: "تأسیسات", operations: "عملیات" };
const typeLabel: Record<string, string> = { reservation: "رزرو", checkin: "پذیرش مهمان", housekeeping: "خانه‌داری", guest_request: "درخواست مهمان", maintenance: "تأسیسات", manual: "کار دستی" };
const statusLabel: Record<string, string> = { open: "باز", in_progress: "در حال انجام", done: "انجام شد", cancelled: "لغو" };
const priorityLabel: Record<string, string> = { low: "کم", normal: "عادی", high: "زیاد", urgent: "فوری" };
const smsLabel: Record<string, string> = { sent: "ارسال شد", partial: "ارسال ناقص", failed: "خطا در ارسال", disabled: "پنل پیامک تنظیم نیست", no_phone: "شماره همراه ثبت نشده", no_shift: "برای این ساعت شیفتی تعریف نشده", no_operator: "اپراتور اصلی پذیرش مشخص نیست", pending: "در صف ارسال", manual: "ثبت دستی", "": "بدون پیامک" };

function ManualTaskForm({ staff, today }: { staff: Staff[]; today: string }) {
  const [date, setDate] = useState(today);
  return (
    <form action={createManualTask} className="grid gap-3 rounded-box border border-base-300 bg-base-100 p-4 md:grid-cols-5">
      <label className="form-control md:col-span-2"><span className="field-label">عنوان کار</span><input className="input" name="title" required maxLength={120} placeholder="مثلاً آماده‌سازی سالن جلسه" /></label>
      <label className="form-control"><span className="field-label">مسئول</span><select className="select" name="assignedStaffId" defaultValue=""><option value="">تعیین‌نشده</option>{staff.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.fullName} · {dutyLabel[s.duty]}</option>)}</select></label>
      <label className="form-control"><span className="field-label">اولویت</span><select className="select" name="priority" defaultValue="normal">{Object.entries(priorityLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      <JalaliDatePicker name="workDate" label="موعد انجام" value={date} onChange={setDate} />
      <label className="form-control md:col-span-4"><span className="field-label">شرح کار</span><input className="input" name="description" maxLength={1000} /></label>
      <button className="btn btn-primary self-end">ثبت کار</button>
    </form>
  );
}

export function HotelOperations({ tasks, staff, coverage, today }: { tasks: TaskRow[]; staff: Staff[]; coverage: CoverageRow[]; today: string }) {
  const open = tasks.filter(({ task }) => task.status === "open" || task.status === "in_progress");
  const unassigned = open.filter(({ task }) => !task.assignedStaffId);
  const overdue = open.filter(({ task }) => task.workDate < today);
  const uncovered = coverage.filter((row) => row.crew.length === 0 && (row.duty === "reception" || row.duty === "housekeeping"));
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[["کارهای باز", open.length, "text-primary"], ["بدون مسئول", unassigned.length, "text-error"], ["عقب‌افتاده", overdue.length, "text-warning"]].map(([label, count, tone]) => <div key={String(label)} className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><div className="text-xs text-base-content/60">{label}</div><div className={`text-3xl font-black ${tone}`}>{faNum(Number(count))}</div></div></div>)}
      </div>

      <section className="card card-border bg-base-100 shadow-sm">
        <div className="card-body gap-3 p-5">
          <div><h2 className="font-extrabold">پوشش شیفت فعال</h2><p className="text-xs text-base-content/60">ساعت بر اساس منطقه زمانی تهران بررسی می‌شود؛ شیفت‌های شبانه نیز پوشش داده می‌شوند.</p></div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{coverage.map(({ duty, crew }) => {
            const missingLead = duty === "reception" && crew.length > 0 && !crew.some((row) => row.assignment.isLead);
            return <div key={duty} className={`rounded-box border p-3 ${!crew.length ? "border-error/30 bg-error/5" : missingLead ? "border-warning/40 bg-warning/5" : "border-success/30 bg-success/5"}`}><div className="flex items-center justify-between"><b>{dutyLabel[duty]}</b><span className={`badge ${!crew.length ? "badge-error" : missingLead ? "badge-warning" : "badge-success"}`}>{!crew.length ? "بدون پوشش" : missingLead ? "بدون اپراتور اصلی" : `${faNum(crew.length)} نفر`}</span></div>{crew.length ? <ul className="mt-2 space-y-1 text-sm">{crew.map(({ assignment, shift, staff: person }) => <li key={assignment.id}>{person.fullName} · {shift.name}{assignment.isLead ? " (مسئول اصلی)" : ""}</li>)}</ul> : <Link href="/admin/staff#schedule" className="mt-2 inline-block text-xs underline">ثبت برنامه شیفت</Link>}{missingLead && <Link href="/admin/staff#schedule" className="mt-2 inline-block text-xs underline">تعیین اپراتور اصلی</Link>}</div>;
          })}</div>
          {uncovered.length > 0 && <p className="alert alert-warning py-2 text-sm">برای {uncovered.map((row) => dutyLabel[row.duty]).join("، ")} در حال حاضر نیروی شیفت ثبت نشده است. رزروها و کارها در این حالت بدون پیامک می‌مانند تا شیفت تعریف شود.</p>}
          {coverage.some((row) => row.duty === "reception" && row.crew.length > 0 && !row.crew.some((member) => member.assignment.isLead)) && <p className="alert alert-warning py-2 text-sm">اپراتور اصلی پذیرش برای شیفت فعال تعیین نشده است؛ تا زمان تعیین سرشیفت، اطلاعات رزرو به کسی ارسال نمی‌شود.</p>}
        </div>
      </section>

      <section className="space-y-3">
        <div><h2 className="text-lg font-extrabold">ثبت و هماهنگی کارها</h2><p className="text-sm text-base-content/60">رزروهای جدید، پذیرش مهمان و نیاز نظافت اتاق به‌صورت خودکار وارد این فهرست می‌شوند.</p></div>
        <ManualTaskForm staff={staff} today={today} />
        {!tasks.length ? <div className="rounded-box border border-dashed p-8 text-center text-sm text-base-content/60">هنوز کاری ثبت نشده است.</div> : <div className="space-y-3">{tasks.map(({ task, roomName, roomNumber, reservationGuest, staffName }) => (
          <article key={task.id} className={`rounded-box border bg-base-100 p-4 shadow-sm ${task.workDate < today && open.some((r) => r.task.id === task.id) ? "border-warning" : "border-base-300"}`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{task.title}</h3><span className="badge badge-ghost">{typeLabel[task.taskType]}</span><span className="badge badge-soft">{priorityLabel[task.priority]}</span><span className="badge badge-outline">{statusLabel[task.status]}</span></div><p className="mt-1 text-sm text-base-content/70">{task.description}</p><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-base-content/55"><span>موعد: {formatJalali(task.workDate, true)}</span>{task.duty && <span>بخش: {dutyLabel[task.duty]}</span>}{roomName && <span>اتاق {roomNumber || roomName} · {roomName}</span>}{reservationGuest && <span>مهمان: {reservationGuest}</span>}<span>پیامک: {smsLabel[task.smsStatus] ?? task.smsStatus}</span>{staffName && <span>مسئول فعلی: {staffName}</span>}{task.reservationId && <Link className="underline" href={`/admin/reservations/${task.reservationId}`}>مشاهده رزرو</Link>}{task.duty && task.taskType !== "manual" && task.status !== "done" && task.status !== "cancelled" && <form action={resendShiftTaskSms}><input type="hidden" name="id" value={task.id} /><button className="underline">ارسال دوباره پیامک</button></form>}</div></div>
              {task.status !== "done" && task.status !== "cancelled" && <form action={updateHotelTask} className="grid w-full gap-2 sm:w-auto sm:grid-cols-4"><input type="hidden" name="id" value={task.id} /><select className="select select-sm" name="status" defaultValue={task.status}>{Object.entries(statusLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><select className="select select-sm" name="priority" defaultValue={task.priority}>{Object.entries(priorityLabel).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select><select className="select select-sm" name="assignedStaffId" defaultValue={task.assignedStaffId ?? ""}><option value="">بدون مسئول</option>{staff.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}</select><button className="btn btn-sm btn-primary">به‌روزرسانی</button></form>}
            </div>
          </article>
        ))}</div>}
      </section>
    </div>
  );
}
