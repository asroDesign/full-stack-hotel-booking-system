import type { Metadata } from "next";
import ContactForm from "@/components/site/ContactForm";
import MapPanel from "@/components/site/MapPanel";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { getSettings } from "@/lib/data";
import { FAQ_ITEMS } from "@/lib/page-content";
import { phoneHref } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "تماس با ما",
  description: "راه‌های ارتباط با پذیرش هتل کاج، آدرس، تلفن و فرم تماس.",
};

export default async function ContactPage() {
  const settings = await getSettings();

  const channels = [
    { icon: "☎", title: "تلفن پذیرش", value: settings.phone, href: phoneHref(settings.phone), hint: "۲۴ ساعته" },
    { icon: "📱", title: "موبایل و واتس‌اپ", value: settings.mobile, href: settings.whatsappLink || "#", hint: "پاسخ سریع" },
    { icon: "✉", title: "ایمیل", value: settings.email, href: `mailto:${settings.email}`, hint: "پاسخ تا ۲۴ ساعت" },
    { icon: "📍", title: "آدرس", value: settings.address, href: "#map", hint: "گالیکش، گلستان" },
  ];

  return (
    <>
      <PageHero
        kicker="ارتباط با پذیرش"
        title="هر سوالی دارید، ما پاسخ می‌دهیم"
        description="برای رزرو، هماهنگی تور، درخواست ویژه یا هر پرسشی درباره اقامت در کاج، از راه‌های زیر با ما در تماس باشید."
        image={settings.heroImage}
      />

      <section className="container-x py-12">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {channels.map((channel) => (
            <a
              key={channel.title}
              href={channel.href}
              className="glass glass-hover group rounded-2xl p-4"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-lg">{channel.icon}</span>
                <span className="text-[9px] font-semibold text-gold-600">{channel.hint}</span>
              </div>
              <p className="mt-3 text-[10px] text-forest-800/50">{channel.title}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] font-bold leading-5 text-forest-950" dir={channel.title === "آدرس" ? "rtl" : "ltr"}>
                {channel.value}
              </p>
            </a>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          <div className="panel space-y-4 p-5 sm:p-6">
            <SectionHeading align="start" kicker="فرم تماس" title="پیام خود را برای ما بنویسید" description="همکاران پذیرش در اولین فرصت با شما تماس می‌گیرند." />
            <ContactForm />
          </div>
          <div className="space-y-4">
            <div id="map">
              <MapPanel settings={settings} compact />
            </div>
            <div className="rounded-2xl border border-forest-100 bg-forest-50 p-4 text-[11px] leading-6 text-forest-800/75">
              <p className="font-bold text-forest-950">ساعت پاسخگویی پذیرش</p>
              <p className="mt-1">پذیرش هتل به صورت شبانه‌روزی فعال است. پاسخ به پیام‌های فرم بین ۸ صبح تا ۱۰ شب انجام می‌شود.</p>
              <p className="mt-2">ورود از {settings.checkInTime} · تخلیه تا {settings.checkOutTime}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-x space-y-5">
          <SectionHeading kicker="پرسش‌های متداول" title="قبل از تماس، این پاسخ‌ها را ببینید" />
          <div className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
            {FAQ_ITEMS.map((item) => (
              <details key={item.question} className="collapse collapse-arrow rounded-2xl border border-cream-200 bg-cream-50">
                <summary className="collapse-title min-h-0 py-3.5 text-xs font-bold text-forest-950">{item.question}</summary>
                <div className="collapse-content">
                  <p className="text-[11px] leading-6 text-forest-800/65">{item.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
