import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { db } from "@/db";
import { conciergeRequests } from "@/db/schema";
import { desc } from "drizzle-orm";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "guestName", label: "نام مهمان", type: "text" },
  { name: "phone", label: "شماره تماس", type: "text" },
  { name: "serviceType", label: "نوع خدمت", type: "select", options: ["airport_transfer", "tour", "spa", "table", "celebration", "other"] },
  { name: "preferredDate", label: "تاریخ درخواستی", type: "text" },
  { name: "details", label: "جزئیات درخواست", type: "textarea", span: 2, rows: 3 },
  { name: "status", label: "وضعیت", type: "select", options: ["new", "in_progress", "done", "cancelled"] },
  { name: "adminNote", label: "یادداشت پذیرش", type: "text", span: 2 },
];
const DEFAULTS = {
  guestName: "",
  phone: "",
  serviceType: "other",
  preferredDate: "",
  details: "",
  status: "new",
  adminNote: "",
};

export default async function AdminConciergePage() {
  const items = await db.select().from(conciergeRequests).orderBy(desc(conciergeRequests.createdAt));
  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="کانسیرژ"
        title="درخواست‌های کانسیرژ"
        description="ترانسفر فرودگاه، رزرو اسپا، میز رستوران و درخواست‌های ویژه مهمانان."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل درخواست‌ها" value={toFa(items.length)} icon="🛎️" />
        <StatCard label="در انتظار بررسی" value={toFa(items.filter((item) => item.status === "new").length)} icon="⏳" tone="warning" />
        <StatCard label="انجام‌شده" value={toFa(items.filter((item) => item.status === "done").length)} icon="✅" tone="success" />
      </div>
      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="concierge"
          title="درخواست‌ها"
          description="وضعیت را به‌روزرسانی کنید و یادداشت پذیرش ثبت نمایید."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(items)) as ManagerItem[]}
          defaults={DEFAULTS}
          titleField="guestName"
          subtitleField="serviceType"
          addLabel="درخواست دستی"
        />
      </div>
    </div>
  );
}
