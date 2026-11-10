import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { desc } from "drizzle-orm";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "email", label: "ایمیل *", type: "text", span: 2 },
  { name: "source", label: "منبع عضویت", type: "select", options: ["website", "footer", "offer", "admin"] },
  { name: "active", label: "فعال", type: "boolean" },
];
const DEFAULTS = { email: "", source: "admin", active: true };

export default async function AdminSubscribersPage() {
  const items = await db.select().from(subscribers).orderBy(desc(subscribers.createdAt));
  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="بازاریابی"
        title="خبرنامه و مشترکان"
        description="ایمیل‌های ثبت‌شده از فرم خبرنامه سایت را مدیریت کنید."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard label="کل مشترکان" value={toFa(items.length)} icon="📧" />
        <StatCard label="مشترکان فعال" value={toFa(items.filter((item) => item.active).length)} icon="✅" tone="success" />
      </div>
      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="subscribers"
          title="لیست ایمیل‌ها"
          description="افزودن دستی ایمیل نیز امکان‌پذیر است."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(items)) as ManagerItem[]}
          defaults={DEFAULTS}
          titleField="email"
          subtitleField="source"
          addLabel="افزودن ایمیل"
        />
      </div>
    </div>
  );
}
