import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getEvents } from "@/lib/data";
import { formatJalali, todayISO, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "title", label: "عنوان رویداد *", type: "text", span: 2, placeholder: "شب موسیقی زنده در حیاط" },
  { name: "category", label: "دسته", type: "select", options: ["رویداد", "موسیقی", "غذا و نوشیدنی", "تور", "کارگاه", "فصلی"] },
  { name: "startsAt", label: "تاریخ شروع *", type: "text", placeholder: "2026-12-01" },
  { name: "endDate", label: "تاریخ پایان", type: "text", placeholder: "2026-12-02" },
  { name: "timeLabel", label: "ساعت", type: "text", placeholder: "۲۰:۰۰ تا ۲۲:۳۰" },
  { name: "location", label: "مکان", type: "text", placeholder: "حیاط هتل" },
  { name: "price", label: "ورودی (تومان)", type: "number", hint: "۰ = رایگان برای مهمانان" },
  { name: "capacity", label: "ظرفیت", type: "number" },
  { name: "imageUrl", label: "تصویر (URL)", type: "text", span: 2 },
  { name: "description", label: "توضیحات", type: "textarea", span: 2, rows: 3 },
  { name: "featured", label: "رویداد شاخص", type: "boolean" },
  { name: "active", label: "فعال", type: "boolean" },
];

const DEFAULTS = {
  title: "",
  category: "رویداد",
  startsAt: todayISO(),
  endDate: "",
  timeLabel: "",
  location: "حیاط هتل",
  price: 0,
  capacity: 30,
  imageUrl: "https://images.pexels.com/photos/14036246/pexels-photo-14036246.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  description: "",
  featured: false,
  active: true,
};

export default async function AdminEventsPage() {
  const items = await getEvents({ onlyActive: false });
  const today = todayISO();
  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="محتوا"
        title="رویدادها و تقویم تجربه‌ها"
        description="موسیقی زنده، شام سرآشپز، تور و کارگاه‌ها را مدیریت کنید؛ در صفحه رویدادها و صفحه اصلی نمایش داده می‌شوند."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل رویدادها" value={toFa(items.length)} icon="🎶" />
        <StatCard label="رویدادهای آینده" value={toFa(items.filter((item) => item.startsAt >= today && item.active).length)} icon="📅" tone="success" />
        <StatCard label="رویداد شاخص" value={toFa(items.filter((item) => item.featured).length)} icon="⭐" tone="gold" />
      </div>
      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="events"
          title="تقویم رویدادها"
          description={`نمونه تاریخ‌ها: ${formatJalali(items[0]?.startsAt ?? today)}`}
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(items)) as ManagerItem[]}
          defaults={DEFAULTS}
          imageField="imageUrl"
          titleField="title"
          subtitleField="category"
          addLabel="رویداد جدید"
        />
      </div>
    </div>
  );
}
