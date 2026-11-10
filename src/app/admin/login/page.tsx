import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import LoginForm from "@/components/admin/LoginForm";
import { getCurrentAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ورود به پنل مدیریت",
  robots: { index: false },
};

export default async function AdminLoginPage() {
  const admin = await getCurrentAdmin();
  if (admin) redirect("/admin");
  const settings = await getSettings();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-forest-950 lg:block">
        <img
          src="https://images.pexels.com/photos/14002992/pexels-photo-14002992.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=1600"
          alt="هتل کاج"
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/70 to-forest-950/40" />
        <div className="relative z-10 flex h-full flex-col justify-between p-10 text-white">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl">🏨</span>
            <div>
              <p className="text-lg font-extrabold">{settings.hotelName}</p>
              <p className="text-[11px] text-gold-300">پنل مدیریت پذیرش</p>
            </div>
          </Link>
          <div className="space-y-4">
            <h1 className="max-w-md text-3xl font-black leading-snug">مدیریت اتاق‌ها، رزروها و مهمانان در یک داشبورد</h1>
            <p className="max-w-md text-xs leading-7 text-cream-200/70">
              درخواست‌های رزرو را بررسی کنید، پیش‌پرداخت‌ها را تأیید نمایید و پس از پذیرش، کد رزرو را برای مهمان صادر
              کنید. وضعیت اتاق‌ها و پیام‌های مهمانان همیشه در دسترس است.
            </p>
            <div className="grid max-w-md grid-cols-3 gap-2">
              {[
                { label: "اتاق", value: "۱۶" },
                { label: "وضعیت رزرو", value: "۵" },
                { label: "بخش مدیریت", value: "۷" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center backdrop-blur">
                  <p className="text-lg font-black text-gold-300">{item.value}</p>
                  <p className="text-[10px] text-cream-200/60">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-cream-200/40">© {new Date().getFullYear()} {settings.hotelName} — پنل مدیریت</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-cream-50 px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-900 text-lg text-gold-300">🏨</span>
              <div>
                <p className="text-base font-extrabold text-forest-950">{settings.hotelName}</p>
                <p className="text-[10px] text-gold-600">پنل مدیریت پذیرش</p>
              </div>
            </Link>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-2xl font-black text-forest-950">خوش آمدید</h2>
            <p className="text-xs leading-6 text-forest-800/60">
              برای مدیریت رزروها و محتوای سایت، وارد حساب مدیریت شوید.
            </p>
          </div>
          <LoginForm />
          <Link href="/" className="flex items-center justify-center gap-1 text-[11px] font-semibold text-forest-800/60 transition hover:text-forest-950">
            <span aria-hidden="true">→</span>
            بازگشت به سایت هتل
          </Link>
        </div>
      </div>
    </div>
  );
}
