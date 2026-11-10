import Link from "next/link";
import SettingsForm from "@/components/admin/SettingsForm";
import { AdminPageHeader } from "@/components/admin/ui";
import { getRooms, getSettings } from "@/lib/data";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [settings, rooms] = await Promise.all([getSettings(), getRooms({ onlyActive: false })]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="پیکربندی"
        title="تنظیمات هتل و سایت"
        description="اطلاعات تماس، متن‌های معرفی، قیمت استخر و مختصات نقشه را مدیریت کنید."
        action={
          <Link href="/" className="btn btn-ghost btn-sm">
            مشاهده سایت
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
          <p className="text-[10px] text-forest-800/50">اتاق‌های ثبت‌شده</p>
          <p className="text-lg font-black text-forest-950">{toFa(rooms.length)}</p>
          <p className="mt-0.5 text-[9px] text-forest-800/45">تعداد واقعی اتاق‌ها در پنل</p>
        </div>
        <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
          <p className="text-[10px] text-forest-800/50">هزینه هر سانس استخر</p>
          <p className="text-lg font-black text-forest-950">{toFa(settings.poolPrice.toLocaleString("en-US"))} تومان</p>
          <p className="mt-0.5 text-[9px] text-forest-800/45">پیش‌پرداخت ۳۰٪ در رزرو</p>
        </div>
        <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
          <p className="text-[10px] text-forest-800/50">مختصات نقشه</p>
          <p dir="ltr" className="text-sm font-black text-forest-950">
            {settings.mapLat}, {settings.mapLng}
          </p>
          <p className="mt-0.5 text-[9px] text-forest-800/45">نمایش در صفحه تماس و جاذبه‌ها</p>
        </div>
      </div>

      <SettingsForm initialSettings={settings} />
    </div>
  );
}
