import { MapPin, Phone, Mail, Clock, Smartphone } from "lucide-react";
import { getSettings } from "@/lib/data";
import { PageHero } from "@/components/site/ui";
import { ContactForm } from "@/components/site/forms";
import { MapView } from "@/components/map-view";
import { WeatherWidget } from "@/components/site/extras-client";
import { faNum } from "@/lib/utils";

export const metadata = { title: "تماس با ما" };

export default async function ContactPage() {
  const s = await getSettings();
  const lat = Number(s.lat);
  const lng = Number(s.lng);
  const items = [
    { Icon: Phone, label: "تلفن پذیرش", value: faNum(s.phone), href: `tel:${s.phone}`, ltr: true },
    { Icon: Smartphone, label: "موبایل / واتس‌اپ", value: faNum(s.mobile), href: `tel:${s.mobile}`, ltr: true },
    { Icon: Mail, label: "ایمیل", value: s.email, href: `mailto:${s.email}`, ltr: true },
    { Icon: Clock, label: "ساعات پاسخگویی", value: "۲۴ ساعته، ۷ روز هفته" },
  ];
  return (
    <>
      <PageHero eyebrow="در ارتباط باشیم" title="تماس با ما" subtitle={`سؤالی دارید؟ تیم پذیرش ${s.hotelName} به‌صورت شبانه‌روزی پاسخگوی شماست.`} image="https://images.pexels.com/photos/12391805/pexels-photo-12391805.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1280" />
      <section className="mx-auto -mt-10 max-w-7xl px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(({ Icon, label, value, href, ltr }) => (
            <a key={label} href={href} className="card card-border bg-base-100 shadow-sm relative flex items-center gap-4 p-5 transition hover:-translate-y-1 hover:shadow-xl flex-row">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-700 text-white"><Icon className="h-5 w-5" /></span>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="truncate font-bold text-slate-800" dir={ltr ? "ltr" : undefined} style={{ textAlign: "right" }}>{value}</div>
              </div>
            </a>
          ))}
        </div>
      </section>
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-14 lg:grid-cols-2">
        <div className="card card-border bg-base-100 shadow-sm p-6 md:p-8 block">
          <h2 className="text-2xl font-black text-slate-900">ارسال پیام</h2>
          <p className="mb-6 mt-2 text-sm text-slate-500">پیام خود را بنویسید؛ در کمتر از چند ساعت پاسخ می‌دهیم.</p>
          <ContactForm />
        </div>
        <div className="flex flex-col gap-4">
          <MapView center={{ lat, lng }} zoom={15} className="min-h-[380px] flex-1 shadow-lg" markers={[{ lat, lng, title: s.hotelName, subtitle: s.address, kind: "hotel" }]} />
          <WeatherWidget lat={lat} lng={lng} city={s.city} />
          <div className="card card-border bg-base-100 shadow-sm flex items-start gap-3 p-5 flex-row">
            <MapPin className="mt-1 h-5 w-5 shrink-0 text-brand-600" />
            <div className="flex-1">
              <div className="font-bold text-slate-800">آدرس</div>
              <p className="mt-1 text-sm leading-7 text-slate-500">{s.address}</p>
            </div>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noreferrer" className="btn btn-primary shrink-0">مسیریابی</a>
          </div>
        </div>
      </section>
    </>
  );
}
