import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getOffers, getRooms } from "@/lib/data";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "title", label: "عنوان پیشنهاد *", type: "text", span: 2, placeholder: "پکیج دو شب اقامت + شام" },
  { name: "subtitle", label: "زیرعنوان", type: "text", span: 2 },
  { name: "badge", label: "برچسب", type: "text", placeholder: "پیشنهاد ویژه" },
  { name: "price", label: "قیمت بسته (تومان)", type: "number" },
  { name: "oldPrice", label: "قیمت قبل از تخفیف", type: "number", hint: "برای نمایش درصد تخفیف" },
  { name: "roomId", label: "شناسه اتاق مرتبط (اختیاری)", type: "number" },
  { name: "validUntil", label: "اعتبار تا تاریخ", type: "text", placeholder: "2026-12-31" },
  { name: "imageUrl", label: "تصویر (URL)", type: "text", span: 2, placeholder: "https://…" },
  { name: "description", label: "توضیحات", type: "textarea", span: 2, rows: 3 },
  { name: "includes", label: "مزایای بسته (هر مورد یک خط)", type: "lines", span: 2, placeholder: "یک شب اقامت" },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number" },
  { name: "featured", label: "پیشنهاد شاخص", type: "boolean" },
  { name: "active", label: "فعال", type: "boolean" },
];

const DEFAULTS = {
  title: "",
  subtitle: "",
  badge: "پیشنهاد ویژه",
  price: 0,
  oldPrice: 0,
  roomId: 0,
  validUntil: "",
  imageUrl: "https://images.pexels.com/photos/6394574/pexels-photo-6394574.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  description: "",
  includes: [],
  sortOrder: 10,
  featured: false,
  active: true,
};

export default async function AdminOffersPage() {
  const [items, rooms] = await Promise.all([getOffers({ onlyActive: false }), getRooms({ onlyActive: false })]);
  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="بازاریابی"
        title="پیشنهادها و پکیج‌های اقامت"
        description="بسته‌های ویژه (اقامت + شام، اسپا، تور) را بسازید؛ در صفحه اصلی و صفحه پیشنهادها نمایش داده می‌شوند."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل پیشنهادها" value={toFa(items.length)} icon="🎁" />
        <StatCard label="پیشنهادهای فعال" value={toFa(items.filter((item) => item.active).length)} icon="✅" tone="success" />
        <StatCard
          label="اتاق‌های قابل اتصال"
          value={toFa(rooms.length)}
          icon="🛏️"
          tone="gold"
          hint="از شناسه اتاق در فرم استفاده کنید"
        />
      </div>
      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="offers"
          title="پکیج‌های اقامت"
          description="برای اتصال به اتاق، شناسه اتاق را وارد کنید (فهرست در کارت بالا)."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(items)) as ManagerItem[]}
          defaults={DEFAULTS}
          imageField="imageUrl"
          titleField="title"
          subtitleField="subtitle"
          priceField="price"
          addLabel="پیشنهاد جدید"
        />
      </div>
    </div>
  );
}
