import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, Clock } from "lucide-react";
import { db } from "@/db";
import { giftCards } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { normalizeMobile } from "@/lib/crm";
import { GiftPayForm } from "@/components/site/guest-ui";
import { formatJalali, formatPrice } from "@/lib/utils";

export const metadata = { title: "سفارش کارت هدیه" };

export default async function GiftOrder({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const [g] = await db.select().from(giftCards).where(and(eq(giftCards.id, Number(id)), eq(giftCards.purchaserPhone, normalizeMobile(sp.p ?? ""))));
  if (!g) notFound();
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-xl px-4 pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
      <div className="tpl-card rounded-box bg-base-100 p-6 shadow-xl ring-1 ring-base-300">
        <h1 className="text-2xl font-black text-brand-900">کارت هدیه {formatPrice(g.initialAmount)} تومان</h1>
        <p className="mt-1 text-sm text-base-content/60">{g.recipientName ? `برای ${g.recipientName}` : "خرید برای خودتان"} · خریدار: {g.purchaserName}</p>
        {g.status === "active" || g.status === "used" ? (
          <div className="mt-6 rounded-box bg-gradient-to-br from-brand-800 to-brand-950 p-6 text-center text-white">
            <CheckCircle2 className="mx-auto h-10 w-10 text-gold-300" />
            <div className="mt-2 text-sm text-white/70">کد کارت هدیه</div>
            <div className="mt-1 font-mono text-3xl font-black tracking-widest text-gold-300" dir="ltr">{g.code}</div>
            <div className="mt-2 text-sm text-white/70">مانده: {formatPrice(g.balance)} تومان · اعتبار تا {formatJalali(g.expiresAt)}</div>
            {g.recipientPhone && <p className="mt-3 text-xs text-white/60">کد برای گیرنده پیامک شد.</p>}
          </div>
        ) : g.status === "pending_payment" && g.paymentRef ? (
          <div role="alert" className="alert alert-info alert-soft mt-6"><Clock className="h-5 w-5" /><span>اطلاعات واریز ثبت شده است؛ پس از تایید مالی، کارت فعال و کد آن پیامک می‌شود.</span></div>
        ) : g.status === "void" ? (
          <div role="alert" className="alert alert-error alert-soft mt-6">این سفارش باطل شده است.</div>
        ) : (
          <div className="mt-6"><GiftPayForm id={g.id} phone={g.purchaserPhone} amount={g.initialAmount} card={{ number: s.cardNumber, holder: s.cardHolder, bank: s.bankName }} /></div>
        )}
        <Link href="/gift-cards" className="btn btn-ghost btn-block mt-4">بازگشت</Link>
      </div>
    </div>
  );
}
