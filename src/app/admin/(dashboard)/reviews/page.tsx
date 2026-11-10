import CollectionManager, { type Field, type ManagerItem } from "@/components/admin/CollectionManager";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getGuestReviews } from "@/lib/data";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { desc } from "drizzle-orm";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const FIELDS: Field[] = [
  { name: "guestName", label: "نام مهمان *", type: "text" },
  { name: "city", label: "شهر", type: "text" },
  { name: "rating", label: "امتیاز (۱–۵)", type: "select", options: ["5", "4", "3", "2", "1"] },
  { name: "title", label: "عنوان نظر", type: "text" },
  { name: "comment", label: "متن نظر *", type: "textarea", span: 2, rows: 4 },
  { name: "status", label: "وضعیت انتشار", type: "select", options: ["pending", "approved", "rejected"] },
  { name: "featured", label: "نمایش شاخص", type: "boolean" },
];

const DEFAULTS = { guestName: "", city: "", rating: "5", title: "", comment: "", status: "approved", featured: false };

export default async function AdminReviewsPage() {
  const [all, approved] = await Promise.all([
    db.select().from(reviews).orderBy(desc(reviews.createdAt)),
    getGuestReviews({ limit: 500 }),
  ]);
  const pending = all.filter((item) => item.status === "pending").length;
  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="ارتباط با مهمانان"
        title="نظرات مهمانان"
        description="نظرات ثبت‌شده از سایت را تأیید یا رد کنید؛ نظرات تأییدشده در صفحه نظرات و صفحه اصلی نمایش داده می‌شوند."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="در انتظار تأیید" value={toFa(pending)} icon="⏳" tone="warning" />
        <StatCard label="نظرات منتشرشده" value={toFa(approved.length)} icon="✅" tone="success" />
        <StatCard
          label="میانگین امتیاز"
          value={`${toFa(approved.length ? Math.round((approved.reduce((sum, r) => sum + r.rating, 0) / approved.length) * 10) / 10 : 0)} / ۵`}
          icon="★"
          tone="gold"
        />
      </div>
      <div className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
        <CollectionManager
          resource="reviews"
          title="همه نظرات"
          description="برای انتشار، وضعیت را روی approved بگذارید."
          fields={FIELDS}
          initialItems={JSON.parse(JSON.stringify(all)) as ManagerItem[]}
          defaults={DEFAULTS}
          titleField="guestName"
          subtitleField="comment"
          addLabel="نظر جدید"
        />
      </div>
    </div>
  );
}
