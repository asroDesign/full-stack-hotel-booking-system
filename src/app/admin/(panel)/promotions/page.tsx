import { asc } from "drizzle-orm";
import { db } from "@/db";
import { promotions, rooms } from "@/db/schema";
import { promoUsesMap } from "@/lib/promotions";
import { PromotionsManager } from "@/components/admin/extras-admin";

export default async function Page() {
  const [list, roomList] = await Promise.all([
    db.select().from(promotions).orderBy(asc(promotions.sortOrder), asc(promotions.id)),
    db.select({ id: rooms.id, name: rooms.name }).from(rooms).orderBy(asc(rooms.sortOrder)),
  ]);
  const uses = await promoUsesMap(list.map((p) => p.code));
  return <PromotionsManager key={list.map((p) => `${p.id}${p.isActive}${p.value}${p.code}`).join()} initial={list} uses={Object.fromEntries(uses)} rooms={roomList} />;
}
