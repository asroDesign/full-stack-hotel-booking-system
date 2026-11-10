import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getMenuItems, getSettings } from "@/lib/data";
import { formatMoney, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const CATEGORIES = ["صبحانه", "پیش‌غذا", "غذای اصلی", "دسر", "نوشیدنی", "قهوه و چای"];

const FIELDS: Field[] = [
  { name: "name", label: "نام آیتم *", type: "text", span: 2, placeholder: "کباب کوبیده کاج" },
  { name: "category", label: "دسته‌بندی", type: "select", options: CATEGORIES },
  { name: "price", label: "قیمت (تومان)", type: "number" },
  { name: "description", label: "توضیح کوتاه", type: "textarea", span: 2, rows: 2 },
  { name: "imageUrl", label: "تصویر آیتم (URL)", type: "text", span: 2, placeholder: "https://…" },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number" },
  { name: "featured", label: "پیشنهاد ویژه سرآشپز", type: "boolean" },
  { name: "active", label: "وضعیت فعال", type: "boolean" },
];

const DEFAULTS = {
  name: "",
  category: "غذای اصلی",
  price: 450000,
  description: "",
  imageUrl: "https://images.pexels.com/photos/12391805/pexels-photo-12391805.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  sortOrder: 20,
  featured: false,
  active: true,
};

export default async function AdminMenuPage() {
  const [items, settings] = await Promise.all([getMenuItems({ onlyActive: false }), getSettings()]);
  const active = items.filter((item) => item.active).length;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="کافه و رستوران"
        title={`مدیریت منوی ${settings.diningTitle}`}
        description="آیتم‌های منو را با دسته‌بندی، قیمت، تصویر و توضیح مدیریت کنید. این آیتم‌ها در صفحه «کافه و رستوران» و صفحه اصلی نمایش داده می‌شوند."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل آیتم‌ها" value={toFa(items.length)} icon="🍽️" />
        <StatCard label="آیتم‌های فعال" value={toFa(active)} icon="✅" tone="success" />
        <StatCard
          label="میانگین قیمت"
          value={formatMoney(items.length ? Math.round(items.reduce((sum, item) => sum + item.price, 0) / items.length) : 0)}
          icon="💳"
          tone="gold"
        />
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="menu-items"
          title={`منوی کافه و رستوران (${toFa(items.length)})`}
          description="دسته‌بندی‌ها در صفحه عمومی به صورت تب نمایش داده می‌شوند."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(items)) as ManagerItem[]}
          defaults={DEFAULTS}
          imageField="imageUrl"
          titleField="name"
          subtitleField="category"
          priceField="price"
          addLabel="آیتم منو"
        />
      </div>
    </div>
  );
}
