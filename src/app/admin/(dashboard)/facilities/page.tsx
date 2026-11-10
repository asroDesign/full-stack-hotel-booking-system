import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getFacilities } from "@/lib/data";
import { FACILITY_CATEGORIES } from "@/lib/constants";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "title", label: "عنوان خدمت *", type: "text", span: 2, placeholder: "استخر خانوادگی کاج" },
  { name: "subtitle", label: "زیرعنوان", type: "text", span: 2, placeholder: "آب گرم، محیط خصوصی" },
  { name: "icon", label: "آیکون (ایموجی)", type: "text", placeholder: "🏊" },
  { name: "category", label: "دسته‌بندی", type: "select", options: [...FACILITY_CATEGORIES] },
  { name: "imageUrl", label: "آدرس تصویر *", type: "text", span: 2, placeholder: "https://…" },
  { name: "description", label: "توضیحات", type: "textarea", span: 2, rows: 3 },
  { name: "features", label: "ویژگی‌ها (هر خط یک مورد)", type: "lines", span: 2 },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number" },
  { name: "highlight", label: "نمایش به‌عنوان ویژه", type: "boolean" },
  { name: "active", label: "وضعیت فعال", type: "boolean" },
];

const DEFAULTS = {
  title: "",
  subtitle: "",
  icon: "✨",
  category: "رفاهی",
  imageUrl: "https://images.pexels.com/photos/14036253/pexels-photo-14036253.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  description: "",
  features: [],
  sortOrder: 20,
  highlight: false,
  active: true,
};

export default async function AdminFacilitiesPage() {
  const facilities = await getFacilities({ onlyActive: false });
  const active = facilities.filter((item) => item.active).length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="مدیریت محتوا"
        title="امکانات و خدمات هتل"
        description="استخر خانوادگی، رستوران، اسپا و سایر خدمات را با تصویر و ویژگی‌هایشان مدیریت کنید."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل خدمات" value={toFa(facilities.length)} icon="✨" />
        <StatCard label="خدمات فعال" value={toFa(active)} icon="✅" tone="success" />
        <StatCard
          label="خدمات ویژه"
          value={toFa(facilities.filter((item) => item.highlight).length)}
          icon="⭐"
          tone="gold"
        />
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="facilities"
          title="لیست امکانات"
          description="خدمات ویژه با نشان طلایی نمایش داده می‌شوند."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(facilities)) as ManagerItem[]}
          defaults={DEFAULTS}
          imageField="imageUrl"
          titleField="title"
          subtitleField="subtitle"
          addLabel="خدمت جدید"
        />
      </div>
    </div>
  );
}
