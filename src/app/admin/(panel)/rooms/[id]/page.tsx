import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { RoomForm } from "@/components/admin/rooms-admin";

export default async function EditRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [room] = await db.select().from(rooms).where(eq(rooms.id, Number(id)));
  if (!room) notFound();
  return (
    <div>
      <PageHeader title={`ویرایش ${room.name}`} />
      <RoomForm room={room} />
    </div>
  );
}
