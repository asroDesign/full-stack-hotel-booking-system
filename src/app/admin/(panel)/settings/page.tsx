import { getSettings } from "@/lib/data";
import { imageStats } from "@/app/actions/images";
import { ImageOptimizer } from "@/components/admin/image-optimizer";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm, PasswordForm } from "@/components/admin/settings-form";

export default async function Page() {
  const s = await getSettings();
  const img = await imageStats();
  return (
    <div>
      <PageHeader title="تنظیمات" desc="اطلاعات هتل، پرداخت، موقعیت مکانی و حساب کاربری" />
      <SettingsForm s={{ ...s, smsApiKey: "" }} />
      <div className="mt-6"><ImageOptimizer total={img.total} pending={img.pending} /></div>
      <div className="mt-6"><PasswordForm /></div>
    </div>
  );
}
