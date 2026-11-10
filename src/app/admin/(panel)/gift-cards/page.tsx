import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { giftCards, giftCardTx } from "@/db/schema";
import { PageHeader, EmptyBox } from "@/components/admin/ui";
import { GiftCardActions, IssueGiftCard } from "@/components/admin/club";
import { giftStatusMeta } from "@/lib/giftcards";
import { cn, faNum, formatDateTime, formatJalali, formatPrice } from "@/lib/utils";

export default async function GiftCardsPage() {
  const list = await db.select().from(giftCards).orderBy(desc(giftCards.id)).limit(500);
  const txCount = await db.select({ id: giftCardTx.giftCardId, c: sql<number>`count(*) filter (where ${giftCardTx.amount} < 0)::int` }).from(giftCardTx).groupBy(giftCardTx.giftCardId);
  const used = new Set(txCount.filter((t) => t.c > 0).map((t) => t.id));
  const active = list.filter((g) => g.status === "active");
  const sold = list.filter((g) => g.status !== "pending_payment" && g.status !== "void" && g.issuedBy !== "complimentary").reduce((s, g) => s + g.initialAmount, 0);
  return (
    <div className="space-y-5">
      <PageHeader title="کارت‌های هدیه" desc="فروش آنلاین در سایت، صدور در پنل، پرداخت پیش‌پرداخت رزرو با کارت هدیه" action={<IssueGiftCard />} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><div className="text-xs text-base-content/60">مجموع فروش</div><div className="text-xl font-black">{formatPrice(sold)}</div></div></div>
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><div className="text-xs text-base-content/60">کارت‌های فعال</div><div className="text-xl font-black">{faNum(active.length)}</div></div></div>
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><div className="text-xs text-base-content/60">مانده تعهد (بدهی)</div><div className="text-xl font-black">{formatPrice(active.reduce((s, g) => s + g.balance, 0))}</div></div></div>
        <div className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4"><div className="text-xs text-base-content/60">در انتظار تایید پرداخت</div><div className="text-xl font-black text-warning">{faNum(list.filter((g) => g.status === "pending_payment").length)}</div></div></div>
      </div>
      {list.length === 0 ? <EmptyBox title="هنوز کارت هدیه‌ای صادر نشده" /> : (
        <div className="card card-border overflow-x-auto bg-base-100 shadow-sm">
          <table className="table table-sm min-w-[900px]">
            <thead className="bg-base-200"><tr><th>کد</th><th>مبلغ / مانده</th><th>خریدار</th><th>گیرنده</th><th>وضعیت</th><th>اعتبار</th><th>تاریخ</th><th /></tr></thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.id}>
                  <td className="font-mono font-bold" dir="ltr">{g.code}</td>
                  <td>{formatPrice(g.initialAmount)}<div className="text-xs text-success">مانده {formatPrice(g.balance)}</div></td>
                  <td>{g.purchaserName}<div className="text-xs text-base-content/50" dir="ltr">{faNum(g.purchaserPhone)}</div></td>
                  <td>{g.recipientName || "—"}<div className="text-xs text-base-content/50" dir="ltr">{faNum(g.recipientPhone)}</div></td>
                  <td><span className={cn("badge badge-sm", giftStatusMeta[g.status]?.badge)}>{giftStatusMeta[g.status]?.label}</span>{g.paymentRef && <div className="text-[10px] text-base-content/50" dir="ltr">{g.paymentMethod} {g.paymentRef}</div>}{g.issuedBy === "complimentary" && <div className="text-[10px] text-secondary">اهدایی</div>}</td>
                  <td>{g.expiresAt ? formatJalali(g.expiresAt) : "—"}</td>
                  <td className="text-xs">{formatDateTime(g.createdAt)}</td>
                  <td><GiftCardActions id={g.id} status={g.status} used={used.has(g.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
