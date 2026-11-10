import type { Metadata } from "next";
import Link from "next/link";
import RoomsBrowser from "@/components/site/RoomsBrowser";
import { PageHero } from "@/components/site/ui";
import { getRooms, getSettings } from "@/lib/data";
import { hasDining } from "@/lib/modules";
import { toFa } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "اتاق‌ها و سوئیت‌ها",
  description: "۱۶ اتاق و سوئیت هتل کاج با منظره جنگل، امکانات کامل و امکان رزرو آنلاین با پیش‌پرداخت.",
};

export default async function RoomsPage() {
  const [rooms, settings] = await Promise.all([getRooms(), getSettings()]);

  return (
    <>
      <PageHero
        kicker={`${toFa(settings.totalRooms)} اتاق و سوئیت`}
        title="اتاقی که با حال‌وهوای سفر شما می‌خواند"
        description="از اتاق‌های دو نفره دلوکس با بالکن جنگل تا سوئیت رویال با تراس اختصاصی؛ همه اتاق‌ها با امکانات کامل و صبحانه بوفه ارائه می‌شوند."
        image={settings.poolImage}
      >
        <div className="mt-2 flex flex-wrap gap-2">
          <Link href="/booking" className="btn btn-gold btn-sm">
            ثبت درخواست رزرو
          </Link>
          {settings.modulePool ? (
            <Link href="/pool" className="btn btn-outline btn-sm">
              استخر خانوادگی
            </Link>
          ) : hasDining({
              pool: false,
              restaurant: settings.moduleRestaurant,
              cafe: settings.moduleCafe,
              spa: settings.moduleSpa,
            }) ? (
            <Link href="/dining" className="btn btn-outline btn-sm">
              کافه و رستوران
            </Link>
          ) : null}
        </div>
      </PageHero>

      <section className="container-x -mt-6 pb-16">
        <div className="panel p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-cream-100 pb-3 text-[11px] text-forest-800/60">
            <p className="flex items-start gap-1.5">
              <span className="text-gold-600">◆</span>
              رزرو اتاق‌ها با پیش‌پرداخت ۳۰٪ قطعی می‌شود؛ کد رزرو پس از تأیید پذیرش صادر و پیامک می‌گردد.
            </p>
            <Link href="/track" className="font-semibold text-forest-900 hover:text-gold-600">
              پیگیری رزرو قبلی ←
            </Link>
          </div>
          <RoomsBrowser rooms={rooms} />
        </div>
      </section>
    </>
  );
}
