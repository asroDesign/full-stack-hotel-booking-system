"use client";

import { useActionState, useState, useTransition } from "react";
import { Send, KeyRound, BellRing, FileCode2 } from "lucide-react";
import { saveSettings, sendTestSms } from "@/app/actions/admin";
import { FormAlert, SubmitButton, Toast } from "./ui";
import { cn, faNum, relativeTime } from "@/lib/utils";

type SmsSettings = {
  smsProvider: string;
  smsApiKeyMasked: string;
  smsAdminMobiles: string;
  smsNotifyAdminOnRequest: string;
  smsNotifyAdminOnPaid: string;
  smsNotifyGuestOnRequest: string;
  smsTplAdminReservation: string;
  smsTplGuestRequest: string;
  smsTplGuestConfirmed: string;
  smsTplGuestRejected: string;
  smsLineNumber: string;
  smsOptOutSuffix: string;
};
type Log = { id: number; receptor: string; event: string; provider: string; status: string; response: string; createdAt: string };

const TEMPLATES: { key: keyof SmsSettings; title: string; when: string; smsir: string; sample: string }[] = [
  { key: "smsTplAdminReservation", title: "اطلاع رزرو جدید به مدیر", when: "ثبت درخواست / پرداخت پیش‌پرداخت", smsir: "#NAME# #ITEM# #DATE# #TRACKING# #PHONE#", sample: "رزرو جدید: %token10% - %token20% - ورود %token2% - کد پیگیری %token% - موبایل %token3%" },
  { key: "smsTplGuestRequest", title: "ثبت درخواست (مهمان)", when: "بلافاصله پس از ثبت درخواست", smsir: "#NAME# #TRACKING#", sample: "%token10% عزیز، درخواست رزرو شما با کد پیگیری %token% ثبت شد. لطفاً پیش‌پرداخت را انجام دهید." },
  { key: "smsTplGuestConfirmed", title: "تایید رزرو و ارسال کد رزرو", when: "تایید پذیرش توسط مدیر", smsir: "#NAME# #CODE# #ITEM# #DATE#", sample: "%token10% عزیز، رزرو %token20% برای تاریخ %token2% قطعی شد. کد رزرو: %token%" },
  { key: "smsTplGuestRejected", title: "رد درخواست رزرو", when: "رد درخواست توسط مدیر", smsir: "#NAME# #TRACKING#", sample: "%token10% عزیز، متأسفانه درخواست رزرو %token% تایید نشد. پیش‌پرداخت شما عودت داده می‌شود." },
];

const statusBadge: Record<string, string> = { sent: "badge-success", failed: "badge-error", disabled: "badge-ghost" };
const statusText: Record<string, string> = { sent: "ارسال شد", failed: "ناموفق", disabled: "غیرفعال" };

export function SmsSettingsForm({ s, logs, eventLabels }: { s: SmsSettings; logs: Log[]; eventLabels: Record<string, string> }) {
  const [state, action] = useActionState(saveSettings, null);
  const [provider, setProvider] = useState(s.smsProvider);
  const [flags, setFlags] = useState({
    smsNotifyAdminOnRequest: s.smsNotifyAdminOnRequest === "1",
    smsNotifyAdminOnPaid: s.smsNotifyAdminOnPaid === "1",
    smsNotifyGuestOnRequest: s.smsNotifyGuestOnRequest === "1",
  });
  const [testTo, setTestTo] = useState("");
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <form action={action} className="space-y-5">
        <input type="hidden" name="smsProvider" value={provider} />
        {Object.entries(flags).map(([k, v]) => <input key={k} type="hidden" name={k} value={v ? "1" : "0"} />)}

        <section className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-4 p-5">
            <h3 className="flex items-center gap-2 font-extrabold"><KeyRound className="h-5 w-5 text-primary" /> سرویس‌دهنده پیامک</h3>
            <div className="grid grid-cols-3 gap-2">
              {[["none", "غیرفعال"], ["kavenegar", "کاوه‌نگار"], ["smsir", "sms.ir"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setProvider(v)} className={cn("btn h-14", provider === v ? "btn-primary" : "btn-outline border-base-300")}>{l}</button>
              ))}
            </div>
            {provider !== "none" && (
              <>
                <div>
                  <label className="field-label">{provider === "kavenegar" ? "API Key کاوه‌نگار" : "کلید API (x-api-key) پنل sms.ir"}</label>
                  <input name="smsApiKey" type="password" autoComplete="off" dir="ltr" placeholder={s.smsApiKeyMasked || "کلید را وارد کنید"} className="input w-full text-left font-mono" />
                  <p className="mt-1 text-xs text-base-content/50">{s.smsApiKeyMasked ? "کلید ذخیره شده است؛ برای تغییر، کلید جدید را وارد کنید." : "کلید فقط در سرور نگهداری می‌شود."}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="field-label">شماره خط ارسال (برای کمپین‌ها و پیامک‌های متنی)</label>
                    <input name="smsLineNumber" defaultValue={s.smsLineNumber} dir="ltr" className="input w-full text-left" placeholder="3000xxxx" />
                  </div>
                  <div>
                    <label className="field-label">عبارت لغو پیامک تبلیغاتی</label>
                    <input name="smsOptOutSuffix" defaultValue={s.smsOptOutSuffix} className="input w-full" placeholder="لغو۱۱" />
                  </div>
                </div>
                <div>
                  <label className="field-label">شماره موبایل مدیر (برای اطلاع رزروها)</label>
                  <input name="smsAdminMobiles" defaultValue={s.smsAdminMobiles} dir="ltr" className="input w-full text-left" placeholder="09121234567, 09141234567" />
                  <p className="mt-1 text-xs text-base-content/50">چند شماره را با کاما جدا کنید (حداکثر ۵).</p>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-3 p-5">
            <h3 className="flex items-center gap-2 font-extrabold"><BellRing className="h-5 w-5 text-secondary" /> رویدادها</h3>
            {([
              ["smsNotifyAdminOnPaid", "پیامک به مدیر هنگام پرداخت پیش‌پرداخت (رزرو نیازمند تایید)"],
              ["smsNotifyAdminOnRequest", "پیامک به مدیر هنگام ثبت هر درخواست رزرو"],
              ["smsNotifyGuestOnRequest", "پیامک کد پیگیری به مهمان پس از ثبت درخواست"],
            ] as const).map(([k, l]) => (
              <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-box bg-base-200/60 px-4 py-3 text-sm">
                {l}
                <input type="checkbox" className="toggle toggle-primary" checked={flags[k]} onChange={(e) => setFlags((f) => ({ ...f, [k]: e.target.checked }))} />
              </label>
            ))}
            <div className="flex items-center justify-between gap-3 rounded-box bg-success/10 px-4 py-3 text-sm">
              تایید رزرو (ارسال کد رزرو) و رد درخواست به مهمان
              <span className="badge badge-success">همیشه فعال</span>
            </div>
          </div>
        </section>

        <section className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-4 p-5">
            <h3 className="flex items-center gap-2 font-extrabold"><FileCode2 className="h-5 w-5 text-accent" /> قالب‌های پیامک (ارسال با پترن)</h3>
            <p className="text-xs leading-6 text-base-content/60">
              {provider === "smsir"
                ? "در پنل sms.ir برای هر رویداد یک قالب بسازید و «شناسه قالب» (عدد) را وارد کنید. نام پارامترهای قالب باید دقیقاً مطابق موارد زیر باشد."
                : "در پنل کاوه‌نگار برای هر رویداد یک «قالب اعتبارسنجی» بسازید و نام قالب را وارد کنید. متغیرها: %token% کد، %token2% تاریخ، %token3% موبایل، %token10% نام مهمان، %token20% نام اتاق/خدمت."}
            </p>
            {TEMPLATES.map((t) => (
              <div key={t.key} className="rounded-box border border-base-300 p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold">{t.title}</span>
                  <span className="text-xs text-base-content/50">{t.when}</span>
                </div>
                <input name={t.key} defaultValue={s[t.key]} dir="ltr" className="input input-sm w-full text-left font-mono" placeholder={provider === "smsir" ? "مثلاً 123456" : "مثلاً atalar-confirm"} />
                <div className="mt-2 rounded-field bg-base-200 p-2 text-[11px] leading-5 text-base-content/70" dir={provider === "smsir" ? "ltr" : "rtl"}>
                  {provider === "smsir" ? <>پارامترها: <code>{t.smsir}</code></> : <>نمونه متن: {t.sample}</>}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-box bg-base-100/90 p-3 shadow-lg ring-1 ring-base-300 backdrop-blur">
          <SubmitButton className="btn btn-primary px-8">ذخیره تنظیمات پیامک</SubmitButton>
          <div className="flex-1"><FormAlert state={state} /></div>
        </div>
      </form>

      <div className="space-y-5">
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-3 p-5">
            <h3 className="font-extrabold">ارسال پیامک آزمایشی</h3>
            <p className="text-xs text-base-content/60">با قالب «تایید رزرو» ارسال می‌شود. ابتدا تنظیمات را ذخیره کنید.</p>
            <div className="join w-full">
              <input value={testTo} onChange={(e) => setTestTo(e.target.value)} dir="ltr" className="input join-item w-full text-left" placeholder="09121234567" />
              <button
                type="button"
                disabled={pending || !testTo}
                onClick={() => start(async () => { const r = await sendTestSms(testTo); setToast({ msg: r.message, tone: r.ok ? "success" : "error" }); })}
                className="btn btn-secondary join-item"
              >
                {pending ? <span className="loading loading-spinner loading-sm" /> : <Send className="h-4 w-4" />} ارسال
              </button>
            </div>
          </div>
        </div>
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-3 p-5">
            <h3 className="font-extrabold">گزارش آخرین پیامک‌ها</h3>
            {logs.length === 0 ? (
              <p className="py-6 text-center text-sm text-base-content/50">هنوز پیامکی ارسال نشده است.</p>
            ) : (
              <ul className="max-h-[560px] divide-y divide-base-200 overflow-y-auto">
                {logs.map((l) => (
                  <li key={l.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{eventLabels[l.event] ?? l.event}</span>
                      <span className={cn("badge badge-sm badge-soft", statusBadge[l.status] ?? "badge-ghost")}>{statusText[l.status] ?? l.status}</span>
                    </div>
                    <div className="mt-0.5 flex justify-between text-xs text-base-content/50">
                      <span dir="ltr">{faNum(l.receptor)} · {l.provider}</span>
                      <span>{relativeTime(l.createdAt)}</span>
                    </div>
                    {l.status !== "sent" && l.response && <div className="mt-1 truncate text-[11px] text-error/80" dir="auto" title={l.response}>{l.response}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}
