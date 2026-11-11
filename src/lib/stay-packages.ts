import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { stayPackages } from "@/db/schema";

export async function getActiveStayPackages() {
  return db
    .select()
    .from(stayPackages)
    .where(eq(stayPackages.isActive, true))
    .orderBy(asc(stayPackages.sortOrder), asc(stayPackages.id));
}
