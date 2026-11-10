import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getAttractions } from "@/lib/data";
import { ATTRACTION_CATEGORIES } from "@/lib/constants";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "title", label: "نام جاذبه *", type: "text", span: 2, placeholder: "پارک ملی گلستان" },
  { name: "category", label: "دسته‌بندی", type: "select", options: [...ATTRACTION_CATEGORIES] },
  { name: "distanceKm", label: "فاصله از هتل (کیلومتر)", type: "number" },
  { name: "location", label: "موقعیت / نشانی", type: "text", placeholder: "جاده گالیکش به بجنورد" },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number" },
  { name: "imageUrl", label: "آدرس تصویر *", type: "text", span: 2, placeholder: "https://…" },
  { name: "mapUrl", label: "لینک نقشه / مسیریابی", type: "text", span: 2, placeholder: "https://www.google.com/maps/…" },
  { name: "description", label: "توضیحات", type: "textarea", span: 2, rows: 3 },
  { name: "active", label: "وضعیت فعال", type: "boolean" },
];

const DEFAULTS = {
  title: "",
  category: "طبیعت‌گردی",
  distanceKm: 15,
  location: "",
  sortOrder: 20,
  imageUrl: "https://images.pexels.com/photos/14266420/pexels-photo-14266420.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  mapUrl: "",
  description: "",
  active: true,
};

export default async function AdminAttractionsPage() {
  const attractions = await getAttractions({ onlyActive: false });

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="مدیریت محتوا"
        title="جاذبه‌های گردشگری اطراف"
        description="جاذبه‌های نزدیک هتل را با فاصله، تصویر و لینک مسیریابی معرفی کنید."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل جاذبه‌ها" value={toFa(attractions.length)} icon="🗺️" />
        <StatCard label="جاذبه‌های فعال" value={toFa(attractions.filter((item) => item.active).length)} icon="✅" tone="success" />
        <StatCard
          label="نزدیک‌ترین فاصله"
          value={`${toFa(Math.min(...attractions.map((item) => item.distanceKm), 0))} کیلومتر`}
          icon="📍"
          tone="gold"
        />
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="attractions"
          title="لیست جاذبه‌ها"
          description="این موارد در صفحه «جاذبه‌های اطراف» و صفحه اصلی نمایش داده می‌شوند."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(attractions)) as ManagerItem[]}
          defaults={DEFAULTS}
          imageField="imageUrl"
          titleField="title"
          subtitleField="location"
          addLabel="جاذبه جدید"
        />
      </div>
    </div>
  );
}
