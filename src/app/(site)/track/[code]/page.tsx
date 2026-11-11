import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { CheckCircle2, ClipboardList, CreditCard, FileCheck2, PartyPopper, Printer, Clock } from "lucide-react";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { cn, faNum, formatDateTime, formatJalali, formatPrice, statusMeta } from "@/lib/utils";
import { PaymentPanel } from "@/components/site/forms";
import { getPaymentGatewayOptions } from "@/lib/payment-gateways";
import { publicAccessPhone } from "@/lib/public-access";

export const metadata = { title: "وضعیت رزرو", robots: { index: false, follow: false } };

export default async function TrackDetail({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ new?: string; payment?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const phone = await publicAccessPhone("reservation", code);
  if (!phone) notFound();
  const [r] = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.trackingCode, decodeURIComponent(code)), eq(reservations.phone, phone)));
  if (!r) notFound();
  const s = await getSettings();
  const meta = statusMeta[r.status];
  const failed = r.status === "rejected" || r.status === "cancelled";
  const stepIndex = { pending_payment: 1, paid: 2, confirmed: 4, rejected: 2, cancelled: 1 }[r.status];
  const steps = [
    { Icon: ClipboardList, t: "ثبت درخواست" },
    { Icon: CreditCard, t: "پیش‌پرداخت" },
    { Icon: FileCheck2, t: "تایید پذیرش" },
    { Icon: CheckCircle2, t: "صدور کد رزرو" },
  ];

  return (
    <div className="relative overflow-hidden pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-brand-950 to-brand-800" />
      <div className="mx-auto max-w-4xl px-6">
        {sp.payment === "success" && <div role="alert" className="alert alert-success mb-6">پرداخت بانکی تأیید شد و برای بررسی پذیرش ثبت شد.</div>}
        {sp.payment === "failed" && <div role="alert" className="alert alert-error mb-6">پرداخت تأیید نشد. در صورت کسر وجه، رسید را نگه دارید و با پذیرش تماس بگیرید.</div>}
        {sp.payment === "processing" && <div role="alert" className="alert alert-warning mb-6">نتیجهٔ بانک هنوز دریافت نشده است. اگر وجه کسر شده، پرداخت را تکرار نکنید و با پذیرش تماس بگیرید.</div>}
        {sp.payment === "refund" && <div role="alert" className="alert alert-warning mb-6">پرداخت بانکی دریافت شده اما با رزرو تطبیق نداشت؛ پیگیری استرداد لازم است.</div>}
        {sp.new && r.status === "pending_payment" && (
          <div role="alert" className="alert alert-success mb-6 animate-fade-up shadow-xl">
            <PartyPopper className="h-6 w-6 shrink-0" />
            <div className="text-sm leading-7">
              درخواست شما ثبت شد. کد پیگیری <b className="font-mono">{r.trackingCode}</b> را یادداشت کنید و برای قطعی شدن، پیش‌پرداخت را انجام دهید.
            </div>
          </div>
        )}

        <div className="card card-border bg-base-100 shadow-sm overflow-hidden shadow-2xl block">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-6">
            <div>
              <div className="text-xs text-slate-500">کد پیگیری</div>
              <div className="font-mono text-2xl font-black text-slate-900" dir="ltr">{r.trackingCode}</div>
            </div>
            <span className={cn("badge badge-soft badge-lg gap-2 font-semibold", meta.badge)}>
              <span className={cn("status", meta.dot)} /> {meta.label}
            </span>
          </div>

          {/* Stepper (daisyUI steps) */}
          <div className="bg-base-200/60 px-2 py-6 sm:px-6">
            <ul className="steps w-full text-xs font-medium">
              {steps.map(({ t }, i) => {
                const done = !failed && i < stepIndex;
                const current = !failed && i === stepIndex;
                const bad = failed && i === stepIndex;
                return (
                  <li
                    key={t}
                    data-content={bad ? "✕" : done ? "✓" : faNum(i + 1)}
                    className={cn("step", done && "step-primary", current && "step-secondary", bad && "step-error", !done && !current && !bad && "text-base-content/40")}
                  >
                    {t}
                  </li>
                );
              })}
            </ul>
          </div>

          {r.status === "confirmed" && r.reservationCode && (
            <div className="m-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-950 p-6 text-center text-white">
              <CheckCircle2 className="mx-auto h-12 w-12 text-gold-300" />
              <div className="mt-3 text-sm text-white/70">رزرو شما قطعی شد · کد رزرو</div>
              <div className="mt-2 font-mono text-4xl font-black tracking-widest text-gold-300" dir="ltr">{r.reservationCode}</div>
              <p className="mt-3 text-sm text-white/70">این کد به شماره موبایل شما پیامک شد. آن را هنگام ورود به پذیرش ارائه دهید.</p>
            </div>
          )}
          {r.status === "paid" && (
            <div role="alert" className="alert alert-info alert-soft m-6 items-start text-sm leading-7">
              <Clock className="mt-1 h-5 w-5 shrink-0" />
              پیش‌پرداخت شما ثبت شد و در صف بررسی پذیرش است. پس از تایید، کد رزرو در همین صفحه نمایش داده می‌شود. توجه: تا قبل از صدور کد رزرو، رزرو قطعی نیست.
            </div>
          )}
          {failed && (
            <div role="alert" className="alert alert-error alert-soft m-6 block text-sm leading-7">
              این درخواست {r.status === "rejected" ? "توسط پذیرش رد شده" : "لغو شده"} است. {r.adminNote && <>توضیح: {r.adminNote}</>} در صورت پرداخت، مبلغ طی ۷۲ ساعت عودت داده می‌شود. برای اطلاعات بیشتر با <span dir="ltr">{faNum(s.phone)}</span> تماس بگیرید.
            </div>
          )}

          <div className="grid gap-6 p-6 md:grid-cols-2">
            <div className="space-y-3 text-sm">
              <h3 className="font-extrabold text-slate-900">جزئیات رزرو</h3>
              {[
                ["مورد رزرو", r.itemName],
                ...(r.stayPackageName ? [["بستهٔ اقامتی", r.stayPackageName] as const] : []),
                ["نام مهمان", r.guestName],
                ["موبایل", faNum(r.phone)],
                ["تعداد نفرات", `${faNum(r.guests)} نفر`],
                r.kind === "room" ? ["تاریخ ورود", formatJalali(r.checkIn, true)] : ["تاریخ", formatJalali(r.checkIn, true)],
                r.kind === "room" ? ["تاریخ خروج", `${formatJalali(r.checkOut, true)} (${faNum(r.nights)} شب)`] : ["سانس", faNum(r.timeSlot)],
                ["تاریخ ثبت", formatDateTime(r.createdAt)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-dashed border-slate-100 pb-2">
                  <span className="text-slate-500">{k}</span>
                  <span className="text-left font-semibold text-slate-800">{v}</span>
                </div>
              ))}
              <div className="rounded-2xl bg-slate-50 p-4">
                {r.discount > 0 && <div className="mb-2 flex justify-between text-success"><span>تخفیف ({r.promoCode})</span><span>− {formatPrice(r.discount)} تومان</span></div>}
                {r.extraGuestFee > 0 && <div className="mb-2 flex justify-between text-slate-500"><span>شامل هزینه نفر اضافه</span><span>{formatPrice(r.extraGuestFee)} تومان</span></div>}
                {r.stayPackageName && <div className="mb-2 flex justify-between text-slate-500"><span>{r.stayPackageName}</span><span>{r.stayPackagePrice > 0 ? `${formatPrice(r.stayPackagePrice)} تومان` : "هماهنگی با پذیرش"}</span></div>}
                <div className="flex justify-between"><span className="text-slate-500">مبلغ کل</span><span className="font-bold">{formatPrice(r.totalPrice)} تومان</span></div>
                <div className="mt-2 flex justify-between text-brand-800"><span>پیش‌پرداخت</span><span className="font-black">{formatPrice(r.depositAmount)} تومان</span></div>
                <div className="mt-2 flex justify-between text-slate-500"><span>مانده (هنگام ورود)</span><span>{formatPrice(r.totalPrice - r.depositAmount)} تومان</span></div>
                {r.paymentRef && <div className="mt-2 flex justify-between text-slate-500"><span>مرجع پرداخت</span><span className="font-mono" dir="ltr">{faNum(r.paymentRef)}</span></div>}
              </div>
            </div>
            <div>
              {r.status === "pending_payment" ? (
                <>
                  <h3 className="mb-3 font-extrabold text-slate-900">پرداخت پیش‌پرداخت</h3>
                  <PaymentPanel code={r.trackingCode} phone={r.phone} amount={r.depositAmount} cardNumber={s.cardNumber} cardHolder={s.cardHolder} bankName={s.bankName} gateways={getPaymentGatewayOptions(s)} />
                </>
              ) : (
                <div className="flex h-full flex-col justify-center gap-3 rounded-3xl bg-slate-50 p-6 text-center text-sm text-slate-600">
                  <p>برای هرگونه تغییر یا لغو، با پذیرش هتل تماس بگیرید.</p>
                  <a href={`tel:${s.phone}`} className="btn btn-primary" dir="ltr">{faNum(s.phone)}</a>
                  <Link href="/" className="btn">بازگشت به صفحه اصلی</Link>
                  {r.status === "confirmed" && <span className="flex items-center justify-center gap-1 text-xs text-slate-400"><Printer className="h-3.5 w-3.5" /> برای چاپ از Ctrl+P استفاده کنید</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
