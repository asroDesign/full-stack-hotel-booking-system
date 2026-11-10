import { asc } from "drizzle-orm";
import { db } from "@/db";
import { customerGroups } from "@/db/schema";
import { PageHeader } from "@/components/admin/ui";
import { GroupsManager } from "@/components/admin/club";
import { groupCounts } from "@/lib/crm";

export default async function GroupsPage() {
  const [groups, counts] = await Promise.all([db.select().from(customerGroups).orderBy(asc(customerGroups.id)), groupCounts()]);
  return (
    <div>
      <PageHeader title="گروه‌بندی مشتریان" desc="گروه‌های هوشمند (بر اساس سطح، اقامت، تولد، شهر، برچسب) یا دستی برای هدف‌گیری کمپین‌ها" />
      <GroupsManager groups={groups} counts={Object.fromEntries(counts)} />
    </div>
  );
}
