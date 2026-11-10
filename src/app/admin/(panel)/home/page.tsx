import { getContent } from "@/lib/content";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { diningVenues, services } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { HomeEditor } from "@/components/admin/home-editor";

export default async function Page() {
  const { home } = await getContent();
  const [svc, venues] = await Promise.all([
    db.select({ slug: services.slug, name: services.name }).from(services).where(eq(services.isActive, true)).orderBy(asc(services.sortOrder)),
    db.select({ id: diningVenues.id }).from(diningVenues).where(eq(diningVenues.isActive, true)),
  ]);
  return (
    <div>
      <PageHeader title="مدیریت صفحه اصلی" desc="ویدیو و GIF های سکشن اول و سکشن ویژه، ترتیب سکشن‌ها، متن‌ها، دکمه‌ها و نمایش یا مخفی کردن هر سکشن" />
      <HomeEditor initial={home} services={svc} hasDining={venues.length > 0} />
    </div>
  );
}
