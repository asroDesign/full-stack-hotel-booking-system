import { asc } from "drizzle-orm";
import { db } from "@/db";
import { attractions } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { AttractionsManager } from "@/components/admin/collections-admin";

export default async function Page() {
  const s = await getSettings();
  const list = await db.select().from(attractions).orderBy(asc(attractions.sortOrder), asc(attractions.id));
  return <AttractionsManager key={list.map((a) => `${a.id}-${a.name}-${a.lat}-${a.lng}-${a.image}`).join()} initial={list} hotel={{ lat: Number(s.lat), lng: Number(s.lng), name: s.hotelName }} />;
}
