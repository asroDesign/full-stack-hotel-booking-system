import Link from "next/link";
import { AdminPageHeader, MiniBars, Panel, StatCard } from "@/components/admin/ui";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { BOOKING_STATUS, BOOKING_STATUS_ORDER, SERVICE_TYPE, type BookingStatus } from "@/lib/constants";
import {
  countNewConcierge,
  countPendingReviews,
  countSubscribers,
  getBookings,
  getDashboardStats,
  getUpcomingBookings,
} from "@/lib/data";
import { isDemoMode } from "@/lib/runtime-mode";
import { formatCompactMoney, formatJalali, formatMoney, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, recent, upcoming, pendingReviews, subscribersCount, conciergeCount] = await Promise.all([
    getDashboardStats(),
    getBookings({ limit: 6 }),
    getUpcomingBookings(4),
    countPendingReviews(),
    countSubscribers(),
    countNewConcierge(),
  ]);
  const attention = [
    { label: "نظر در انتظار تأیید", value: pendingReviews, href: "/admin/reviews", icon: "★" },
    { label: "درخواست کانسیرژ", value: conciergeCount, href: "/admin/concierge", icon: "🛎️" },
    { label: "مشترک خبرنامه", value: subscribersCount, href: "/admin/subscribers", icon: "📧" },
  ];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        kicker="نمای کلی"
        title="داشبورد مدیریت کاج"
        description="وضعیت رزروها، درآمد پیش‌پرداخت‌ها و کارهای در انتظار بررسی را در یک نگاه ببینید."
        action={
          <>
            <Link href="/admin/bookings?status=awaiting_review" className="btn btn-ghost btn-sm">
              بررسی رزروهای در انتظار
            </Link>
            <Link href="/admin/rooms" className="btn btn-primary btn-sm">
              مدیریت اتاق‌ها
            </Link>
          </>
        }
      />

      {isDemoMode() ? (
        <div className="alert alert-warning items-start gap-2 rounded-2xl border-gold-200 bg-gold-50 py-3 text-[11px] leading-6 text-gold-700">
          <span aria-hidden="true">⚠️</span>
          <span>
            <b>حالت دمو فعال است.</b> داده‌های دمو فقط زمانی درج می‌شوند که دیتابیس خالی باشد و هیچ داده‌ای را بازنویسی
            یا حذف نمی‌کنند. برای خروج از حالت دمو، متغیر محیطی <code className="font-mono">DEMO_MODE=false</code> را تنظیم
            کنید و <code className="font-mono">NEXT_PUBLIC_DEMO_CREDENTIALS</code> را حذف نمایید؛ داده‌های فعلی حفظ
            می‌شوند.
          </span>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="کل رزروها"
          value={toFa(stats.totalBookings)}
          hint={`${toFa(stats.monthBookings)} رزرو در ماه جاری`}
          icon="🧾"
        />
        <StatCard
          label="در انتظار تأیید پذیرش"
          value={toFa(stats.awaitingReview)}
          hint="نیازمند بررسی و صدور کد رزرو"
          icon="⏳"
          tone="warning"
          href="/admin/bookings?status=awaiting_review"
        />
        <StatCard
          label="رزروهای قطعی"
          value={toFa(stats.confirmedBookings)}
          hint={`${toFa(stats.upcomingCheckIns)} ورود پیش‌رو`}
          icon="✅"
          tone="success"
        />
        <StatCard
          label="پیش‌پرداخت دریافت‌شده"
          value={formatMoney(stats.paidRevenue)}
          hint={`${formatCompactMoney(stats.pendingRevenue)} در انتظار پرداخت/تأیید`}
          icon="💳"
          tone="dark"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {attention.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center justify-between rounded-2xl border border-cream-200 bg-white p-3.5 shadow-soft transition hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-100 text-base">{item.icon}</span>
              <div>
                <p className="text-[10px] text-forest-800/55">{item.label}</p>
                <p className="text-base font-black text-forest-950">{toFa(item.value)}</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-forest-700">مدیریت ←</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="روند رزروها در ۶ ماه گذشته" description="تعداد رزرو و پیش‌پرداخت دریافتی هر ماه">
          <MiniBars data={stats.monthly} format={formatCompactMoney} />
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-cream-100 pt-3 text-center">
            <div>
              <p className="text-[10px] text-forest-800/50">اتاق‌های فعال</p>
              <p className="text-sm font-black text-forest-900">
                {toFa(stats.activeRooms)} / {toFa(stats.totalRooms)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-forest-800/50">نرخ اشغال تقریبی</p>
              <p className="text-sm font-black text-forest-900">{toFa(stats.occupancyRate)}٪</p>
            </div>
            <div>
              <p className="text-[10px] text-forest-800/50">پیام‌های جدید</p>
              <p className="text-sm font-black text-forest-900">{toFa(stats.newMessages)}</p>
            </div>
          </div>
        </Panel>

        <Panel title="وضعیت رزروها" description="توزیع درخواست‌ها بر اساس مرحله">
          <div className="space-y-2">
            {BOOKING_STATUS_ORDER.map((status: BookingStatus) => {
              const value = stats.statusBreakdown.find((item) => item.status === status)?.value ?? 0;
              const percent = stats.totalBookings ? Math.round((value / stats.totalBookings) * 100) : 0;
              return (
                <div key={status}>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1.5 text-forest-800/70">
                      <span className={`h-1.5 w-1.5 rounded-full ${BOOKING_STATUS[status].dot}`} />
                      {BOOKING_STATUS[status].label}
                    </span>
                    <span className="font-bold text-forest-900">{toFa(value)}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-cream-100">
                    <div className={`h-full rounded-full ${BOOKING_STATUS[status].dot}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl bg-gold-50 p-3 text-[10px] leading-5 text-gold-700">
            ⓘ رزروها تا زمانی که پذیرش آن‌ها را تأیید نکند و کد رزرو صادر نشود، قطعی نیستند.
          </div>
        </Panel>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="آخرین درخواست‌های رزرو"
          description="۶ درخواست اخیر مهمانان"
          action={
            <Link href="/admin/bookings" className="text-[10px] font-bold text-forest-900 hover:text-gold-600">
              همه رزروها ←
            </Link>
          }
        >
          {recent.length === 0 ? (
            <p className="py-8 text-center text-[11px] text-forest-800/50">هنوز رزروی ثبت نشده است.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[10px] text-forest-800/50">
                    <th>مهمان</th>
                    <th>خدمت</th>
                    <th>تاریخ ورود</th>
                    <th>مبلغ</th>
                    <th>وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((booking) => (
                    <tr key={booking.id} className="text-[11px]">
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cream-100 text-[11px]">
                            {SERVICE_TYPE[booking.serviceType]?.icon ?? "🛏️"}
                          </span>
                          <div>
                            <p className="font-bold text-forest-950">{booking.guestName}</p>
                            <p dir="ltr" className="text-[9px] text-forest-800/45">
                              {toFa(booking.phone)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-40 truncate text-[10px] text-forest-800/60">
                        {booking.serviceLabel || booking.roomName || "—"}
                      </td>
                      <td className="whitespace-nowrap text-[10px] text-forest-800/60">{formatJalali(booking.checkIn)}</td>
                      <td className="whitespace-nowrap text-[10px] font-bold text-forest-900">
                        {formatMoney(booking.totalAmount)}
                      </td>
                      <td>
                        <BookingStatusBadge status={booking.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="space-y-3">
          <Panel title="ورودهای پیش‌رو" description="رزروهای قطعی نزدیک">
            {upcoming.length === 0 ? (
              <p className="py-6 text-center text-[11px] text-forest-800/50">ورود پیش‌رویی ثبت نشده است.</p>
            ) : (
              <div className="space-y-2">
                {upcoming.map((booking) => (
                  <div key={booking.id} className="rounded-xl bg-cream-50 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-bold text-forest-950">{booking.guestName}</p>
                      <span className="text-[9px] text-forest-800/50">{formatJalali(booking.checkIn)}</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-forest-800/55">
                      {booking.roomName ?? booking.serviceLabel} · {toFa(booking.nights)} شب · کد {booking.reservationCode ?? "—"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
          <Panel title="دسترسی سریع">
            <div className="grid grid-cols-2 gap-2">
              {[
                { href: "/admin/rooms", label: "اتاق‌ها", icon: "🛏️" },
                { href: "/admin/messages", label: "پیام‌ها", icon: "✉️" },
                { href: "/admin/facilities", label: "امکانات", icon: "✨" },
                { href: "/admin/settings", label: "تنظیمات", icon: "⚙️" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-2 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2.5 text-[11px] font-semibold text-forest-900 transition hover:border-forest-200 hover:bg-white"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
