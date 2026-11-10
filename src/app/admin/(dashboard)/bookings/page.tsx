import BookingsAdmin, { type AdminBooking } from "@/components/admin/BookingsAdmin";
import { AdminPageHeader, StatCard } from "@/components/admin/ui";
import { getBookings, getDashboardStats } from "@/lib/data";
import { formatMoney, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminBookingsPage() {
  const [bookings, stats] = await Promise.all([getBookings({ limit: 300 }), getDashboardStats()]);

  const items: AdminBooking[] = bookings.map((booking) => ({
    id: booking.id,
    trackingCode: booking.trackingCode,
    reservationCode: booking.reservationCode,
    guestName: booking.guestName,
    phone: booking.phone,
    email: booking.email,
    serviceType: booking.serviceType,
    serviceLabel: booking.serviceLabel,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    timeSlot: booking.timeSlot,
    nights: booking.nights,
    adults: booking.adults,
    children: booking.children,
    extraGuests: booking.extraGuests,
    extraGuestFee: booking.extraGuestFee,
    totalAmount: booking.totalAmount,
    prepaymentAmount: booking.prepaymentAmount,
    paidAmount: booking.paidAmount,
    paymentRef: booking.paymentRef,
    status: booking.status,
    notes: booking.notes,
    adminNote: booking.adminNote,
    paidAt: booking.paidAt ? booking.paidAt.toISOString() : null,
    createdAt: booking.createdAt.toISOString(),
    roomName: booking.roomName,
  }));

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="عملیات پذیرش"
        title="مدیریت رزروها"
        description="پرداخت‌ها را بررسی کنید، رزرو را تأیید و کد رزرو صادر نمایید یا در صورت نبود ظرفیت، درخواست را رد کنید."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="کل درخواست‌ها" value={toFa(stats.totalBookings)} icon="🧾" />
        <StatCard
          label="در انتظار تأیید"
          value={toFa(stats.awaitingReview)}
          icon="⏳"
          tone="warning"
          hint="پرداخت‌شده، آماده صدور کد"
        />
        <StatCard label="در انتظار پرداخت" value={toFa(stats.pendingPayment)} icon="💳" tone="gold" />
        <StatCard label="پیش‌پرداخت دریافتی" value={formatMoney(stats.paidRevenue)} icon="✅" tone="dark" />
      </div>

      <BookingsAdmin initialBookings={items} />
    </div>
  );
}
