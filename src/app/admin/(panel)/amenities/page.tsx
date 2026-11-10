import { asc } from "drizzle-orm";
import { db } from "@/db";
import { amenities } from "@/db/schema";
import { AmenitiesManager } from "@/components/admin/collections-admin";

export default async function Page() {
  const list = await db.select().from(amenities).orderBy(asc(amenities.sortOrder), asc(amenities.id));
  return <AmenitiesManager key={list.map((a) => `${a.id}-${a.title}-${a.icon}`).join()} initial={list} />;
}
