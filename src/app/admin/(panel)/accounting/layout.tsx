import type { ReactNode } from "react";
import { AccountingTabs } from "@/components/admin/accounting-ui";
import { ensureAccounts } from "@/lib/accounting";

export default async function AccountingLayout({ children }: { children: ReactNode }) {
  await ensureAccounts();
  return (
    <div>
      <div className="mb-4 print:hidden">
        <h1 className="text-2xl font-black">حسابداری دوطرفه</h1>
        <p className="mt-1 text-sm text-base-content/60">اسناد خودکار رزروها، ثبت دستی درآمد و هزینه، دفاتر و گزارش‌های مالی</p>
      </div>
      <AccountingTabs />
      {children}
    </div>
  );
}
