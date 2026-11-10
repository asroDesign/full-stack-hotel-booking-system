import { getAccounts } from "@/lib/accounting";
import { AccountsTree } from "@/components/admin/accounting-ui";

export default async function AccountsPage() {
  const accs = await getAccounts();
  return <AccountsTree key={accs.map((a) => `${a.id}${a.name}${a.isActive}`).join()} accounts={accs.map((a) => ({ id: a.id, code: a.code, name: a.name, level: a.level, type: a.type, parentId: a.parentId, isSystem: a.isSystem, isActive: a.isActive }))} />;
}
