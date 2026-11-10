"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, CreditCard, XCircle, Ban, RotateCcw, Trash2 } from "lucide-react";
import type { Reservation, ReservationStatus } from "@/db/schema";
import { setReservationStatus, deleteReservation, updateReservation, settleReservation } from "@/app/actions/admin";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { FormAlert, StatusBadge, SubmitButton, Toast } from "./ui";

export function ReservationActions({ r }: { r: Reservation }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState(r.status);
  const [code, setCode] = useState(r.reservationCode);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  const go = (s: ReservationStatus) =>
    start(async () => {
      setBusy(s);
      const prev = status;
      setStatus(s);
      const res = await setReservationStatus(r.id, s);
      setBusy(null);
      if (!res.ok) {
        setStatus(prev);
        setToast({ msg: res.error ?? "خطا", tone: "error" });
      } else {
        setCode(res.reservationCode ?? null);
        setToast({ msg: s === "confirmed" ? "رزرو قطعی شد و کد رزرو صادر گردید" : "وضعیت به‌روزرسانی شد", tone: "success" });
        router.refresh();
      }
    });

  const btn = (s: ReservationStatus, label: string, Icon: typeof BadgeCheck, cls: string) => (
    <button disabled={pending || status === s} onClick={() => go(s)} className={`btn btn-block justify-start ${cls}`}>
      {busy === s ? <span className="loading loading-spinner loading-sm" /> : <Icon className="h-4 w-4" />} {label}
    </button>
  );

  return (
    <div className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-900">وضعیت</h3>
        <StatusBadge status={status} />
      </div>
      {code && status === "confirmed" ? (
        <div className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-950 p-4 text-center text-white">
          <div className="text-xs text-white/70">کد رزرو صادر شده</div>
          <div className="mt-1 font-mono text-2xl font-black tracking-widest text-gold-300" dir="ltr">{code}</div>
        </div>
      ) : (
        <p role="alert" className="alert alert-warning alert-soft text-xs leading-6">
          تا زمان تایید و صدور کد رزرو، این رزرو قطعی نیست. پیش از تایید، پیش‌پرداخت را با مرجع تراکنش تطبیق دهید.
        </p>
      )}
      <div className="space-y-2">
        {btn("confirmed", "تایید پذیرش و صدور کد رزرو", BadgeCheck, "btn-success")}
        {btn("paid", "ثبت دستی پرداخت (منتظر تایید)", CreditCard, "btn-info btn-soft")}
        {btn("pending_payment", "بازگشت به انتظار پرداخت", RotateCcw, "btn-soft")}
        {btn("rejected", "رد درخواست", XCircle, "btn-warning btn-soft")}
        {btn("cancelled", "لغو رزرو", Ban, "btn-neutral btn-soft")}
      </div>
      {status === "confirmed" && r.totalPrice - r.depositAmount > 0 && (
        <button
          disabled={pending}
          onClick={() =>
            start(async () => {
              await settleReservation(r.id, !r.settledAt);
              setToast({ msg: r.settledAt ? "تسویه لغو شد" : "تسویه مانده ثبت و سند حسابداری صادر شد", tone: "success" });
              router.refresh();
            })
          }
          className={`btn btn-block justify-start ${r.settledAt ? "btn-ghost" : "btn-secondary"}`}
        >
          <Wallet className="h-4 w-4" /> {r.settledAt ? "لغو تسویه مانده" : "ثبت دریافت مانده هنگام پذیرش"}
        </button>
      )}
      <Link href={`/admin/accounting/journal?q=${r.trackingCode}`} className="btn btn-ghost btn-sm btn-block">مشاهده اسناد حسابداری</Link>
      <button
        onClick={() => {
          if (!confirm("رزرو به‌طور کامل حذف شود؟")) return;
          start(async () => {
            await deleteReservation(r.id);
            router.push("/admin/reservations");
          });
        }}
        className="btn btn-ghost btn-block text-error"
      >
        <Trash2 className="h-4 w-4" /> حذف رزرو
      </button>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

export function ReservationEditForm({ r }: { r: Reservation }) {
  const [state, action] = useActionState(updateReservation, null);
  return (
    <form action={action} className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
      <h3 className="font-extrabold text-slate-900">ویرایش اطلاعات</h3>
      <input type="hidden" name="id" value={r.id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="field-label">نام مهمان</label><input name="guestName" defaultValue={r.guestName} className="input w-full" /></div>
        <div><label className="field-label">موبایل</label><input name="phone" defaultValue={r.phone} dir="ltr" className="input w-full text-left" /></div>
        <div><label className="field-label">ایمیل</label><input name="email" defaultValue={r.email} dir="ltr" className="input w-full text-left" /></div>
        <div><label className="field-label">کد ملی</label><input name="nationalId" defaultValue={r.nationalId} dir="ltr" className="input w-full text-left" /></div>
        <div><label className="field-label">تعداد نفرات</label><input name="guests" type="number" min={1} defaultValue={r.guests} className="input w-full" /></div>
        <div><label className="field-label">مرجع پرداخت</label><input name="paymentRef" defaultValue={r.paymentRef} dir="ltr" className="input w-full text-left" /></div>
        <div><label className="field-label">مبلغ کل (تومان)</label><input name="totalPrice" type="number" defaultValue={r.totalPrice} className="input w-full" /></div>
        <div><label className="field-label">پیش‌پرداخت (تومان)</label><input name="depositAmount" type="number" defaultValue={r.depositAmount} className="input w-full" /></div>
      </div>
      <div><label className="field-label">یادداشت مدیر (برای رد/لغو به مهمان نمایش داده می‌شود)</label><textarea name="adminNote" rows={3} defaultValue={r.adminNote} className="textarea w-full" /></div>
      <FormAlert state={state} />
      <SubmitButton>ذخیره تغییرات</SubmitButton>
    </form>
  );
}
