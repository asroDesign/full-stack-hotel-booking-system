import { notFound } from "next/navigation";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { db } from "@/db";
import { diningVenues, menuItems } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { MenuEditor, VenueForm } from "@/components/admin/dining-admin";

export default async function EditVenue({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [venue] = await db.select().from(diningVenues).where(eq(diningVenues.id, Number(id)));
  if (!venue) notFound();
  const items = await db.select().from(menuItems).where(eq(menuItems.venueId, venue.id)).orderBy(asc(menuItems.sortOrder), asc(menuItems.id));
  return (
    <div className="space-y-8">
      <PageHeader title={venue.name} desc="اطلاعات و منو" action={<Link href={`/dining/${venue.slug}`} target="_blank" className="btn"><ExternalLink className="h-4 w-4" /> مشاهده در سایت</Link>} />
      {sp.saved && <div role="alert" className="alert alert-success alert-soft text-sm">اطلاعات ذخیره شد.</div>}
      <MenuEditor venueId={venue.id} initial={items} />
      <VenueForm venue={venue} />
    </div>
  );
}
