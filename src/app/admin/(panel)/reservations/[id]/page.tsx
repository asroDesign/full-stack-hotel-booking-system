import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowRight, BedDouble, Waves, ExternalLink } from "lucide-react";
import { db } from "@/db";
import { partners, reservationGuests, reservations } from "@/db/schema";
import { CheckButtons, CompanionsEditor, SourceBadge, SourceEditor } from "@/components/admin/frontdesk";
import { PageHeader } from "@/components/admin/ui";
import { ReservationActions, ReservationEditForm } from "@/components/admin/reservation-detail";
import { faNum, formatDateTime, formatJalali, formatPrice } from "@/lib/utils";

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r] = await db.select().from(reservations).where(eq(reservations.id, Number(id)));
  if (!r) notFound();
  const [companions, partnerList] = await Promise.all([
    db.select().from(reservationGuests).where(eq(reservationGuests.reservationId, r.id)),
    db.select({ id: partners.id, name: partners.name }).from(partners),
  ]);
  const partnerName = partnerList.find((p) => p.id === r.partnerId)?.name ?? null;
  const rows: [string, React.ReactNode][] = [
    ["کد پیگیری", <span key="t" className="font-mono" dir="ltr">{r.trackingCode}</span>],
    ["منبع رزرو", <SourceBadge key="src" source={r.source} partner={partnerName} />],
    ...(r.externalRef ? ([["شماره رزرو همکار", <span key="x" dir="ltr" className="font-mono">{r.externalRef}</span>]] as [string, React.ReactNode][]) : []),
    ...(r.commission > 0 ? ([["کمیسیون همکار", `${formatPrice(r.commission)} تومان`]] as [string, React.ReactNode][]) : []),
    ["پذیرش / تخلیه", r.checkedInAt ? `ورود ${formatDateTime(r.checkedInAt)}${r.checkedOutAt ? ` · خروج ${formatDateTime(r.checkedOutAt)}` : ""}` : "هنوز پذیرش نشده"],
    ["نوع", r.kind === "room" ? "اقامت در اتاق" : "خدمات / سانس"],
    ["مورد رزرو", r.itemName],
    [r.kind === "room" ? "ورود" : "تاریخ", formatJalali(r.checkIn, true)],
    r.kind === "room" ? ["خروج", `${formatJalali(r.checkOut, true)} · ${faNum(r.nights)} شب`] : ["سانس", <span key="s" dir="ltr">{faNum(r.timeSlot)}</span>],
    ["تعداد نفرات", `${faNum(r.guests)} نفر`],
    ...(r.discount > 0 ? ([["کد تخفیف", `${r.promoCode} (− ${formatPrice(r.discount)} تومان)`]] as [string, React.ReactNode][]) : []),
    ["مبلغ کل", `${formatPrice(r.totalPrice)} تومان`],
    ...(r.extraGuestFee > 0 ? ([["هزینه نفر اضافه", `${formatPrice(r.extraGuestFee)} تومان`]] as [string, React.ReactNode][]) : []),
    ...(r.optionsTotal > 0 ? ([["خدمات و وعده‌ها", `${formatPrice(r.optionsTotal)} تومان`]] as [string, React.ReactNode][]) : []),
    ["مانده قابل دریافت", r.settledAt ? `تسویه شد (${formatDateTime(r.settledAt)})` : `${formatPrice(Math.max(0, r.totalPrice - r.depositAmount))} تومان`],
    ["پیش‌پرداخت", `${formatPrice(r.depositAmount)} تومان`],
    ["روش پرداخت", r.paymentMethod === "gateway" ? "درگاه آنلاین" : r.paymentMethod === "card" ? "کارت به کارت" : r.paymentMethod === "manual" ? "ثبت دستی" : "—"],
    ["مرجع تراکنش", r.paymentRef ? <span key="p" className="font-mono" dir="ltr">{faNum(r.paymentRef)}</span> : "—"],
    ["زمان پرداخت", formatDateTime(r.paidAt)],
    ["زمان تایید", formatDateTime(r.confirmedAt)],
    ["پیامک کد رزرو", r.smsStatus === "sent" ? "ارسال شد" : r.smsStatus === "simulated" ? "شبیه‌سازی (پنل پیامک تنظیم نشده)" : r.smsStatus === "failed" ? "ناموفق" : "—"],
    ["زمان ثبت", formatDateTime(r.createdAt)],
  ];
  return (
    <div>
      <Link href="/admin/reservations" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700"><ArrowRight className="h-4 w-4" /> بازگشت به رزروها</Link>
      <PageHeader
        title={`رزرو ${r.guestName}`}
        desc={r.itemName}
        action={<Link href={`/track/${r.trackingCode}?phone=${r.phone}`} target="_blank" className="btn"><ExternalLink className="h-4 w-4" /> صفحه مهمان</Link>}
      />
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="card card-border bg-base-100 shadow-sm overflow-hidden block">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700">{r.kind === "room" ? <BedDouble className="h-5 w-5" /> : <Waves className="h-5 w-5" />}</span>
              <h3 className="font-extrabold text-slate-900">جزئیات درخواست</h3>
            </div>
            <dl className="grid sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-slate-100 px-5 py-3 text-sm sm:odd:border-l">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-left font-semibold text-slate-800">{v}</dd>
                </div>
              ))}
            </dl>
            {(r.nightly.length > 0 || r.options.length > 0) && (
              <div className="grid gap-4 border-b border-base-200 p-5 md:grid-cols-2">
                {r.nightly.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-bold">قیمت شب‌ها</div>
                    <ul className="space-y-1 text-xs">
                      {r.nightly.map((n) => (
                        <li key={n.date} className="flex justify-between gap-2">
                          <span>{formatJalali(n.date, true)} {n.kind === "holiday" && <span className="badge badge-error badge-soft badge-xs">تعطیل</span>}{n.kind === "peak" && <span className="badge badge-warning badge-soft badge-xs">پیک</span>}</span>
                          <span>{formatPrice(n.price)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.options.length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-bold">خدمات انتخابی</div>
                    <ul className="space-y-1 text-xs">
                      {r.options.map((o) => (
                        <li key={o.id} className="flex justify-between gap-2"><span>{o.title}</span><span>{o.amount ? formatPrice(o.amount) : "رایگان"}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {r.notes && <div className="bg-amber-50/60 p-5 text-sm leading-7 text-slate-700"><b>توضیحات مهمان:</b> {r.notes}</div>}
          </div>
          {r.kind === "room" && (
            <div className="card card-border bg-base-100 shadow-sm">
              <div className="card-body flex-row flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm"><b>میز پذیرش:</b><CheckButtons id={r.id} confirmed={r.status === "confirmed"} checkedIn={!!r.checkedInAt} checkedOut={!!r.checkedOutAt} />{r.status !== "confirmed" && <span className="text-xs text-base-content/50">پذیرش پس از قطعی شدن رزرو</span>}</div>
                <SourceEditor id={r.id} source={r.source} partnerId={r.partnerId} partners={partnerList} />
              </div>
            </div>
          )}
          {r.kind === "room" && <CompanionsEditor reservationId={r.id} initial={companions.map((c) => ({ fullName: c.fullName, idNumber: c.idNumber, nationality: c.nationality, phone: c.phone, relation: c.relation }))} />}
          <ReservationEditForm r={r} />
        </div>
        <div className="lg:sticky lg:top-8 lg:self-start">
          <ReservationActions r={r} />
        </div>
      </div>
    </div>
  );
}
