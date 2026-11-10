import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getOffers } from "@/lib/data";
import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "code", label: "کد تخفیف *", type: "text", placeholder: "NOWRUZ25", hint: "فقط حروف انگلیسی، عدد، - و _" },
  { name: "label", label: "توضیح کوتاه", type: "text", placeholder: "تخفیف نوروزی" },
  { name: "kind", label: "نوع تخفیف", type: "select", options: ["percent", "fixed"] },
  { name: "value", label: "مقدار (درصد یا تومان) *", type: "number" },
  { name: "minNights", label: "حداقل تعداد شب", type: "number" },
  { name: "maxUses", label: "حداکثر استفاده (۰ = نامحدود)", type: "number" },
  { name: "expiresAt", label: "انقضا (YYYY-MM-DD)", type: "text" },
  { name: "active", label: "فعال", type: "boolean" },
];

const DEFAULTS = {
  code: "",
  label: "",
  kind: "percent",
  value: 10,
  minNights: 1,
  maxUses: 0,
  expiresAt: "",
  active: true,
};

export default async function AdminPromosPage() {
  const [items, offers] = await Promise.all([
    db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt)),
    getOffers({ onlyActive: false }),
  ]);
  const active = items.filter((item) => item.active).length;
  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="بازاریابی"
        title="کدهای تخفیف"
        description="کد درصدی یا مبلغی بسازید؛ مهمان آن را در فرم رزرو وارد می‌کند و تخفیف به‌صورت خودکار اعمال و ثبت می‌شود."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل کدها" value={toFa(items.length)} icon="🏷️" />
        <StatCard label="کدهای فعال" value={toFa(active)} icon="✅" tone="success" />
        <StatCard label="پیشنهادهای فعال" value={toFa(offers.filter((offer) => offer.active).length)} icon="🎁" tone="gold" />
      </div>
      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="promo-codes"
          title="لیست کدهای تخفیف"
          description="مصرف هر کد به‌صورت خودکار شمارش می‌شود."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(items)) as ManagerItem[]}
          defaults={DEFAULTS}
          titleField="code"
          subtitleField="label"
          addLabel="کد تخفیف جدید"
        />
      </div>
    </div>
  );
}
