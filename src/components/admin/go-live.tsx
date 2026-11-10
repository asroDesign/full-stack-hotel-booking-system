"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, AlertTriangle, ShieldCheck, UserCog, Eraser, Rocket, ExternalLink } from "lucide-react";
import { cleanupDemoData, setDemoMode, updateAdminProfile } from "@/app/actions/admin";
import type { DemoCategory } from "@/lib/demo";
import { FormAlert, SubmitButton, Toast } from "./ui";
import { cn, faNum } from "@/lib/utils";

export type CheckItem = { key: string; title: string; desc: string; ok: boolean; href?: string; action?: string; critical?: boolean };

export function GoLiveChecklist({ items }: { items: CheckItem[] }) {
  const done = items.filter((i) => i.ok).length;
  const pct = Math.round((done / items.length) * 100);
  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-extrabold"><Rocket className="h-5 w-5 text-primary" /> چک‌لیست راه‌اندازی</h3>
          <span className={cn("badge", pct === 100 ? "badge-success" : "badge-warning")}>{faNum(done)} از {faNum(items.length)} انجام شده</span>
        </div>
        <progress className={cn("progress w-full", pct === 100 ? "progress-success" : "progress-warning")} value={pct} max={100} />
        <ul className="divide-y divide-base-200">
          {items.map((i) => (
            <li key={i.key} className="flex items-start gap-3 py-3">
              {i.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", i.critical ? "text-error" : "text-warning")} />}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 font-semibold">
                  {i.title}
                  {!i.ok && i.critical && <span className="badge badge-error badge-sm">ضروری</span>}
                </div>
                <p className="text-xs leading-6 text-base-content/60">{i.desc}</p>
              </div>
              {!i.ok && i.href && (
                <Link href={i.href} className="btn btn-sm btn-soft shrink-0">{i.action ?? "انجام"}</Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AdminProfileForm({ name, email, usesDefault }: { name: string; email: string; usesDefault: boolean }) {
  const [state, action] = useActionState(updateAdminProfile, null);
  return (
    <form id="account" action={action} className="card card-border scroll-mt-6 bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <h3 className="flex items-center gap-2 font-extrabold"><UserCog className="h-5 w-5 text-primary" /> حساب مدیر</h3>
        {usesDefault && (
          <div role="alert" className="alert alert-error alert-soft text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>شما هنوز از رمز عمومی نسخه نمایشی استفاده می‌کنید. هر کسی می‌تواند وارد پنل شود؛ فوراً ایمیل و رمز را تغییر دهید.</span>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">نام نمایشی</label><input name="name" defaultValue={name} className="input w-full" required /></div>
          <div><label className="field-label">ایمیل ورود</label><input name="email" type="email" defaultValue={email} dir="ltr" className="input w-full text-left" required autoComplete="username" /></div>
          <div><label className="field-label">رمز جدید (حداقل ۸ کاراکتر، حرف و عدد)</label><input name="next" type="password" dir="ltr" className="input w-full text-left" autoComplete="new-password" placeholder="خالی = بدون تغییر" /></div>
          <div><label className="field-label">تکرار رمز جدید</label><input name="confirm" type="password" dir="ltr" className="input w-full text-left" autoComplete="new-password" /></div>
        </div>
        <div className="rounded-box bg-base-200/60 p-3">
          <label className="field-label">رمز عبور فعلی (برای تأیید)</label>
          <input name="current" type="password" dir="ltr" className="input w-full text-left" required autoComplete="current-password" />
        </div>
        <FormAlert state={state} />
        <SubmitButton className="btn btn-primary">ذخیره حساب</SubmitButton>
        <p className="text-xs text-base-content/50">با تغییر رمز، همه نشست‌های دیگر (دستگاه‌های دیگر) خارج می‌شوند.</p>
      </div>
    </form>
  );
}

export function DemoModeCard({ enabled, forced, showCredentials }: { enabled: boolean; forced: boolean; showCredentials: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <h3 className="flex items-center gap-2 font-extrabold"><ShieldCheck className="h-5 w-5 text-primary" /> حالت نمایشی (دمو)</h3>
        <div className={cn("rounded-box p-4 text-sm", enabled ? "bg-warning/10" : "bg-success/10")}>
          <div className="font-bold">{enabled ? "سایت در حالت نمایشی است" : "سایت در حالت واقعی (Production) است"}</div>
          <p className="mt-1 text-xs leading-6 text-base-content/70">
            {enabled
              ? showCredentials
                ? "اطلاعات ورود آزمایشی در صفحه ورود نمایش داده می‌شود."
                : "اطلاعات ورود نمایش داده نمی‌شود، چون رمز پیش‌فرض تغییر کرده است."
              : "اطلاعات ورود آزمایشی در صفحه ورود نمایش داده نمی‌شود و فیلدها خالی هستند."}
          </p>
        </div>
        {forced ? (
          <p className="text-xs text-base-content/60">این وضعیت با متغیر محیطی <code dir="ltr">DEMO_MODE</code> روی سرور تعیین شده و از پنل قابل تغییر نیست.</p>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => start(async () => { const r = await setDemoMode(!enabled); setToast({ msg: r.message, tone: "success" }); router.refresh(); })}
            className={cn("btn btn-block", enabled ? "btn-success" : "btn-ghost border-base-300")}
          >
            {pending && <span className="loading loading-spinner loading-sm" />}
            {enabled ? "خروج از حالت نمایشی" : "فعال‌سازی مجدد حالت نمایشی"}
          </button>
        )}
        <Link href="/admin/login" target="_blank" className="btn btn-ghost btn-sm"><ExternalLink className="h-4 w-4" /> مشاهده صفحه ورود (در پنجره خصوصی)</Link>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

const CATS: { key: DemoCategory; title: string; desc: string }[] = [
  { key: "reservations", title: "رزروهای نمایشی", desc: "رزروهای نمونه و اسناد حسابداری خودکار آن‌ها" },
  { key: "vouchers", title: "اسناد مالی نمونه", desc: "سرمایه اولیه، حقوق، قبوض و … که برای نمایش ثبت شده‌اند" },
  { key: "messages", title: "پیام‌های نمونه", desc: "پیام‌های تماس نمایشی" },
  { key: "testimonials", title: "نظرات نمونه مهمانان", desc: "نظرات ساختگی صفحه اصلی" },
  { key: "dining", title: "رستوران و کافه نمونه", desc: "رستوران‌ها، کافه‌ها و منوهای نمونه (اگر ویرایش کرده‌اید، تیک نزنید)" },
  { key: "extras", title: "پیشنهادها، سوالات متداول و گالری نمونه", desc: "کدهای تخفیف، پرسش‌ها و تصاویر نمونه (اگر ویرایش کرده‌اید، تیک نزنید)" },
  { key: "crm", title: "داده‌های نمونه باشگاه و عملیات", desc: "مشتریان، کمپین‌ها، کارت‌های هدیه، رزرو میز، درخواست مهمانان و همکاران نمونه" },
  { key: "smsLogs", title: "گزارش پیامک‌ها", desc: "همه گزارش‌های ارسال پیامک (شامل تست‌ها)" },
];

export function DemoCleanupCard({ counts }: { counts: Record<DemoCategory, number> }) {
  const router = useRouter();
  const [sel, setSel] = useState<DemoCategory[]>(CATS.filter((c) => !["smsLogs", "dining", "extras"].includes(c.key) && counts[c.key] > 0).map((c) => c.key));
  const [confirmText, setConfirmText] = useState("");
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const total = CATS.reduce((s, c) => s + (c.key === "smsLogs" ? 0 : counts[c.key]), 0);
  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <h3 className="flex items-center gap-2 font-extrabold"><Eraser className="h-5 w-5 text-error" /> پاکسازی داده‌های نمایشی</h3>
        <p className="text-xs leading-6 text-base-content/60">
          فقط رکوردهایی حذف می‌شوند که دقیقاً با داده‌های نمونه نصب اولیه مطابقت دارند. رزروها، اسناد و پیام‌های واقعی، و همچنین اتاق‌ها، خدمات، تصاویر و تنظیمات دست نمی‌خورند.
        </p>
        {total === 0 && counts.smsLogs === 0 ? (
          <div role="alert" className="alert alert-success alert-soft text-sm"><CheckCircle2 className="h-4 w-4" /> داده نمایشی باقی نمانده است.</div>
        ) : (
          <>
            <div className="space-y-2">
              {CATS.map((c) => (
                <label key={c.key} className={cn("flex cursor-pointer items-center gap-3 rounded-box border px-3 py-2.5", counts[c.key] === 0 ? "opacity-50" : "border-base-300")}>
                  <input
                    type="checkbox"
                    className="checkbox checkbox-error checkbox-sm"
                    disabled={counts[c.key] === 0}
                    checked={sel.includes(c.key)}
                    onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.key] : s.filter((x) => x !== c.key)))}
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium">{c.title}</span>
                    <span className="block text-xs text-base-content/50">{c.desc}</span>
                  </span>
                  <span className="badge badge-ghost">{faNum(counts[c.key])}</span>
                </label>
              ))}
            </div>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="input w-full" placeholder="برای تأیید، کلمه «حذف» را تایپ کنید" />
            <button
              type="button"
              disabled={pending || !sel.length || confirmText.trim() !== "حذف"}
              onClick={() => start(async () => { const r = await cleanupDemoData(sel, confirmText); setToast({ msg: r.message, tone: r.ok ? "success" : "error" }); if (r.ok) { setConfirmText(""); router.refresh(); } })}
              className="btn btn-error btn-block"
            >
              {pending && <span className="loading loading-spinner loading-sm" />} حذف موارد انتخاب‌شده
            </button>
          </>
        )}
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}
