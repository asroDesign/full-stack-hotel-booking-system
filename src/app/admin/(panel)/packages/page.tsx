import { asc } from "drizzle-orm";
import { db } from "@/db";
import { stayPackages } from "@/db/schema";
import { StayPackagesManager } from "@/components/admin/stay-packages-manager";

export default async function Page() {
  const packages = await db.select().from(stayPackages).orderBy(asc(stayPackages.sortOrder), asc(stayPackages.id));
  return <StayPackagesManager initial={packages} />;
}
