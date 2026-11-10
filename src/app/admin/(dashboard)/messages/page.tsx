import MessagesAdmin, { type AdminMessage } from "@/components/admin/MessagesAdmin";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getMessages } from "@/lib/data";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const messages = await getMessages();

  const items: AdminMessage[] = messages.map((message) => ({
    id: message.id,
    name: message.name,
    phone: message.phone,
    email: message.email,
    subject: message.subject,
    message: message.message,
    status: message.status,
    replyNote: message.replyNote,
    createdAt: message.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="ارتباط با مهمانان"
        title="پیام‌های فرم تماس"
        description="پیام‌های دریافتی از فرم تماس سایت را بررسی، پاسخ‌گذاری و مدیریت کنید."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل پیام‌ها" value={toFa(items.length)} icon="✉️" />
        <StatCard
          label="پیام‌های جدید"
          value={toFa(items.filter((item) => item.status === "new").length)}
          icon="🔔"
          tone="warning"
        />
        <StatCard
          label="پاسخ داده‌شده"
          value={toFa(items.filter((item) => item.status === "replied").length)}
          icon="✅"
          tone="success"
        />
      </div>

      <MessagesAdmin initialItems={items} />
    </div>
  );
}
