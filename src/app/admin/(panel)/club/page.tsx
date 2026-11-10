import { getSettingsFresh } from "@/lib/data";
import { PageHeader } from "@/components/admin/ui";
import { ClubSettingsForm } from "@/components/admin/club-settings";
import { RunJobsButton } from "@/components/admin/club";

export default async function ClubSettingsPage() {
  const s = await getSettingsFresh();
  const keys = ["clubEnabled", "tierSilver", "tierGold", "tierPlatinum", "pointsPer", "birthdayEnabled", "birthdayPercent", "birthdayValidDays", "birthdayDaysBefore", "birthdayMessage", "reviewInviteEnabled", "reviewInviteMessage", "siteUrl", "giftCardAmounts", "giftCardMin", "giftCardValidMonths", "stayPortalEnabled", "wifiName", "wifiPassword", "receptionExt", "tableSmsOnConfirm"] as const;
  return (
    <div>
      <PageHeader title="تنظیمات باشگاه مشتریان" desc="سطوح عضویت، تخفیف تولد، دعوت به ثبت نظر، کارت هدیه و پرتال مهمانان" action={<RunJobsButton />} />
      <ClubSettingsForm s={Object.fromEntries(keys.map((k) => [k, s[k]]))} />
    </div>
  );
}
