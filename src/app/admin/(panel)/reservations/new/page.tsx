import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { partners, rooms } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { NewReservationForm } from "@/components/admin/frontdesk";
import { faNum } from "@/lib/utils";

export default async function NewReservation({ searchParams }: { searchParams: Promise<{ room?: string; checkIn?: string }> }) {
  const sp = await searchParams;
  const [roomList, partnerList] = await Promise.all([
    db.select().from(rooms).where(eq(rooms.isActive, true)).orderBy(asc(rooms.sortOrder)),
    db.select({ id: partners.id, name: partners.name }).from(partners).where(eq(partners.isActive, true)),
  ]);
  return (
    <div>
      <PageHeader title="ثبت رزرو / پذیرش حضوری" desc="ثبت رزروهای حضوری، تلفنی، آژانس‌ها و سایت‌های همکار همراه با لیست مهمانان" />
      <NewReservationForm
        rooms={roomList.map((r) => ({ id: r.id, name: `${faNum(r.roomNumber)} · ${r.name}`, extra: `${faNum(r.capacity + r.extraBeds)} نفر` }))}
        partners={partnerList}
        defaults={{ roomId: Number(sp.room) || undefined, checkIn: /^\d{4}-\d{2}-\d{2}$/.test(sp.checkIn ?? "") ? sp.checkIn : undefined }}
      />
    </div>
  );
}
