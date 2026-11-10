import { notFound } from "next/navigation";
import { TicketPercent } from "lucide-react";
import { getSettings } from "@/lib/data";
import { getPublicOffers } from "@/lib/promotions";
import { PageHero, EmptyState } from "@/components/site/ui";
import { OfferCard } from "@/components/site/extras-sections";

export const metadata = { title: "پیشنهادهای ویژه" };

export default async function OffersPage() {
  const s = await getSettings();
  if (s.moduleOffers !== "1") notFound();
  const offers = await getPublicOffers(50);
  return (
    <>
      <PageHero eyebrow="کد تخفیف" title="پیشنهادهای ویژه" subtitle={`با رزرو مستقیم از سایت ${s.hotelName} و استفاده از این کدها، اقامتی به‌صرفه‌تر داشته باشید.`} image={offers[0]?.image || "/images/hero.jpg"} />
      <section className="mx-auto max-w-7xl px-6 py-14">
        {offers.length === 0 ? (
          <EmptyState title="در حال حاضر پیشنهاد فعالی وجود ندارد" desc="به‌زودی پیشنهادهای جدید اضافه می‌شوند." />
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">{offers.map((p) => <OfferCard key={p.id} p={p} />)}</div>
            <div className="mt-10 flex items-start gap-3 rounded-box bg-base-100 p-5 text-sm leading-7 text-base-content/65 ring-1 ring-base-300">
              <TicketPercent className="mt-1 h-5 w-5 shrink-0 text-primary" />
              کد را کپی کنید و در فرم رزرو، بخش «کد تخفیف» وارد کنید. تخفیف پس از اعمال، از مبلغ کل و پیش‌پرداخت کم می‌شود. هر کد ممکن است شرایط خاصی (حداقل شب اقامت یا بازه تاریخ) داشته باشد.
            </div>
          </>
        )}
      </section>
    </>
  );
}
