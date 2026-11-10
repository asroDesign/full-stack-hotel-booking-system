import { Star, Quote } from "lucide-react";
import { getSettings } from "@/lib/data";
import { getApprovedReviews } from "@/lib/extras";
import { PageHero, EmptyState } from "@/components/site/ui";
import { ReviewForm } from "@/components/site/forms";
import { cn, faNum, formatDateTime } from "@/lib/utils";

export const metadata = { title: "نظرات مهمانان" };

export default async function ReviewsPage() {
  const s = await getSettings();
  const reviews = await getApprovedReviews();
  const avg = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, c: reviews.filter((r) => r.rating === n).length }));
  return (
    <>
      <PageHero eyebrow={`${faNum(reviews.length)} نظر`} title="نظرات مهمانان" subtitle={`تجربه واقعی مهمانان ${s.hotelName}؛ شما هم پس از اقامت، نظر خود را ثبت کنید.`} image="/images/hero.jpg" />
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1fr_380px]">
        <div>
          {reviews.length === 0 ? (
            <EmptyState title="هنوز نظری ثبت نشده است" />
          ) : (
            <div className="columns-1 gap-5 md:columns-2">
              {reviews.map((t) => (
                <figure key={t.id} className="tpl-card mb-5 break-inside-avoid rounded-box bg-base-100 p-6 ring-1 ring-base-300">
                  <div className="flex items-center justify-between">
                    <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < t.rating ? "fill-gold-400 text-gold-400" : "text-base-300")} />)}</span>
                    <Quote className="h-5 w-5 text-brand-200" />
                  </div>
                  <blockquote className="mt-3 text-sm leading-7 text-base-content/75">{t.body}</blockquote>
                  <figcaption className="mt-4 flex items-center justify-between text-xs text-base-content/55">
                    <span><b className="text-brand-900">{t.name}</b>{t.city && ` · ${t.city}`}{t.reservationId && <span className="badge badge-success badge-soft badge-xs mr-2">اقامت تاییدشده</span>}</span>
                    <span>{formatDateTime(t.createdAt).split("،")[0]}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          {reviews.length > 0 && (
            <div className="tpl-card rounded-box bg-base-100 p-6 ring-1 ring-base-300">
              <div className="flex items-center gap-4">
                <span className="text-5xl font-black text-brand-800">{faNum(avg.toFixed(1))}</span>
                <div>
                  <div className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={cn("h-4 w-4", i < Math.round(avg) ? "fill-gold-400 text-gold-400" : "text-base-300")} />)}</div>
                  <div className="text-xs text-base-content/55">از {faNum(reviews.length)} نظر</div>
                </div>
              </div>
              <ul className="mt-4 space-y-1.5">
                {dist.map((x) => (
                  <li key={x.n} className="flex items-center gap-2 text-xs">
                    <span className="w-8">{faNum(x.n)} ★</span>
                    <progress className="progress progress-warning flex-1" value={x.c} max={reviews.length} />
                    <span className="w-6 text-left text-base-content/55">{faNum(x.c)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="tpl-card rounded-box bg-base-100 p-6 ring-1 ring-base-300">
            <h2 className="font-black text-brand-900">ثبت نظر شما</h2>
            <p className="mb-4 mt-1 text-xs leading-6 text-base-content/55">ثبت نظر فقط برای مهمانانی که رزرو قطعی داشته‌اند امکان‌پذیر است. کد رزرو (ATL-…) و شماره موبایل رزرو را وارد کنید.</p>
            <ReviewForm />
          </div>
        </aside>
      </section>
    </>
  );
}
