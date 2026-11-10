import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { services } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { ServiceForm } from "@/components/admin/services-admin";

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [service] = await db.select().from(services).where(eq(services.id, Number(id)));
  if (!service) notFound();
  return (
    <div>
      <PageHeader title={`ویرایش ${service.name}`} />
      <ServiceForm service={service} />
    </div>
  );
}
