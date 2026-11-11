import { getAccounts, getCostCenters } from "@/lib/accounting";
import { ManualVoucherForm, QuickEntryForm } from "@/components/admin/accounting-ui";

export default async function EntryPage() {
  const [accs, centers] = await Promise.all([getAccounts(), getCostCenters(true)]);
  const rows = accs.map((a) => ({ id: a.id, code: a.code, name: a.name, level: a.level, type: a.type, parentId: a.parentId, isSystem: a.isSystem, isActive: a.isActive }));
  const costCenters = centers.map(({ id, code, name, isActive }) => ({ id, code, name, isActive }));
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
      <QuickEntryForm accounts={rows} costCenters={costCenters} />
      <div id="voucher" className="scroll-mt-6"><ManualVoucherForm accounts={rows} costCenters={costCenters} /></div>
    </div>
  );
}
