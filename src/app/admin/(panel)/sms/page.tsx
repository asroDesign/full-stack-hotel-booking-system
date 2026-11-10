import { desc } from "drizzle-orm";
import { db } from "@/db";
import { smsLogs } from "@/db/schema";
import { getSettingsFresh } from "@/lib/data";
import { getSmsCredit, smsEventLabel } from "@/lib/sms";
import { asc } from "drizzle-orm";
import { customerGroups, smsTemplates } from "@/db/schema";
import { groupCounts } from "@/lib/crm";
import { SmsSendForm, TemplatesManager } from "@/components/admin/club";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/admin/ui";
import { SmsSettingsForm } from "@/components/admin/sms-settings";

export default async function SmsPage() {
  const s = await getSettingsFresh();
  const logs = await db.select().from(smsLogs).orderBy(desc(smsLogs.id)).limit(60);
  const [credit, groups, counts, templates] = await Promise.all([getSmsCredit(), db.select().from(customerGroups).orderBy(asc(customerGroups.id)), groupCounts(), db.select().from(smsTemplates)]);
  const gl = groups.map((g) => ({ id: g.id, name: g.name, count: counts.get(g.id) ?? 0 }));
  const tl = templates.map((t) => ({ id: t.id, title: t.title, body: t.body }));
  const masked = s.smsApiKey ? `${"•".repeat(8)}${s.smsApiKey.slice(-4)}` : "";
  return (
    <div>
      <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <SmsSendForm groups={gl} templates={tl} />
        <div className="space-y-6">
          <div className={`alert ${credit.ok ? "alert-info" : "alert-warning"} alert-soft`}><Wallet className="h-5 w-5" /><span>اعتبار پنل پیامک: <b>{credit.text}</b></span></div>
          <TemplatesManager templates={tl} />
        </div>
      </div>
      <PageHeader title="پنل پیامک" desc="ارسال پترن با کاوه‌نگار یا sms.ir: اطلاع رزرو به مدیر، ارسال کد رزرو و اعلام تایید/رد به مهمان" />
      <SmsSettingsForm
        s={{
          smsProvider: s.smsProvider,
          smsApiKeyMasked: masked,
          smsAdminMobiles: s.smsAdminMobiles,
          smsNotifyAdminOnRequest: s.smsNotifyAdminOnRequest,
          smsNotifyAdminOnPaid: s.smsNotifyAdminOnPaid,
          smsNotifyGuestOnRequest: s.smsNotifyGuestOnRequest,
          smsTplAdminReservation: s.smsTplAdminReservation,
          smsTplGuestRequest: s.smsTplGuestRequest,
          smsTplGuestConfirmed: s.smsTplGuestConfirmed,
          smsTplGuestRejected: s.smsTplGuestRejected,
          smsLineNumber: s.smsLineNumber,
          smsOptOutSuffix: s.smsOptOutSuffix,
        }}
        logs={logs.map((l) => ({ ...l, createdAt: l.createdAt.toISOString() }))}
        eventLabels={smsEventLabel}
      />
    </div>
  );
}
