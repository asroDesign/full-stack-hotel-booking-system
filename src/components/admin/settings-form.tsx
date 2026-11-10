"use client";

import { useActionState, useState } from "react";
import type { SiteSettings } from "@/lib/data";
import { saveSettings, changePassword } from "@/app/actions/admin";
import { FormAlert, SubmitButton } from "./ui";
import { MapView } from "@/components/map-view";

const F = ({ name, label, s, ltr, area }: { name: keyof SiteSettings; label: string; s: SiteSettings; ltr?: boolean; area?: boolean }) => (
  <div className={area ? "sm:col-span-2" : ""}>
    <label className="field-label">{label}</label>
    {area ? (
      <textarea name={name} defaultValue={s[name]} rows={5} className="textarea w-full" />
    ) : (
      <input name={name} defaultValue={s[name]} dir={ltr ? "ltr" : undefined} className={`input w-full ${ltr ? "text-left" : ""}`} />
    )}
  </div>
);

export function SettingsForm({ s }: { s: SiteSettings }) {
  const [state, action] = useActionState(saveSettings, null);
  const [lat, setLat] = useState(s.lat);
  const [lng, setLng] = useState(s.lng);
  return (
    <form action={action} className="space-y-6">
      <section className="card card-border bg-base-100 shadow-sm p-5 block">
        <h3 className="mb-4 font-extrabold text-slate-900">اطلاعات هتل</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <F name="hotelName" label="نام هتل" s={s} />
          <F name="hotelNameEn" label="نام لاتین" s={s} ltr />
          <F name="tagline" label="شعار" s={s} />
          <div className="grid grid-cols-2 gap-3">
            <F name="stars" label="ستاره" s={s} />
            <F name="foundedYear" label="سال تأسیس" s={s} />
          </div>
          <F name="checkInTime" label="ساعت ورود" s={s} ltr />
          <F name="checkOutTime" label="ساعت خروج" s={s} ltr />
          <F name="aboutTitle" label="عنوان درباره ما" s={s} />
          <div />
          <F name="aboutText" label="متن درباره ما" s={s} area />
        </div>
      </section>
      <section className="card card-border bg-base-100 shadow-sm p-5 block">
        <h3 className="mb-4 font-extrabold text-slate-900">تماس و شبکه‌های اجتماعی</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <F name="phone" label="تلفن ثابت" s={s} ltr />
          <F name="mobile" label="موبایل" s={s} ltr />
          <F name="email" label="ایمیل" s={s} ltr />
          <F name="instagram" label="اینستاگرام" s={s} ltr />
          <F name="telegram" label="تلگرام" s={s} ltr />
          <F name="whatsapp" label="واتس‌اپ (با کد کشور)" s={s} ltr />
          <F name="address" label="آدرس" s={s} area />
        </div>
      </section>
      <section className="card card-border bg-base-100 shadow-sm p-5 block">
        <h3 className="mb-4 font-extrabold text-slate-900">پرداخت پیش‌پرداخت</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <F name="depositPercent" label="درصد پیش‌پرداخت" s={s} ltr />
          <F name="bankName" label="نام بانک" s={s} />
          <F name="cardNumber" label="شماره کارت" s={s} ltr />
          <F name="cardHolder" label="صاحب حساب" s={s} />
        </div>
      </section>
      <section className="card card-border bg-base-100 shadow-sm p-5 block">
        <h3 className="mb-4 font-extrabold text-slate-900">موقعیت مکانی روی نقشه</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="field-label">عرض جغرافیایی (lat)</label><input name="lat" value={lat} onChange={(e) => setLat(e.target.value)} dir="ltr" className="input w-full text-left" /></div>
          <div><label className="field-label">طول جغرافیایی (lng)</label><input name="lng" value={lng} onChange={(e) => setLng(e.target.value)} dir="ltr" className="input w-full text-left" /></div>
        </div>
        {Number(lat) && Number(lng) ? (
          <MapView center={{ lat: Number(lat), lng: Number(lng) }} zoom={14} className="mt-4 h-64" markers={[{ lat: Number(lat), lng: Number(lng), title: s.hotelName, kind: "hotel" }]} />
        ) : null}
      </section>
      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        <SubmitButton className="btn btn-primary px-8">ذخیره تنظیمات</SubmitButton>
        <div className="flex-1"><FormAlert state={state} /></div>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, null);
  return (
    <form action={action} className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
      <h3 className="font-extrabold text-slate-900">تغییر رمز عبور</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="field-label">رمز فعلی</label><input name="current" type="password" dir="ltr" className="input w-full text-left" required /></div>
        <div><label className="field-label">رمز جدید</label><input name="next" type="password" dir="ltr" className="input w-full text-left" required minLength={6} /></div>
      </div>
      <FormAlert state={state} />
      <SubmitButton>تغییر رمز</SubmitButton>
    </form>
  );
}
