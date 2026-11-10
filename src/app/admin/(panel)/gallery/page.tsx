import { asc } from "drizzle-orm";
import { db } from "@/db";
import { galleryItems } from "@/db/schema";
import { GalleryManager } from "@/components/admin/extras-admin";

export default async function Page() {
  const list = await db.select().from(galleryItems).orderBy(asc(galleryItems.sortOrder), asc(galleryItems.id));
  return <GalleryManager key={list.map((g) => g.id).join()} initial={list} />;
}
