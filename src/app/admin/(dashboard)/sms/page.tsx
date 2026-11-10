import { desc } from "drizzle-orm";
import { db } from "@/db";
import { smsLogs } from "@/db/schema";
import SmsTester from "@/components/admin/SmsTester";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { smsConfigured, smsProvider } from "@/lib/sms";
import { formatDateTime, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

const ENV_KEYS = [
  "SMS_PROVIDER",
  "ADMIN_SMS_PHONE",
  "KAVENEGAR_API_KEY",
  "KAVENEGAR_PATTERN_ADMIN_BOOKING",
  "KAVENEGAR_PATTERN_GUEST_RESERVATION",
  "KAVENEGAR_PATTERN_GUEST_STATUS",
  "SMSIR_API_KEY",
  "SMSIR_TEMPLATE_ADMIN_BOOKING",
  "SMSIR_TEMPLATE_GUEST_RESERVATION",
  "SMSIR_TEMPLATE_GUEST_STATUS",
];

export default async function AdminSmsPage() {
  const logs = await db.select().from(smsLogs).orderBy(desc(smsLogs.createdAt)).limit(100);
  const provider = smsProvider();
  const configured = smsConfigured();

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="اطلاع‌رسانی پیامکی"
        title="پیامک‌ها (کاوه‌نگار / sms.ir)"
        description="ارسال پیامکی رزرو جدید به مدیر، ارسال کد رزرو به مهمان و اطلاع‌رسانی تأیید یا رد رزرو؛ همه با متد پترن."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="سرویس‌دهنده فعال" value={provider === "smsir" ? "sms.ir" : "کاوه‌نگار"} icon="📨" />
        <StatCard label="وضعیت تنظیمات" value={configured ? "آماده ارسال" : "تنظیم نشده"} icon={configured ? "✅" : "⚠️"} tone={configured ? "success" : "warning"} />
        <StatCard label="پیام ارسال‌شده" value={toFa(logs.filter((log) => log.status === "sent").length)} icon="📤" tone="gold" />
        <StatCard label="کل لاگ‌ها" value={toFa(logs.length)} icon="🗂️" tone="dark" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr] xl:items-start">
        <div className="space-y-4">
          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
            <h2 className="text-xs font-extrabold text-forest-950">تنظیمات مورد نیاز (متغیرهای محیطی)</h2>
            <p className="mt-1 text-[10px] leading-5 text-forest-800/55">
              مقادیر حساس در سرور نگهداری می‌شوند و هرگز به مرورگر ارسال نمی‌شوند. برای فعال‌سازی، کلید API و شناسه
              پترن‌ها را در محیط اجرا تنظیم کنید.
            </p>
            <div className="mt-2 space-y-1">
              {ENV_KEYS.map((key) => (
                <div key={key} className="flex items-center justify-between gap-2 rounded-lg bg-cream-50 px-2 py-1.5">
                  <span dir="ltr" className="font-mono text-[10px] text-forest-800/70">{key}</span>
                  <span className={`badge badge-sm ${process.env[key] ? "badge-success" : "badge-ghost"}`}>
                    {process.env[key] ? "تنظیم شده" : "خالی"}
                  </span>
                </div>
              ))}
            </div>
          </section>
          <SmsTester configured={configured} />
        </div>

        <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
          <h2 className="mb-2 text-xs font-extrabold text-forest-950">آخرین پیامک‌ها</h2>
          {logs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-cream-300 py-10 text-center text-[11px] text-forest-800/50">
              هنوز پیامکی ارسال نشده است. پس از تنظیم کلید API، با ثبت یک رزرو یا ارسال آزمایشی، لاگ‌ها اینجا نمایش داده
              می‌شوند.
            </p>
          ) : (
            <div className="max-h-[65vh] overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[10px]">
                    <th>گیرنده</th>
                    <th>پترن</th>
                    <th>وضعیت</th>
                    <th>زمان</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="text-[10px]">
                      <td dir="ltr" className="font-mono">{toFa(log.receptor)}</td>
                      <td className="max-w-40 truncate" dir="ltr">{log.pattern}</td>
                      <td>
                        <span
                          className={`badge badge-sm ${
                            log.status === "sent" ? "badge-success" : log.status === "failed" ? "badge-error" : "badge-ghost"
                          }`}
                        >
                          {log.status === "sent" ? "ارسال شد" : log.status === "failed" ? "خطا" : log.status === "not_configured" ? "تنظیم نشده" : log.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-forest-800/50">{formatDateTime(log.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
