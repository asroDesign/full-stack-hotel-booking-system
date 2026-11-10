import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { getContent } from "@/lib/content";
import { PageHeader } from "@/components/admin/ui";
import { BookingEditor } from "@/components/admin/booking-editor";

export default async function Page() {
  const { booking } = await getContent();
  const bookable = await db
    .select({ id: services.id, name: services.name, rules: services.rules })
    .from(services)
    .where(eq(services.isBookable, true))
    .orderBy(asc(services.sortOrder));
  return (
    <div>
      <PageHeader title="صفحه رزرو و قوانین" desc="فرایند رزرو، متن توجه، قوانین هتل و خدمات و بخش پیگیری رزرو" />
      <BookingEditor initial={booking} services={bookable} />
    </div>
  );
}
