import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import { ensureSeeded } from "@/lib/seed";
import { DEMO_PASSWORD, getDemoState } from "@/lib/demo";
import { getSettings } from "@/lib/data";
import { LoginForm } from "@/components/admin/login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "ورود مدیریت", robots: { index: false, follow: false } };

export default async function LoginPage() {
  await ensureSeeded();
  if (await getCurrentAdmin()) redirect("/admin");
  const [demo, s] = await Promise.all([getDemoState(), getSettings()]);
  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-brand-950 p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
      <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/70" />
      <div className="relative w-full max-w-md animate-fade-up">
        <div className="mb-6 text-center text-white">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 text-3xl font-black text-brand-950 shadow-xl">آ</span>
          <h1 className="mt-4 text-2xl font-black">پنل مدیریت {s.hotelName}</h1>
          <p className="mt-1 text-sm text-white/60">برای ادامه وارد حساب خود شوید</p>
        </div>
        <div className="card bg-base-100 shadow-2xl">
          <div className="card-body">
            <LoginForm demo={demo.showCredentials ? { email: demo.email, password: DEMO_PASSWORD } : null} />
            {demo.showCredentials && (
              <div role="alert" className="alert alert-warning alert-soft mt-3 justify-center text-xs">
                نسخه نمایشی — حساب آزمایشی: {demo.email} / {DEMO_PASSWORD}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
