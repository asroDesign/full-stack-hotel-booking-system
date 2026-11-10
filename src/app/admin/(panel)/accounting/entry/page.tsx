import { getAccounts } from "@/lib/accounting";
import { ManualVoucherForm, QuickEntryForm } from "@/components/admin/accounting-ui";

export default async function EntryPage() {
  const accs = await getAccounts();
  const rows = accs.map((a) => ({ id: a.id, code: a.code, name: a.name, level: a.level, type: a.type, parentId: a.parentId, isSystem: a.isSystem, isActive: a.isActive }));
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.6fr]">
      <QuickEntryForm accounts={rows} />
      <div id="voucher" className="scroll-mt-6"><ManualVoucherForm accounts={rows} /></div>
    </div>
  );
}
