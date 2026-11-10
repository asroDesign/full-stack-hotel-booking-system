import { desc } from "drizzle-orm";
import { db } from "@/db";
import { testimonials } from "@/db/schema";
import { TestimonialsManager } from "@/components/admin/collections-admin";

export default async function Page() {
  const list = await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
  return <TestimonialsManager key={list.map((t) => `${t.id}-${t.body.length}-${t.rating}-${t.isApproved}`).join()} initial={list} />;
}
