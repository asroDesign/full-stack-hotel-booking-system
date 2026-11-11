import { CostCenterManager } from "@/components/admin/accounting-ui";
import { getCostCenters } from "@/lib/accounting";

export default async function CostCentersPage() {
  const centers = (await getCostCenters()).map(({ id, code, name, isActive }) => ({ id, code, name, isActive }));
  return <div className="space-y-4"><div><h2 className="text-xl font-black">تعریف و مدیریت مراکز هزینه</h2><p className="mt-1 text-sm text-base-content/60">هزینه‌های هتل را به بخش‌هایی مانند پذیرش، خانه‌داری، رستوران و تأسیسات نسبت دهید.</p></div><CostCenterManager centers={centers} /></div>;
}
