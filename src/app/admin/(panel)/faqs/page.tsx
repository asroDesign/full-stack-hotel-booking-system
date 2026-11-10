import { asc } from "drizzle-orm";
import { db } from "@/db";
import { faqs } from "@/db/schema";
import { FaqManager } from "@/components/admin/extras-admin";

export default async function Page() {
  const list = await db.select().from(faqs).orderBy(asc(faqs.sortOrder), asc(faqs.id));
  return <FaqManager key={list.map((f) => `${f.id}${f.question.length}${f.isActive}`).join()} initial={list} />;
}
