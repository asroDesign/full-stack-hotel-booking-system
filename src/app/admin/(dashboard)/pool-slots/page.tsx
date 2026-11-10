import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getPoolSlots, getSettings } from "@/lib/data";
import { formatMoney, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "label", label: "عنوان سانس *", type: "text", span: 2, placeholder: "۱۶:۰۰ تا ۱۹:۰۰" },
  { name: "price", label: "قیمت سانس (تومان) *", type: "number" },
  { name: "capacity", label: "ظرفیت پایه (نفر)", type: "number", hint: "ظرفیت پایه بدون هزینه اضافه" },
  { name: "extraGuestFee", label: "هزینه هر نفر اضافه (تومان)", type: "number" },
  { name: "sortOrder", label: "ترتیب نمایش", type: "number" },
  { name: "description", label: "توضیح کوتاه سانس", type: "textarea", span: 2, rows: 2 },
  { name: "active", label: "وضعیت فعال", type: "boolean" },
];

const DEFAULTS = {
  label: "",
  price: 2500000,
  capacity: 8,
  extraGuestFee: 350000,
  sortOrder: 10,
  description: "",
  active: true,
};

export default async function AdminPoolSlotsPage() {
  const [slots, settings] = await Promise.all([getPoolSlots({ onlyActive: false }), getSettings()]);

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="استخر خانوادگی"
        title="مدیریت سانس‌ها و قیمت‌ها"
        description="برای هر سانس ظرفیت پایه و هزینه نفر اضافه تعیین کنید. این قیمت‌ها در صفحه استخر و فرم رزرو نمایش داده می‌شود."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="سانس‌های فعال" value={toFa(slots.filter((slot) => slot.active).length)} icon="🏊" tone="success" />
        <StatCard
          label="ارزان‌ترین سانس"
          value={slots.length ? formatMoney(Math.min(...slots.map((slot) => slot.price))) : "—"}
          icon="💳"
        />
        <StatCard label="هزینه نفر اضافه (پیش‌فرض)" value={formatMoney(settings.extraGuestFee)} icon="➕" tone="gold" />
        <StatCard
          label="حداکثر ظرفیت سانس"
          value={`${toFa(settings.poolMaxCapacity)} نفر`}
          icon="👨‍👩‍👧‍👦"
          tone="dark"
          hint={`ظرفیت پایه ${toFa(settings.poolBaseCapacity)} نفر`}
        />
      </div>

      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="pool-slots"
          title={`سانس‌های استخر (${toFa(slots.length)})`}
          description="هزینه نفر اضافه برای هر سانس جداگانه محاسبه می‌شود."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(slots)) as ManagerItem[]}
          defaults={DEFAULTS}
          titleField="label"
          subtitleField="description"
          priceField="price"
          addLabel="سانس جدید"
        />
      </div>

      <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 text-[11px] leading-6 text-gold-700">
        ⓘ هزینه نفر اضافه = (تعداد مهمان − ظرفیت پایه سانس) × هزینه هر نفر اضافه. این مبلغ به صورت خودکار در مبلغ کل رزرو
        و پیش‌پرداخت ۳۰٪ لحاظ می‌شود.
      </div>
    </div>
  );
}
