import type { Metadata } from "next";
import Link from "next/link";
import TrackForm from "@/components/booking/TrackForm";
import { PageHero } from "@/components/site/ui";
import { getSettings } from "@/lib/data";
import { BOOKING_STEPS } from "@/lib/page-content";
import { phoneHref } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "پیگیری رزرو",
  description: "وضعیت درخواست رزرو و کد رزرو خود را با کد پیگیری بررسی کنید.",
};

export default async function TrackPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHero
        kicker="پیگیری رزرو"
        title="وضعیت رزرو و کد رزرو شما"
        description="با کد پیگیری (TRK-…) یا کد رزرو (ATL-…) وضعیت پرداخت و تأیید درخواست خود را ببینید."
        image={settings.aboutImage}
      />
      <section className="container-x py-12">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div className="panel space-y-4 p-6">
            <h2 className="text-base font-extrabold text-forest-950">ورود به صفحه پیگیری</h2>
            <TrackForm />
            <div className="rounded-xl bg-cream-100 p-3 text-[11px] leading-6 text-forest-800/70">
              کد پیگیری در پایان ثبت درخواست به شما نمایش داده می‌شود. کد رزرو پس از تأیید پذیرش پیامک می‌گردد.
            </div>
            <div className="border-t border-cream-200 pt-3 text-[11px] text-forest-800/60">
              کد خود را ندارید؟ با پذیرش تماس بگیرید:{" "}
              <a href={phoneHref(settings.phone)} dir="ltr" className="font-bold text-forest-900">
                {settings.phone}
              </a>
            </div>
          </div>

          <div className="space-y-3">
            {BOOKING_STEPS.map((step, index) => (
              <div key={step.title} className="glass flex gap-3 rounded-2xl p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-lg">{step.icon}</span>
                <div>
                  <p className="text-xs font-extrabold text-forest-950">
                    {step.title}
                    <span className="mr-2 text-[10px] font-medium text-forest-800/40">مرحله {index + 1}</span>
                  </p>
                  <p className="mt-1 text-[11px] leading-6 text-forest-800/60">{step.description}</p>
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 text-[11px] leading-6 text-gold-700">
              <p className="font-bold">بدون کد رزرو، رزرو قطعی نیست</p>
              <p className="mt-1">
                صرف ثبت درخواست یا پرداخت پیش‌پرداخت، به معنای قطعی شدن رزرو نیست. تنها پس از تأیید پذیرش، کد رزرو صادر
                می‌شود.
              </p>
              <Link href="/booking" className="mt-2 inline-block font-bold underline underline-offset-4">
                ثبت درخواست جدید
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
