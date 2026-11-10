import { desc } from "drizzle-orm";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { MessagesInbox } from "@/components/admin/messages-inbox";
import { faNum } from "@/lib/utils";

export default async function Page() {
  const list = await db.select().from(messages).orderBy(desc(messages.createdAt));
  return (
    <div>
      <PageHeader title="پیام‌های تماس" desc={`${faNum(list.length)} پیام · ${faNum(list.filter((m) => !m.isRead).length)} خوانده‌نشده`} />
      <MessagesInbox key={list.map((m) => `${m.id}${m.isRead}`).join()} initial={list} />
    </div>
  );
}
