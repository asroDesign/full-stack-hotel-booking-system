import { asc } from "drizzle-orm";
import { db } from "@/db";
import { customerGroups, smsTemplates } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { CampaignForm } from "@/components/admin/club";
import { groupCounts } from "@/lib/crm";

export default async function NewCampaign() {
  const [groups, counts, templates] = await Promise.all([db.select().from(customerGroups).orderBy(asc(customerGroups.id)), groupCounts(), db.select().from(smsTemplates)]);
  return (
    <div>
      <PageHeader title="کمپین جدید" desc="متن، مخاطبان، کد تخفیف و زمان ارسال را مشخص کنید" />
      <CampaignForm groups={groups.map((g) => ({ id: g.id, name: g.name, count: counts.get(g.id) ?? 0 }))} templates={templates.map((t) => ({ id: t.id, title: t.title, body: t.body }))} />
    </div>
  );
}
