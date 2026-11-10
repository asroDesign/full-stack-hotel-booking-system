import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RoomCard from "@/components/site/RoomCard";
import { Breadcrumb } from "@/components/site/ui";
import { getRoomBySlug, getRooms, getSettings } from "@/lib/data";
import { addDaysISO, formatMoney, toFa, phoneHref } from "@/lib/format";
import SmartImage from "@/components/site/SmartImage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoomBySlug(slug);
  if (!room) return { title: "اتاق یافت نشد" };
  return { title: room.name, description: room.description };
}

export default async function RoomDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [room, settings, allRooms] = await Promise.all([getRoomBySlug(slug), getSettings(), getRooms()]);
  if (!room) notFound();

  const prepayment = Math.round((room.pricePerNight * room.prepaymentPercent) / 100);
  const related = allRooms.filter((item) => item.id !== room.id && item.roomType === room.roomType).slice(0, 3);
  const fallbackRelated = allRooms.filter((item) => item.id !== room.id).slice(0, 3);
  const suggestions = related.length ? related : fallbackRelated;
  const bookingHref = `/booking?service=room&roomId=${room.id}&checkIn=${addDaysISO(1)}&checkOut=${addDaysISO(3)}`;
  const images = [room.coverImage, ...room.gallery.filter((image) => image !== room.coverImage)];

  return (
    <>
      <section className="container-x pt-6">
        <div className="panel overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-3 p-6">
              <Breadcrumb items={[{ label: "اتاق‌ها", href: "/rooms" }, { label: room.name }]} />
              <div className="flex flex-wrap items-center gap-2">
                <span className="neu-pill neu-pill-accent">{room.roomType}</span>
                {room.featured ? <span className="neu-pill">⭐ پیشنهاد ویژه کاج</span> : null}
                {!room.active ? <span className="neu-pill !text-rose-600">غیرفعال</span> : null}
              </div>
              <h1 className="display-xl text-2xl text-forest-950 sm:text-3xl lg:text-4xl">{room.name}</h1>
              <p className="max-w-2xl text-[12px] leading-7 text-forest-800/65">{room.description}</p>
              <div className="neu-inset flex flex-wrap gap-x-4 gap-y-1.5 rounded-2xl px-3 py-2.5 text-[10px] font-semibold text-forest-800/70">
                <span>🛏 ظرفیت {toFa(room.capacity)} نفر</span>
                <span>👥 حداکثر {toFa(room.maxCapacity)} نفر</span>
                <span>📐 {toFa(room.size)} متر</span>
                <span>🛌 {room.bedType}</span>
                <span>🪟 {room.view}</span>
                <span>🏢 طبقه {toFa(room.floor)} · اتاق {toFa(room.roomNumber)}</span>
              </div>
            </div>
            <div className="p-4">
              <div className="neu-img h-full min-h-56">
                <SmartImage src={room.coverImage} alt={room.name} className="h-full w-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container-x py-10">
        <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr] lg:items-start">
          <div className="space-y-6">
            <div className="grid gap-2 sm:grid-cols-4">
              {images.slice(0, 4).map((image, index) => (
                <div
                  key={`${image}-${index}`}
                  className={`overflow-hidden rounded-2xl ${index === 0 ? "sm:col-span-2 sm:row-span-2" : ""}`}
                >
                  <SmartImage
                    src={image}
                    alt={`${room.name} ${toFa(index + 1)}`}
                    loading="lazy"
                    className={`w-full object-cover ${index === 0 ? "aspect-[4/3] sm:aspect-square" : "aspect-[4/3]"}`}
                  />
                </div>
              ))}
            </div>

            <article className="panel space-y-4 p-6">
              <h2 className="text-lg font-extrabold text-forest-950">درباره این اتاق</h2>
              <p className="text-sm leading-8 text-forest-800/70">{room.longDescription || room.description}</p>
              <div className="grid gap-3 border-t border-cream-100 pt-4 sm:grid-cols-2">
                {[
                  { label: "نوع اقامتگاه", value: room.roomType },
                  { label: "ظرفیت", value: `${toFa(room.capacity)} نفر` },
                  { label: "متراژ", value: `${toFa(room.size)} مترمربع` },
                  { label: "نوع تخت", value: room.bedType },
                  { label: "چشم‌انداز", value: room.view },
                  { label: "طبقه", value: `طبقه ${toFa(room.floor)} — اتاق ${toFa(room.roomNumber)}` },
                  { label: "ساعت ورود", value: `از ${settings.checkInTime}` },
                  { label: "ساعت خروج", value: `تا ${settings.checkOutTime}` },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-cream-100/60 px-3 py-2">
                    <p className="text-[10px] text-forest-800/50">{item.label}</p>
                    <p className="text-xs font-bold text-forest-950">{item.value}</p>
                  </div>
                ))}
              </div>
            </article>

            {room.videoUrl ? (
              <div className="panel overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4">
                  <h2 className="text-base font-extrabold text-forest-950">🎥 تور ویدیویی اتاق</h2>
                  <span className="badge-plain bg-forest-50 text-[10px] text-forest-700">ویدیو اختصاصی</span>
                </div>
                <video
                  key={room.videoUrl}
                  className="aspect-video w-full bg-forest-950 object-cover"
                  src={room.videoUrl}
                  poster={room.coverImage}
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>
            ) : null}

            {room.addons.length > 0 ? (
              <div className="panel space-y-3 p-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-extrabold text-forest-950">گزینه‌های اضافه قابل انتخاب</h2>
                  <span className="badge badge-sm badge-warning text-[9px]">با هزینه اضافه</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {room.addons.map((addon) => (
                    <div key={addon.name} className="flex items-center justify-between gap-2 rounded-xl border border-cream-200 bg-cream-50 px-3 py-2">
                      <div>
                        <p className="text-[11px] font-bold text-forest-950">{addon.name}</p>
                        {addon.description ? <p className="text-[9px] text-forest-800/50">{addon.description}</p> : null}
                      </div>
                      <span className="text-[10px] font-black text-gold-600">{formatMoney(addon.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="panel space-y-4 p-6">
              <h2 className="text-base font-extrabold text-forest-950">امکانات اتاق</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {room.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2 rounded-xl border border-cream-200 px-3 py-2 text-xs text-forest-800/80">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-forest-50 text-[10px] text-forest-700">✓</span>
                    {amenity}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="panel space-y-4 overflow-hidden p-5">
              <div className="border-b border-cream-100 pb-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-gold-600">نرخ اقامت</p>
                <p className="mt-1 text-xl font-black text-forest-950">{formatMoney(room.pricePerNight)}</p>
                <p className="mt-1 text-[11px] text-gold-700">
                  پیش‌پرداخت {toFa(room.prepaymentPercent)}٪ = {formatMoney(prepayment)}
                </p>
                <p className="mt-1 text-[10px] leading-5 text-forest-800/55">
                  ظرفیت استاندارد {toFa(room.capacity)} نفر · هر نفر اضافه تا {toFa(room.maxCapacity)} نفر مبلغ{" "}
                  {formatMoney(room.extraGuestFee)} دارد.
                </p>
              </div>
              <div className="space-y-1.5 rounded-xl bg-cream-100 p-3 text-[11px] text-forest-800/70">
                <p>✓ نرخ شامل صبحانه بوفه برای همه مهمانان</p>
                <p>✓ مالیات و عوارض در نرخ لحاظ شده است</p>
                <p>✓ رزرو قطعی پس از پرداخت پیش‌پرداخت و تأیید پذیرش</p>
              </div>
              <Link href={bookingHref} className="btn btn-primary w-full">
                درخواست رزرو این اتاق
              </Link>
              <a href={phoneHref(settings.phone)} className="btn btn-ghost w-full text-xs">
                ☎ تماس با پذیرش: {settings.phone}
              </a>
              <p className="text-center text-[10px] leading-5 text-forest-800/45">
                کد رزرو تنها پس از تأیید پذیرش صادر می‌شود. بدون کد رزرو، اقامت قطعی نیست.
              </p>
            </div>

            <div className="rounded-xl border border-gold-200 bg-gradient-to-br from-gold-50 to-white p-4 text-[11px] leading-6 text-gold-700">
              <p className="font-bold uppercase tracking-wide">پیشنهاد کاج</p>
              <p className="mt-1">
                با رزرو دو شب یا بیشتر، ۱۰٪ تخفیف منوی کافه‑رستوران کاج برای شما در نظر گرفته می‌شود. برای هماهنگی با پذیرش تماس بگیرید.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {suggestions.length ? (
        <section className="py-14">
          <div className="container-x space-y-6">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-forest-950">اتاق‌های مشابه</h2>
                <p className="mt-1 text-xs text-forest-800/60">گزینه‌های دیگری که ممکن است بپسندید</p>
              </div>
              <Link href="/rooms" className="btn btn-ghost btn-sm">
                همه اتاق‌ها
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {suggestions.map((item) => (
                <RoomCard key={item.id} room={item} compact />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
