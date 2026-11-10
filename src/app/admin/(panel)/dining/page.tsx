import Link from "next/link";
import { asc, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/db";
import { diningVenues, menuItems } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { VenuesList } from "@/components/admin/dining-admin";

export default async function DiningAdmin() {
  const [list, counts] = await Promise.all([
    db.select().from(diningVenues).orderBy(asc(diningVenues.sortOrder), asc(diningVenues.id)),
    db.select({ venueId: menuItems.venueId, c: sql<number>`count(*)::int` }).from(menuItems).groupBy(menuItems.venueId),
  ]);
  return (
    <div>
      <PageHeader title="رستوران و کافه" desc="معرفی رستوران‌ها، کافه‌ها و منوی آن‌ها" action={<Link href="/admin/dining/new" className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن</Link>} />
      <VenuesList key={list.map((v) => `${v.id}${v.isActive}`).join()} initial={list} counts={Object.fromEntries(counts.map((c) => [c.venueId, c.c]))} />
    </div>
  );
}
