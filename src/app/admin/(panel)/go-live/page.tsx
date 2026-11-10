import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { admins, settings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { defaultSettings, getSettingsFresh } from "@/lib/data";
import { adminUsesDefaultPassword, demoDataCounts, getDemoState } from "@/lib/demo";
import { PageHeader } from "@/components/admin/ui";
import { AdminProfileForm, DemoCleanupCard, DemoModeCard, GoLiveChecklist, type CheckItem } from "@/components/admin/go-live";

export default async function GoLivePage() {
  const me = await requireAdmin();
  const [s, demo, counts, usesDefault, [admin], contentRows] = await Promise.all([
    getSettingsFresh(),
    getDemoState(),
    demoDataCounts(),
    adminUsesDefaultPassword(me.id),
    db.select().from(admins).where(eq(admins.id, me.id)),
    db.select({ key: settings.key }).from(settings).where(inArray(settings.key, ["content_home", "content_booking"])),
  ]);
  const demoLeft = counts.reservations + counts.messages + counts.testimonials + counts.vouchers;
  // dining demo is optional (the hotel may keep and edit the sample venues)
  const savedContent = new Set(contentRows.map((r) => r.key));

  const items: CheckItem[] = [
    { key: "pw", title: "تغییر ایمیل و رمز عبور مدیر", desc: "رمز پیش‌فرض نسخه نمایشی برای همه شناخته‌شده است.", ok: !usesDefault, href: "#account", action: "تغییر رمز", critical: true },
    { key: "demo", title: "خروج از حالت نمایشی", desc: "اطلاعات ورود آزمایشی نباید در صفحه ورود نمایش داده شود.", ok: !demo.showCredentials && !demo.enabled, href: "#demo", action: "خروج", critical: true },
    { key: "data", title: "پاکسازی داده‌های نمایشی", desc: "رزروها، اسناد مالی، پیام‌ها و نظرات نمونه حذف شوند.", ok: demoLeft === 0, href: "#cleanup", action: "پاکسازی" },
    { key: "contact", title: "اطلاعات تماس و آدرس هتل", desc: "تلفن، موبایل، ایمیل، آدرس و مختصات نقشه را وارد کنید.", ok: s.phone !== defaultSettings.phone && s.address !== defaultSettings.address, href: "/admin/settings", action: "تنظیمات" },
    { key: "bank", title: "اطلاعات حساب بانکی پیش‌پرداخت", desc: "شماره کارت نمونه است؛ شماره کارت واقعی را وارد کنید.", ok: s.cardNumber !== defaultSettings.cardNumber, href: "/admin/settings", action: "تنظیمات", critical: true },
    { key: "sms", title: "اتصال پنل پیامک", desc: "کاوه‌نگار یا sms.ir برای اطلاع رزرو و ارسال کد رزرو.", ok: s.smsProvider !== "none" && !!s.smsApiKey && !!s.smsTplGuestConfirmed, href: "/admin/sms", action: "پنل پیامک" },
    { key: "home", title: "تصاویر و ویدیوهای واقعی صفحه اصلی", desc: "ویدیو و تصاویر نمونه را با تصاویر هتل جایگزین کنید.", ok: savedContent.has("content_home"), href: "/admin/home", action: "صفحه اصلی" },
    { key: "rules", title: "بازبینی قوانین رزرو و اقامت", desc: "قوانین نمونه را با قوانین واقعی هتل جایگزین کنید.", ok: savedContent.has("content_booking"), href: "/admin/booking-page", action: "قوانین" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="راه‌اندازی نهایی و خروج از دمو" desc="سایت را برای استفاده واقعی آماده کنید" />
      <GoLiveChecklist items={items} />
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <AdminProfileForm name={admin?.name ?? ""} email={admin?.email ?? ""} usesDefault={usesDefault} />
        <div className="space-y-6">
          <div id="demo" className="scroll-mt-6"><DemoModeCard enabled={demo.enabled} forced={demo.forced} showCredentials={demo.showCredentials} /></div>
          <div id="cleanup" className="scroll-mt-6"><DemoCleanupCard counts={counts} /></div>
        </div>
      </div>
    </div>
  );
}
