import type { Metadata } from "next";
import Link from "next/link";
import BookingForm from "@/components/booking/BookingForm";
import TrackForm from "@/components/booking/TrackForm";
import { PageHero } from "@/components/site/ui";
import { getPoolSlots, getRooms, getSettings } from "@/lib/data";
import { addDaysISO, parseDateValue, todayISO, toFa } from "@/lib/format";
import { BOOKING_STEPS } from "@/lib/page-content";
import { POOL_RULES, ROOM_RULES } from "@/lib/constants";
import { modulesFromSettings } from "@/lib/modules";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ثبت درخواست رزرو",
  description: "رزرو آنلاین اتاق‌های هتل کاج با پیش‌پرداخت و صدور کد رزرو پس از تأیید پذیرش.",
};

type SearchParams = Promise<{
  service?: string;
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  adults?: string;
}>;

function safeDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const parsed = parseDateValue(value);
  if (!parsed || value < todayISO()) return fallback;
  return value.slice(0, 10);
}

export default async function BookingPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [rooms, settings, slots] = await Promise.all([getRooms(), getSettings(), getPoolSlots()]);

  const checkIn = safeDate(params.checkIn, addDaysISO(1));
  const checkOut = safeDate(params.checkOut, addDaysISO(3));
  const roomId = params.roomId ? Number(params.roomId) : undefined;
  const defaultRoomId = rooms.some((room) => room.id === roomId) ? roomId : undefined;
  const adults = Math.min(Math.max(Number(params.adults) || 2, 1), 12);
  const modules = modulesFromSettings(settings);
  const roomRules = settings.roomRules?.length ? settings.roomRules : ROOM_RULES;
  const poolRules = settings.poolRules?.length ? settings.poolRules : POOL_RULES;

  return (
    <>
      <PageHero
        kicker="رزرو مستقیم و شفاف"
        title="درخواست رزرو خود را ثبت کنید"
        description={
          modules.pool
            ? "در سه مرحله ساده رزرو اتاق یا سانس استخر را ثبت کنید. پرداخت پیش‌پرداخت ۳۰٪ است و کد رزرو پس از تأیید پذیرش صادر می‌شود."
            : "در سه مرحله ساده درخواست رزرو اتاق خود را ثبت کنید. پرداخت پیش‌پرداخت ۳۰٪ است و کد رزرو پس از تأیید پذیرش صادر می‌شود."
        }
        image={settings.poolImage}
      >
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/track" className="btn btn-outline btn-sm">
            پیگیری رزرو قبلی
          </Link>
          <a href={settings.whatsappLink || "#"} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
            مشاوره در واتس‌اپ
          </a>
        </div>
      </PageHero>

      <section className="container-x py-10">
        <BookingForm
          rooms={rooms.map((room) => ({
            id: room.id,
            name: room.name,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            capacity: room.capacity,
            maxCapacity: room.maxCapacity,
            extraGuestFee: room.extraGuestFee,
            addons: room.addons ?? [],
            pricePerNight: room.pricePerNight,
            prepaymentPercent: room.prepaymentPercent,
            coverImage: room.coverImage,
          }))}
          allowPool={modules.pool}
          poolSlots={(modules.pool ? slots : []).map((slot) => ({
            id: slot.id,
            label: slot.label,
            price: slot.price,
            capacity: slot.capacity,
            extraGuestFee: slot.extraGuestFee,
            description: slot.description,
          }))}
          extraGuestFee={settings.extraGuestFee}
          poolMaxCapacity={settings.poolMaxCapacity}
          roomRules={roomRules}
          poolRules={poolRules}
          defaultService={modules.pool && params.service === "pool" ? "pool" : "room"}
          defaultRoomId={defaultRoomId}
          defaultCheckIn={checkIn}
          defaultCheckOut={checkOut}
          defaultAdults={adults}
        />
      </section>

      <section className="py-12">
        <div className="container-x space-y-6">
          <div className="text-center">
            <p className="kicker mx-auto">فرایند رزرو</p>
            <h2 className="mt-2 text-xl font-extrabold text-forest-950">
              از انتخاب تا دریافت کد رزرو، {toFa(BOOKING_STEPS.length)} قدم
            </h2>
          </div>
          <ul className="steps steps-vertical w-full sm:steps-horizontal">
            {BOOKING_STEPS.map((step, index) => (
              <li key={`${step.title}-step`} data-content={toFa(index + 1)} className="step step-primary">
                <span className="hidden px-1 text-[10px] font-semibold text-forest-800/60 sm:inline">{step.title}</span>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(modules.pool
              ? BOOKING_STEPS
              : BOOKING_STEPS.map((step, index) =>
                  index === 0
                    ? {
                        ...step,
                        description: `از میان ${toFa(rooms.length)} اتاق و سوئیت، گزینه مناسب خود را انتخاب کنید.`,
                      }
                    : step,
                )
            ).map((step, index) => (
              <div
                key={step.title}
                className="neu-raised neu-hover group relative overflow-hidden rounded-2xl p-4"
              >
                <span className="absolute -left-1 -top-2 text-5xl font-black text-white/50">
                  {toFa(index + 1)}
                </span>
                <span className="neu-circle relative h-10 w-10 text-lg">
                  {step.icon}
                </span>
                <p className="relative mt-3 text-xs font-extrabold text-forest-950">{step.title}</p>
                <p className="relative mt-1 text-[11px] leading-6 text-forest-800/60">{step.description}</p>
              </div>
            ))}
          </div>
          <div className="alert alert-warning mx-auto max-w-3xl items-start gap-2 rounded-2xl border-gold-200 bg-gold-50 py-3 text-[11px] leading-6 text-gold-700">
            <span aria-hidden="true">ⓘ</span>
            <span>
              توجه: ثبت درخواست به تنهایی به معنی رزرو قطعی نیست. رزرو شما پس از پرداخت پیش‌پرداخت و تأیید پذیرش قطعی
              می‌شود و کد رزرو در همان مرحله صادر و پیامک می‌گردد.
            </span>
          </div>
        </div>
      </section>

      <section className="container-x py-12">
        <div className="glass grid items-start gap-4 rounded-3xl p-5 sm:p-6 lg:grid-cols-[1fr_1fr]">
          <div className="space-y-2">
            <p className="kicker">پیگیری رزرو</p>
            <h2 className="text-lg font-extrabold text-forest-950">کد رزرو یا کد پیگیری خود را دارید؟</h2>
            <p className="text-xs leading-7 text-forest-800/60">
              با وارد کردن کد پیگیری (TRK-…) یا کد رزرو (ATL-…) وضعیت پرداخت پیش‌پرداخت و تأیید پذیرش را ببینید. کد رزرو
              تنها پس از تأیید پذیرش صادر می‌شود.
            </p>
            <Link href="/track" className="btn btn-ghost btn-sm w-fit">
              صفحه پیگیری رزرو
            </Link>
          </div>
          <div className="rounded-2xl bg-cream-50 p-4">
            <TrackForm />
          </div>
        </div>
      </section>
    </>
  );
}
