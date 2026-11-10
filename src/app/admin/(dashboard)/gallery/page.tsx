import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getGallery } from "@/lib/data";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "title", label: "عنوان تصویر *", type: "text", span: 2, placeholder: "نمای شبانه استخر خانوادگی" },
  { name: "category", label: "دسته‌بندی", type: "select", options: ["هتل", "اتاق‌ها", "استخر", "رستوران", "طبیعت"] },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number" },
  { name: "imageUrl", label: "آدرس تصویر *", type: "text", span: 2, placeholder: "https://…" },
  { name: "active", label: "وضعیت فعال", type: "boolean" },
];

const DEFAULTS = {
  title: "",
  category: "هتل",
  sortOrder: 20,
  imageUrl: "",
  active: true,
};

export default async function AdminGalleryPage() {
  const items = await getGallery({ onlyActive: false });
  const categories = Array.from(new Set(items.map((item) => item.category)));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="مدیریت محتوا"
        title="گالری تصاویر"
        description="تصاویر هتل را با دسته‌بندی مدیریت کنید؛ این تصاویر در صفحه گالری و صفحه اصلی نمایش داده می‌شوند."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل تصاویر" value={toFa(items.length)} icon="🖼️" />
        <StatCard label="تصاویر فعال" value={toFa(items.filter((item) => item.active).length)} icon="✅" tone="success" />
        <StatCard label="دسته‌بندی‌ها" value={toFa(categories.length)} icon="🏷️" tone="gold" />
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="gallery"
          title="لیست تصاویر"
          description="برای افزودن تصویر، آدرس مستقیم تصویر (jpg/png) را وارد کنید."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(items)) as ManagerItem[]}
          defaults={DEFAULTS}
          imageField="imageUrl"
          titleField="title"
          subtitleField="category"
          addLabel="تصویر جدید"
        />
      </div>
    </div>
  );
}
