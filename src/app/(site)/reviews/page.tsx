import type { Metadata } from "next";
import Link from "next/link";
import { PageHero, SectionHeading, Stars } from "@/components/site/ui";
import ReviewForm from "@/components/site/ReviewForm";
import { getGuestReviews, getReviewSummary, getSettings } from "@/lib/data";
import { formatJalali, toFa } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "نظرات مهمانان",
  description: "تجربه مهمانان هتل کاج و ثبت نظر شما.",
};

export default async function ReviewsPage() {
  const [settings, reviews, summary] = await Promise.all([getSettings(), getGuestReviews({ limit: 30 }), getReviewSummary()]);

  return (
    <>
      <PageHero
        kicker="تجربه مهمانان"
        title="آنچه مهمانان ما می‌گویند"
        description="امتیازها و نظرات واقعی مهمانان؛ نظر شما هم پس از تأیید پذیرش منتشر می‌شود."
        image={settings.aboutImage || settings.heroImage}
        breadcrumb={[{ label: "نظرات" }]}
      />

      <section className="container-x py-8">
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr] lg:items-start">
          <div className="space-y-4">
            <div className="glass flex flex-wrap items-center gap-6 rounded-[1.6rem] p-5">
              <div className="text-center">
                <p className="text-3xl font-black text-forest-950">{toFa(summary.average)}</p>
                <Stars rating={Math.round(summary.average)} />
                <p className="mt-1 text-[9px] text-forest-900/50">از {toFa(summary.total)} نظر</p>
              </div>
              <div className="min-w-40 flex-1 space-y-1.5">
                {summary.distribution.map((item) => {
                  const percent = summary.total ? Math.round((item.count / summary.total) * 100) : 0;
                  return (
                    <div key={item.stars} className="flex items-center gap-2">
                      <span className="w-8 text-[9px] font-bold text-forest-800">{toFa(item.stars)}★</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/60">
                        <div className="h-full rounded-full bg-forest-600" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="w-8 text-end text-[8px] text-forest-900/45">{toFa(item.count)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {reviews.length === 0 ? (
                <p className="glass rounded-2xl p-6 text-center text-[11px] text-forest-900/55 sm:col-span-2">
                  هنوز نظری منتشر نشده است؛ اولین نظر را شما ثبت کنید.
                </p>
              ) : (
                reviews.map((review) => (
                  <article key={review.id} className="glass flex h-full flex-col rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <Stars rating={review.rating} />
                      <span className="text-[8px] text-forest-900/45">
                        {review.stayDate ? formatJalali(review.stayDate) : review.city || "مهمان"}
                      </span>
                    </div>
                    {review.title ? <p className="mt-2 text-[11px] font-black text-forest-950">{review.title}</p> : null}
                    <p className="mt-1 flex-1 text-[10px] leading-6 text-forest-900/60">«{review.comment}»</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="glass-circle h-7 w-7 text-[9px] font-black text-forest-800">{review.guestName.charAt(0)}</span>
                      <span className="text-[10px] font-bold text-forest-950">{review.guestName}</span>
                      {review.city ? <span className="text-[8px] text-forest-900/45">· {review.city}</span> : null}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-28">
            <ReviewForm />
            <div className="glass-soft rounded-2xl p-4 text-[10px] leading-6 text-forest-900/60">
              <p className="font-bold text-forest-900">مهمان کاج بوده‌اید؟</p>
              <p className="mt-1">با کد رزرو در صفحه کانسیرژ، درخواست ترانسفر یا رزرو مجدد خود را ثبت کنید.</p>
              <Link href="/concierge" className="mt-2 inline-block font-bold text-forest-800 hover:underline">
                خدمات کانسیرژ ←
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
