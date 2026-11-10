import PricingCalendar from "@/components/admin/PricingCalendar";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getRooms } from "@/lib/data";
import { listSpecialDays } from "@/lib/pricing";
import { currentJalaliMonth, isoFromJalali, jalaliMonthLength } from "@/lib/jalali";
import { formatMoney, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  const rooms = await getRooms({ onlyActive: false });
  const { jy, jm } = currentJalaliMonth();
  const from = isoFromJalali(jy, jm, 1);
  const to = isoFromJalali(jy, jm, jalaliMonthLength(jy, jm));
  const days = await listSpecialDays();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="قیمت‌گذاری"
        title="تقویم قیمت اتاق‌ها (شمسی)"
        description="قیمت هر روز را می‌توانید به‌صورت تک‌روز یا چندروزه (بازه انتخابی) تغییر دهید. روزهای پیک و تعطیلات را مشخص کنید و با یک کلیک درصد افزایش را اعمال کنید."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="اتاق‌های قیمت‌گذاری" value={toFa(rooms.length)} icon="🛏️" />
        <StatCard
          label="میانگین نرخ پایه"
          value={formatMoney(
            rooms.length ? Math.round(rooms.reduce((sum, room) => sum + room.pricePerNight, 0) / rooms.length) : 0,
          )}
          icon="💵"
          tone="gold"
        />
        <StatCard label="روزهای ویژه ثبت‌شده" value={toFa(days.length)} icon="🎉" tone="warning" />
        <StatCard label="بازه تقویم" value={`${toFa(jm)}/${toFa(jy)}`} icon="🗓️" tone="dark" hint="ماه شمسی جاری" />
      </div>

      <PricingCalendar
        rooms={rooms.map((room) => ({
          id: room.id,
          name: room.name,
          roomNumber: room.roomNumber,
          pricePerNight: room.pricePerNight,
        }))}
        initialJy={jy}
        initialJm={jm}
        initialDays={days.map((day) => ({
          id: day.id,
          date: day.date,
          title: day.title,
          kind: day.kind,
          percent: day.percent,
        }))}
      />
    </div>
  );
}
