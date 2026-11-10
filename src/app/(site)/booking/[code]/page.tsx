import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BookingPayment from "@/components/booking/BookingPayment";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { SERVICE_TYPE } from "@/lib/constants";
import { getBookingByTracking, getSettings } from "@/lib/data";
import { formatJalali, formatMoney, formatDateTime, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "وضعیت رزرو",
  robots: { index: false },
};

export default async function BookingStatusPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [booking, settings] = await Promise.all([
    getBookingByTracking(decodeURIComponent(code)),
    getSettings(),
  ]);
  if (!booking) notFound();

  const paid = booking.paidAmount > 0;
  const confirmed = booking.status === "confirmed";
  const rejected = booking.status === "rejected";
  const cancelled = booking.status === "cancelled";

  const steps = [
    { title: "ثبت درخواست رزرو", done: true, desc: `درخواست شما در تاریخ ${formatJalali(booking.createdAt)} ثبت شد.` },
    {
      title: "پرداخت پیش‌پرداخت",
      done: paid,
      desc: paid
        ? `پیش‌پرداخت ${formatMoney(booking.paidAmount)} پرداخت شد.`
        : `پرداخت ${formatMoney(booking.prepaymentAmount)} از طریق کارت‌به‌کارت یا درگاه.`,
    },
    {
      title: "تأیید پذیرش",
      done: confirmed,
      desc: confirmed
        ? `پذیرش هتل رزرو را تأیید کرد${booking.reviewedAt ? ` (${formatJalali(booking.reviewedAt)})` : ""}.`
        : rejected
          ? "درخواست توسط پذیرش رد شد."
          : "در انتظار بررسی و تأیید تیم پذیرش.",
    },
    {
      title: "صدور کد رزرو",
      done: confirmed && Boolean(booking.reservationCode),
      desc: booking.reservationCode
        ? `کد رزرو شما: ${booking.reservationCode}`
        : "کد رزرو پس از تأیید پذیرش صادر می‌شود.",
    },
  ];

  return (
    <section className="container-x py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-gold-600">صفحه پیگیری رزرو</p>
          <h1 className="mt-1 text-2xl font-black text-forest-950">وضعیت درخواست شما</h1>
        </div>
        <Link href="/track" className="btn btn-ghost btn-sm">
          پیگیری کد دیگر
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-5">
          <div className="panel overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cream-200 bg-cream-100/60 px-5 py-4">
              <div>
                <p className="text-[10px] text-forest-800/55">کد پیگیری</p>
                <p dir="ltr" className="font-mono text-sm font-extrabold tracking-wider text-forest-950">
                  {booking.trackingCode}
                </p>
              </div>
              <BookingStatusBadge status={booking.status} size="md" />
            </div>

            <div className="space-y-5 p-5">
              {confirmed && booking.reservationCode ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                  <p className="text-[11px] font-bold text-emerald-700">🎉 رزرو شما قطعی شد — کد رزرو</p>
                  <p dir="ltr" className="mt-1 font-mono text-2xl font-black tracking-[0.2em] text-emerald-900">
                    {booking.reservationCode}
                  </p>
                  <p className="mt-2 text-[10px] leading-5 text-emerald-700/80">
                    این کد را در زمان ورود به پذیرش ارائه دهید. کد رزرو برای شماره {booking.phone} پیامک شده است.
                  </p>
                </div>
              ) : null}

              {rejected || cancelled ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[11px] leading-6 text-rose-800">
                  <p className="font-bold">{rejected ? "این درخواست رد شده است" : "این درخواست لغو شده است"}</p>
                  {booking.adminNote ? <p className="mt-1">توضیح پذیرش: {booking.adminNote}</p> : null}
                  <Link href="/booking" className="mt-2 inline-block font-bold underline underline-offset-4">
                    ثبت درخواست جدید
                  </Link>
                </div>
              ) : null}

              <ul className="steps steps-vertical w-full">
                {steps.map((step) => (
                  <li key={step.title} data-content={step.done ? "✓" : "•"} className={`step ${step.done ? "step-primary" : ""}`}>
                    <div className="w-full py-1 text-start">
                      <p className={`text-xs font-extrabold ${step.done ? "text-forest-950" : "text-forest-800/45"}`}>
                        {step.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-5 text-forest-800/60">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="grid gap-2 border-t border-cream-100 pt-4 sm:grid-cols-2">
                {[
                  { label: "نوع خدمت", value: SERVICE_TYPE[booking.serviceType]?.label ?? booking.serviceType },
                  { label: "خدمت انتخابی", value: booking.serviceLabel || booking.roomName || "—" },
                  { label: "تاریخ ورود", value: formatJalali(booking.checkIn, true) },
                  {
                    label: booking.serviceType === "room" ? "تاریخ خروج" : "سانس استخر",
                    value: booking.serviceType === "room" ? formatJalali(booking.checkOut, true) : booking.timeSlot ?? "—",
                  },
                  {
                    label: "مهمانان",
                    value: `${toFa(booking.adults)} بزرگسال${booking.children ? ` + ${toFa(booking.children)} کودک` : ""}${
                      booking.extraGuests ? ` (${toFa(booking.extraGuests)} نفر اضافه)` : ""
                    }`,
                  },
                  { label: "تعداد شب / سانس", value: toFa(booking.nights) },
                  { label: "نام مهمان", value: booking.guestName },
                  { label: "شماره تماس", value: toFa(booking.phone) },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-cream-100/60 px-3 py-2">
                    <p className="text-[10px] text-forest-800/50">{item.label}</p>
                    <p className="text-[11px] font-bold text-forest-950">{item.value}</p>
                  </div>
                ))}
              </div>
              {booking.notes ? (
                <div className="rounded-xl border border-cream-200 p-3 text-[11px] leading-6 text-forest-800/70">
                  <p className="font-bold text-forest-900">درخواست ویژه شما</p>
                  {booking.notes}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="panel space-y-3 p-5">
            <h2 className="text-sm font-extrabold text-forest-950">پرداخت و رزرو</h2>
            <dl className="space-y-2 text-[11px]">
              {booking.extraGuests > 0 ? (
                <div className="flex justify-between">
                  <dt className="text-forest-800/55">
                    هزینه {toFa(booking.extraGuests)} نفر اضافه
                  </dt>
                  <dd className="font-bold">{formatMoney(booking.extraGuests * booking.extraGuestFee)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-forest-800/55">مبلغ کل</dt>
                <dd className="font-bold">{formatMoney(booking.totalAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-forest-800/55">پیش‌پرداخت</dt>
                <dd className="font-bold text-forest-900">{formatMoney(booking.prepaymentAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-forest-800/55">پرداخت‌شده</dt>
                <dd className={`font-bold ${paid ? "text-emerald-700" : "text-rose-600"}`}>{formatMoney(booking.paidAmount)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-forest-800/55">مانده</dt>
                <dd className="font-bold">{formatMoney(Math.max(0, booking.totalAmount - booking.paidAmount))}</dd>
              </div>
              {booking.paymentRef ? (
                <div className="flex justify-between">
                  <dt className="text-forest-800/55">کد پیگیری پرداخت</dt>
                  <dd dir="ltr" className="font-mono font-bold">{booking.paymentRef}</dd>
                </div>
              ) : null}
              {booking.paidAt ? (
                <div className="flex flex-col gap-0.5 border-t border-cream-100 pt-2">
                  <dt className="text-forest-800/55">زمان پرداخت</dt>
                  <dd className="font-bold">{formatDateTime(booking.paidAt)}</dd>
                </div>
              ) : null}
            </dl>

            <BookingPayment
              trackingCode={booking.trackingCode}
              status={booking.status}
              prepaymentAmount={booking.prepaymentAmount}
              cardNumber={settings.cardNumber}
            />
          </div>

          <div className="rounded-2xl border border-gold-200 bg-gold-50 p-4 text-[11px] leading-6 text-gold-700">
            <p className="font-bold">پشتیبانی پذیرش</p>
            <p className="mt-1">در صورت وجود هر ابهام درباره رزرو، با ما تماس بگیرید:</p>
            <p dir="ltr" className="mt-1 font-bold">{settings.phone}</p>
            <Link href="/contact" className="mt-2 inline-block font-bold underline underline-offset-4">
              ارسال پیام به پذیرش
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
