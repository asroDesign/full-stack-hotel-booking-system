"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/actions/admin";
import { FormAlert, SubmitButton } from "./ui";

type F = { key: string; label: string; hint?: string; type?: "text" | "number" | "area" | "toggle"; ltr?: boolean };
const SECTIONS: { title: string; fields: F[] }[] = [
  {
    title: "سطوح عضویت و امتیاز",
    fields: [
      { key: "clubEnabled", label: "باشگاه مشتریان فعال است", type: "toggle" },
      { key: "tierSilver", label: "حد نصاب سطح نقره‌ای (مجموع خرید، تومان)", type: "number" },
      { key: "tierGold", label: "حد نصاب سطح طلایی (تومان)", type: "number" },
      { key: "tierPlatinum", label: "حد نصاب سطح پلاتینیوم (تومان)", type: "number" },
      { key: "pointsPer", label: "هر چند تومان خرید = ۱ امتیاز", type: "number" },
    ],
  },
  {
    title: "کد تخفیف ویژه روز تولد",
    fields: [
      { key: "birthdayEnabled", label: "ارسال خودکار تبریک و کد تخفیف تولد", type: "toggle" },
      { key: "birthdayPercent", label: "درصد تخفیف", type: "number" },
      { key: "birthdayValidDays", label: "اعتبار کد (روز)", type: "number" },
      { key: "birthdayDaysBefore", label: "چند روز قبل از تولد ارسال شود", type: "number" },
      { key: "birthdayMessage", label: "متن پیامک", type: "area", hint: "متغیرها: {name} {percent} {code} {expires} {hotel}" },
    ],
  },
  {
    title: "دعوت به ثبت نظر پس از اقامت",
    fields: [
      { key: "reviewInviteEnabled", label: "ارسال خودکار پیامک دعوت به ثبت نظر پس از تخلیه", type: "toggle" },
      { key: "reviewInviteMessage", label: "متن پیامک", type: "area", hint: "متغیرها: {name} {hotel} {link}" },
      { key: "siteUrl", label: "آدرس سایت (برای لینک‌ها)", ltr: true, hint: "مثلاً https://espinashotel.ir" },
    ],
  },
  {
    title: "کارت هدیه",
    fields: [
      { key: "giftCardAmounts", label: "مبالغ پیشنهادی (تومان، با کاما)", ltr: true },
      { key: "giftCardMin", label: "حداقل مبلغ دلخواه (تومان)", type: "number" },
      { key: "giftCardValidMonths", label: "اعتبار (ماه)", type: "number" },
    ],
  },
  {
    title: "پرتال مهمانان ساکن و رستوران",
    fields: [
      { key: "stayPortalEnabled", label: "پرتال مهمانان ساکن فعال است", type: "toggle" },
      { key: "wifiName", label: "نام شبکه Wi-Fi", ltr: true },
      { key: "wifiPassword", label: "رمز Wi-Fi", ltr: true },
      { key: "receptionExt", label: "شماره داخلی پذیرش", ltr: true },
      { key: "tableSmsOnConfirm", label: "پیامک تایید رزرو میز به مهمان", type: "toggle" },
    ],
  },
];

export function ClubSettingsForm({ s }: { s: Record<string, string> }) {
  const [state, action] = useActionState(saveSettings, null);
  return (
    <form action={action} className="space-y-6 pb-20">
      <div className="grid gap-6 xl:grid-cols-2">
        {SECTIONS.map((sec) => (
          <section key={sec.title} className="card card-border bg-base-100 shadow-sm">
            <div className="card-body gap-3 p-5">
              <h3 className="font-extrabold">{sec.title}</h3>
              {sec.fields.map((f) =>
                f.type === "toggle" ? (
                  <label key={f.key} className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-4 py-2.5 text-sm">
                    {f.label}
                    <input type="hidden" name={f.key} value="0" />
                    <input type="checkbox" name={f.key} value="1" defaultChecked={s[f.key] === "1"} className="toggle toggle-primary toggle-sm" />
                  </label>
                ) : (
                  <div key={f.key}>
                    <label className="field-label">{f.label}</label>
                    {f.type === "area" ? (
                      <textarea name={f.key} defaultValue={s[f.key]} rows={3} className="textarea w-full" />
                    ) : (
                      <input name={f.key} defaultValue={s[f.key]} type={f.type === "number" ? "number" : "text"} dir={f.ltr || f.type === "number" ? "ltr" : undefined} className="input w-full text-left" />
                    )}
                    {f.hint && <p className="mt-1 text-xs text-base-content/50">{f.hint}</p>}
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
      <div className="sticky bottom-4 z-10 flex items-center gap-3 rounded-box bg-base-100/90 p-3 shadow-lg ring-1 ring-base-300 backdrop-blur">
        <SubmitButton className="btn btn-primary px-8">ذخیره تنظیمات باشگاه</SubmitButton>
        <div className="flex-1"><FormAlert state={state} /></div>
      </div>
    </form>
  );
}
