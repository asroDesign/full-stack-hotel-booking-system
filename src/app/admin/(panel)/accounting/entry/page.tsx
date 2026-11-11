import { getAccounts, getCostCenters } from "@/lib/accounting";
import { AccountingEntryWorkspace } from "@/components/admin/accounting-ui";

export default async function EntryPage() {
  const [accounts, centers] = await Promise.all([getAccounts(), getCostCenters(true)]);
  const rows = accounts.map((account) => ({ id: account.id, code: account.code, name: account.name, level: account.level, type: account.type, parentId: account.parentId, isSystem: account.isSystem, isActive: account.isActive }));
  const costCenters = centers.map(({ id, code, name, isActive }) => ({ id, code, name, isActive }));
  return <AccountingEntryWorkspace accounts={rows} costCenters={costCenters} />;
}
