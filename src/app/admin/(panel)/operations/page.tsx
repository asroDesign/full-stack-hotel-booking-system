import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { hotelStaff, hotelTasks, reservations, rooms } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { HotelOperations } from "@/components/admin/hotel-operations";
import { getCurrentShiftCoverage } from "@/lib/hotel-operations";
import { hotelBusinessDate } from "@/lib/hotel-operations";
import { formatJalali } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const today = hotelBusinessDate();
  const [tasks, staff, coverage] = await Promise.all([
    db.select({ task: hotelTasks, roomName: rooms.name, roomNumber: rooms.roomNumber, reservationGuest: reservations.guestName, staffName: hotelStaff.fullName })
      .from(hotelTasks)
      .leftJoin(rooms, eq(hotelTasks.roomId, rooms.id))
      .leftJoin(reservations, eq(hotelTasks.reservationId, reservations.id))
      .leftJoin(hotelStaff, eq(hotelTasks.assignedStaffId, hotelStaff.id))
      .orderBy(desc(hotelTasks.workDate), desc(hotelTasks.createdAt))
      .limit(200),
    db.select().from(hotelStaff).where(eq(hotelStaff.isActive, true)).orderBy(hotelStaff.fullName),
    getCurrentShiftCoverage(),
  ]);
  return (
    <div className="space-y-2">
      <PageHeader title="هماهنگی هوشمند شیفت و کارها" desc={`تابلوی کار روزانه · ${formatJalali(today, true)}`} action={<Link href="/admin/staff#schedule" className="btn btn-primary btn-sm">برنامه نیروی انسانی</Link>} />
      {params.error && <div role="alert" className="alert alert-error mb-4">{params.error}</div>}
      <HotelOperations tasks={tasks} staff={staff} coverage={coverage} today={today} />
    </div>
  );
}
