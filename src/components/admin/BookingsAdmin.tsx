"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { BOOKING_STATUS, BOOKING_STATUS_ORDER, SERVICE_TYPE } from "@/lib/constants";
import { formatJalali, formatMoney, formatDateTime, toFa } from "@/lib/format";

export type AdminBooking = {
  id: number;
  trackingCode: string;
  reservationCode: string | null;
  guestName: string;
  phone: string;
  email: string | null;
  serviceType: string;
  serviceLabel: string;
  checkIn: string;
  checkOut: string;
  timeSlot: string | null;
  nights: number;
  adults: number;
  children: number;
  extraGuests: number;
  extraGuestFee: number;
  totalAmount: number;
  prepaymentAmount: number;
  paidAmount: number;
  paymentRef: string | null;
  status: string;
  notes: string | null;
  adminNote: string | null;
  paidAt: string | null;
  createdAt: string;
  roomName: string | null;
};

type Props = { initialBookings: AdminBooking[] };

export default function BookingsAdmin({ initialBookings }: Props) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesStatus = status === "all" || booking.status === status;
      const haystack = `${booking.guestName} ${booking.phone} ${booking.trackingCode} ${booking.reservationCode ?? ""} ${booking.serviceLabel}`;
      const matchesSearch = !search.trim() || haystack.toLowerCase().includes(search.trim().toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [bookings, status, search]);

  const counts = useMemo(() => {
    return BOOKING_STATUS_ORDER.reduce<Record<string, number>>((acc, key) => {
      acc[key] = bookings.filter((booking) => booking.status === key).length;
      return acc;
    }, {});
  }, [bookings]);

  async function patchBooking(id: number, body: Record<string, unknown>, successMessage: string) {
    setBusyId(id);
    setError(null);
    const snapshot = bookings;
    setBookings((current) =>
      current.map((booking) => (booking.id === id ? ({ ...booking, ...body } as AdminBooking) : booking)),
    );
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        setBookings(snapshot);
        setError(data.error ?? "عملیات انجام نشد.");
        return;
      }
      const updated = data.item as AdminBooking;
      setBookings((current) => current.map((booking) => (booking.id === id ? { ...booking, ...updated } : booking)));
      setToast(successMessage);
      window.setTimeout(() => setToast(null), 2600);
      router.refresh();
    } catch {
      setBookings(snapshot);
      setError("خطای شبکه. دوباره تلاش کنید.");
    } finally {
      setBusyId(null);
    }
  }

  async function removeBooking(id: number) {
    if (!window.confirm("این درخواست رزرو برای همیشه حذف شود؟")) return;
    setBusyId(id);
    const snapshot = bookings;
    setBookings((current) => current.filter((booking) => booking.id !== id));
    try {
      const response = await fetch(`/api/admin/bookings/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setBookings(snapshot);
        setError("حذف رزرو انجام نشد.");
      } else {
        setToast("رزرو حذف شد.");
        window.setTimeout(() => setToast(null), 2400);
        router.refresh();
      }
    } catch {
      setBookings(snapshot);
      setError("خطای شبکه. حذف انجام نشد.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      {toast ? (
        <div className="fixed bottom-5 left-5 z-[80] rounded-xl bg-forest-950 px-4 py-3 text-[11px] font-semibold text-white shadow-card">
          ✓ {toast}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-cream-200 bg-white p-3 shadow-soft">
        <input
          className="input h-9 w-full py-1.5 text-[11px] sm:w-56"
          placeholder="جستجو بر اساس نام، موبایل یا کد رزرو…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatus("all")}
            className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
              status === "all" ? "bg-forest-900 text-white" : "bg-cream-100 text-forest-800/70"
            }`}
          >
            همه ({toFa(bookings.length)})
          </button>
          {BOOKING_STATUS_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
                status === key ? "bg-forest-900 text-white" : "bg-cream-100 text-forest-800/70"
              }`}
            >
              {BOOKING_STATUS[key].short} ({toFa(counts[key] ?? 0)})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-cream-300 bg-white/70 px-6 py-14 text-center">
          <span className="text-2xl">🧾</span>
          <p className="text-xs font-bold text-forest-900">رزروی با این فیلتر پیدا نشد</p>
          <p className="text-[11px] text-forest-800/55">فیلتر وضعیت یا عبارت جستجو را تغییر دهید.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((booking) => {
            const isOpen = expanded === booking.id;
            const busy = busyId === booking.id;
            return (
              <article key={booking.id} className="overflow-hidden rounded-2xl border border-cream-200 bg-white shadow-soft">
                <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cream-100 text-base">
                      {SERVICE_TYPE[booking.serviceType]?.icon ?? "🛏️"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-extrabold text-forest-950">{booking.guestName}</p>
                        <BookingStatusBadge status={booking.status} />
                        {booking.reservationCode ? (
                          <span dir="ltr" className="rounded-md bg-emerald-50 px-1.5 py-0.5 font-mono text-[9px] font-bold text-emerald-700">
                            {booking.reservationCode}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[10px] text-forest-800/55">
                        {booking.serviceLabel || booking.roomName || SERVICE_TYPE[booking.serviceType]?.label} ·{" "}
                        {formatJalali(booking.checkIn)}
                        {booking.serviceType === "room" ? ` تا ${formatJalali(booking.checkOut)}` : ` · ${booking.timeSlot ?? ""}`}
                      </p>
                      <p className="mt-0.5 text-[10px] text-forest-800/45">
                        <span dir="ltr">{toFa(booking.phone)}</span> · کد پیگیری:{" "}
                        <span dir="ltr" className="font-mono">{booking.trackingCode}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <div className="text-left">
                      <p className="text-[11px] font-black text-forest-950">{formatMoney(booking.totalAmount)}</p>
                      <p className="text-[9px] text-forest-800/50">
                        پیش‌پرداخت {formatMoney(booking.prepaymentAmount)} · پرداخت‌شده {formatMoney(booking.paidAmount)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExpanded(isOpen ? null : booking.id);
                        setNoteDraft(booking.adminNote ?? "");
                      }}
                      className="rounded-lg border border-cream-300 px-2.5 py-1.5 text-[10px] font-semibold text-forest-800"
                    >
                      {isOpen ? "بستن" : "جزئیات و اقدامات"}
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="space-y-3 border-t border-cream-100 bg-cream-50/60 p-4">
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4">
                      {[
                        { label: "تعداد شب/سانس", value: toFa(booking.nights) },
                        {
                          label: "مهمانان",
                          value: `${toFa(booking.adults)} بزرگسال + ${toFa(booking.children)} کودک${
                            booking.extraGuests ? ` / ${toFa(booking.extraGuests)} نفر اضافه` : ""
                          }`,
                        },
                        { label: "ایمیل", value: booking.email ?? "—" },
                        { label: "کد پرداخت", value: booking.paymentRef ?? "—" },
                        { label: "زمان ثبت", value: formatDateTime(booking.createdAt) },
                        { label: "زمان پرداخت", value: booking.paidAt ? formatDateTime(booking.paidAt) : "—" },
                        { label: "اتاق", value: booking.roomName ?? "—" },
                        { label: "کد رزرو", value: booking.reservationCode ?? "صادر نشده" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-lg bg-white px-2.5 py-2">
                          <p className="text-[9px] text-forest-800/45">{item.label}</p>
                          <p dir="auto" className="truncate text-[10px] font-bold text-forest-950">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {booking.notes ? (
                      <div className="rounded-lg bg-white p-2.5 text-[10px] leading-6 text-forest-800/70">
                        <b className="text-forest-900">درخواست مهمان: </b>
                        {booking.notes}
                      </div>
                    ) : null}

                    <label className="field">
                      <span className="label text-[10px]">یادداشت پذیرش / توضیح برای مهمان</span>
                      <textarea
                        className="input min-h-16 text-[11px]"
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="مثال: پرداخت تأیید شد، اتاق ۳۰۲ رزرو گردید."
                      />
                    </label>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => patchBooking(booking.id, { adminNote: noteDraft }, "یادداشت ذخیره شد.")}
                        className="btn btn-ghost btn-sm"
                      >
                        ذخیره یادداشت
                      </button>
                      {booking.paidAmount === 0 ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => patchBooking(booking.id, { markPaid: true }, "پرداخت پیش‌پرداخت ثبت شد.")}
                          className="btn btn-gold btn-sm"
                        >
                          ثبت پرداخت پیش‌پرداخت
                        </button>
                      ) : null}
                      {booking.status !== "confirmed" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            patchBooking(booking.id, { status: "confirmed", adminNote: noteDraft }, "رزرو تأیید و کد رزرو صادر شد.")
                          }
                          className="btn btn-primary btn-sm"
                        >
                          تأیید و صدور کد رزرو
                        </button>
                      ) : null}
                      {booking.status !== "rejected" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            patchBooking(
                              booking.id,
                              {
                                status: "rejected",
                                adminNote: noteDraft || "ظرفیت در تاریخ درخواستی تکمیل است.",
                              },
                              "درخواست رد شد.",
                            )
                          }
                          className="btn btn-sm border border-rose-200 bg-rose-50 text-rose-700"
                        >
                          رد درخواست
                        </button>
                      ) : null}
                      {booking.status !== "cancelled" && booking.status !== "confirmed" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => patchBooking(booking.id, { status: "cancelled" }, "رزرو لغو شد.")}
                          className="btn btn-ghost btn-sm"
                        >
                          لغو
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => removeBooking(booking.id)}
                        className="btn btn-sm border border-rose-200 bg-white text-rose-600"
                      >
                        حذف
                      </button>
                      {busy ? <span className="self-center text-[10px] text-forest-800/50">در حال ذخیره…</span> : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
