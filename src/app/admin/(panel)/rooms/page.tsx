import Link from "next/link";
import { asc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { RoomsGrid } from "@/components/admin/rooms-admin";
import { faNum } from "@/lib/utils";

export default async function AdminRooms({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const list = await db.select().from(rooms).orderBy(asc(rooms.sortOrder), asc(rooms.id));
  return (
    <div>
      <PageHeader title="اتاق‌ها" desc={`${faNum(list.length)} اتاق تعریف شده · ${faNum(list.filter((r) => r.isActive).length)} فعال`} action={<Link href="/admin/rooms/new" className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن اتاق</Link>} />
      {sp.saved && <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-emerald-200">اتاق با موفقیت ذخیره شد.</div>}
      <RoomsGrid key={list.map((r) => `${r.id}${r.isActive}${r.isFeatured}`).join()} initial={list} />
    </div>
  );
}
