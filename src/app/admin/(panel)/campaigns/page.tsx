import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus, Megaphone } from "lucide-react";
import { db } from "@/db";
import { campaigns } from "@/db/schema";
import { PageHeader, EmptyBox } from "@/components/admin/ui";
import { CampaignDelete, RunJobsButton } from "@/components/admin/club";
import { cn, faNum, formatDateTime } from "@/lib/utils";

const ST: Record<string, [string, string]> = { draft: ["پیش‌نویس", "badge-ghost"], scheduled: ["زمان‌بندی‌شده", "badge-info"], sending: ["در حال ارسال", "badge-warning"], sent: ["ارسال‌شده", "badge-success"], failed: ["ناموفق", "badge-error"] };

export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const sp = await searchParams;
  const list = await db.select().from(campaigns).orderBy(desc(campaigns.id));
  return (
    <div className="space-y-5">
      <PageHeader title="کمپین‌های بازاریابی" desc="ارسال پیامک تخفیفی به گروه‌های مشتریان با کد اختصاصی یا مشترک" action={<div className="flex gap-2"><RunJobsButton /><Link href="/admin/campaigns/new" className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> کمپین جدید</Link></div>} />
      {sp.saved && <div role="alert" className="alert alert-success alert-soft text-sm">{sp.saved === "send" ? "کمپین در صف ارسال قرار گرفت؛ نتیجه چند لحظه دیگر در همین صفحه نمایش داده می‌شود." : sp.saved === "schedule" ? "کمپین زمان‌بندی شد." : "پیش‌نویس ذخیره شد."}</div>}
      {list.length === 0 ? (
        <EmptyBox title="هنوز کمپینی ساخته نشده" icon={<Megaphone className="h-6 w-6" />} action={<Link href="/admin/campaigns/new" className="btn btn-primary">ساخت اولین کمپین</Link>} />
      ) : (
        <div className="grid gap-3">
          {list.map((c) => (
            <div key={c.id} className="card card-border bg-base-100 shadow-sm">
              <div className="card-body gap-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2"><b>{c.name}</b><span className={cn("badge badge-sm", ST[c.status]?.[1])}>{ST[c.status]?.[0]}</span>{c.promoMode !== "none" && <span className="badge badge-secondary badge-sm">{c.promoMode === "unique" ? "کد اختصاصی" : `کد ${c.promoCode || "مشترک"}`} · {c.promoKind === "percent" ? `${faNum(c.promoValue)}٪` : faNum(c.promoValue)}</span>}</div>
                  {["draft", "scheduled", "failed"].includes(c.status) && <CampaignDelete id={c.id} />}
                </div>
                <p className="line-clamp-2 text-sm text-base-content/65">{c.message}</p>
                <div className="flex flex-wrap gap-4 text-xs text-base-content/60">
                  <span>مخاطب: {c.audience.all ? "همه مشتریان" : `${faNum(c.audience.groupIds?.length ?? 0)} گروه${c.audience.tiers?.length ? ` · ${faNum(c.audience.tiers.length)} سطح` : ""}`}</span>
                  <span>گیرندگان: {faNum(c.recipients)}</span>
                  <span className="text-success">ارسال‌شده: {faNum(c.sent)}</span>
                  {c.failed > 0 && <span className="text-error">ناموفق: {faNum(c.failed)}</span>}
                  {c.scheduledAt && c.status === "scheduled" && <span>زمان ارسال: {formatDateTime(c.scheduledAt)}</span>}
                  {c.sentAt && <span>ارسال: {formatDateTime(c.sentAt)}</span>}
                </div>
                {c.status === "failed" && c.sent === 0 && <div role="alert" className="alert alert-warning alert-soft py-2 text-xs">ارسال انجام نشد؛ پنل پیامک، کلید API و «شماره خط ارسال» را در مرکز پیامک تنظیم کنید و کمپین را دوباره بسازید.</div>}
                {c.recipients > 0 && <progress className="progress progress-success h-1.5 w-full" value={c.sent} max={c.recipients} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
