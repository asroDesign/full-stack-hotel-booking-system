import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customerGroups } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { CustomerForm } from "@/components/admin/club";

export default async function NewCustomer() {
  const groups = await db.select({ id: customerGroups.id, name: customerGroups.name }).from(customerGroups).where(eq(customerGroups.kind, "static"));
  return (
    <div className="max-w-3xl">
      <PageHeader title="مشتری جدید" />
      <CustomerForm groups={groups} c={{ name: "", phone: "", email: "", nationalId: "", birthDate: null, gender: "", city: "", tags: [], notes: "", smsOptIn: true, groupIds: [] }} />
    </div>
  );
}
