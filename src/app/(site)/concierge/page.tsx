import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading } from "@/components/site/ui";
import ConciergeForm from "@/components/site/ConciergeForm";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "کانسیرژ و درخواست خدمات",
  description: "ترانسفر فرودگاه، تور، اسپا، رزرو میز و درخواست‌های ویژه مهمانان هتل کاج.",
};

const SERVICES = [
  { icon: "🚐", title: "ترانسفر فرودگاهی", desc: "خودروی اختصاصی از/به فرودگاه شیراز با هماهنگی پرواز." },
  { icon: "🗺️", title: "تور و راهنمای محلی", desc: "تور پیاده بافت تاریخی، حافظیه و سعدیه و سفر یک‌روزه تخت جمشید." },
  { icon: "💆", title: "اسپا و ماساژ", desc: "رزرو اتاق خصوصی ماساژ، آروماتراپی و سونا برای مهمانان." },
  { icon: "🍽️", title: "رزرو میز کافه", desc: "میز حیاط، شام سرآشپز و منوی مناسبتی." },
  { icon: "🎉", title: "جشن و مناسبت", desc: "تولد، سالگرد و چیدمان ویژه اتاق با کیک و گل." },
  { icon: "🧳", title: "خدمات سفر", desc: "نگهداری چمدان، شست‌وشوی لباس و راهنمایی مسیر." },
];

export default async function ConciergePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const [settings, params] = await Promise.all([getSettings(), searchParams]);
  return (
    <>
      <PageHero
        kicker="کانسیرژ کاج"
        title="هر درخواستی که اقامت را آسان‌تر کند"
        description="تیم کانسیرژ هتل کاج برای ترانسفر، تور، اسپا و لحظه‌های ویژه در کنار شماست."
        image={settings.poolImage || settings.aboutImage}
        breadcrumb={[{ label: "کانسیرژ" }]}
      />
      <section className="container-x py-8">
        <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr] lg:items-start">
          <div className="space-y-4">
            <SectionHeading align="start" kicker="خدمات" title="با یک درخواست، همه‌چیز هماهنگ می‌شود" />
            <div className="grid gap-3 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <article key={service.title} className="glass rounded-2xl p-4">
                  <span className="glass-circle h-10 w-10 text-lg">{service.icon}</span>
                  <p className="mt-2 text-[11px] font-black text-forest-950">{service.title}</p>
                  <p className="mt-1 text-[10px] leading-5 text-forest-900/55">{service.desc}</p>
                </article>
              ))}
            </div>
            <div className="glass-soft rounded-2xl p-4 text-[10px] leading-6 text-forest-900/65">
              <p className="font-bold text-forest-900">تماس مستقیم کانسیرژ</p>
              <p dir="ltr" className="mt-1 font-bold">{settings.phone}</p>
              <p>پاسخگویی ۲۴ ساعته · برای موارد فوری تماس تلفنی سریع‌تر است.</p>
              <Link href="/track" className="mt-2 inline-block font-bold text-forest-800 hover:underline">
                پیگیری رزرو و کد رزرو ←
              </Link>
            </div>
          </div>
          <div className="lg:sticky lg:top-28">
            <ConciergeForm defaultBookingCode={params.code ?? ""} />
          </div>
        </div>
      </section>
    </>
  );
}
