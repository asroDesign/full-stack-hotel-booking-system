import Link from "next/link";
import { notFound } from "next/navigation";
import { Phone } from "lucide-react";
import { getSettings } from "@/lib/data";
import { getFaqs, groupBy } from "@/lib/extras";
import { PageHero, EmptyState } from "@/components/site/ui";
import { FaqList } from "@/components/site/extras-sections";
import { faNum } from "@/lib/utils";

export const metadata = { title: "سوالات متداول" };

export default async function FaqPage() {
  const s = await getSettings();
  if (s.moduleFaq !== "1") notFound();
  const groups = groupBy(await getFaqs(), (f) => f.category);
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((g) => g.items).map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      <PageHero eyebrow="راهنما" title="سوالات متداول" subtitle="پاسخ پرسش‌های پرتکرار درباره رزرو، پرداخت، اقامت و امکانات." image="/images/hero.jpg" />
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[240px_1fr]">
        {groups.length === 0 ? (
          <div className="lg:col-span-2"><EmptyState title="هنوز سوالی ثبت نشده است" /></div>
        ) : (
          <>
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <ul className="menu w-full rounded-box bg-base-100 ring-1 ring-base-300">
                {groups.map((g, i) => <li key={g.name}><a href={`#cat-${i}`}>{g.name} <span className="badge badge-ghost badge-sm">{faNum(g.items.length)}</span></a></li>)}
              </ul>
              <div className="mt-4 rounded-box bg-primary p-5 text-primary-content">
                <div className="font-bold">سوال دیگری دارید؟</div>
                <a href={`tel:${s.phone}`} className="mt-3 flex items-center gap-2 text-sm" dir="ltr"><Phone className="h-4 w-4" />{faNum(s.phone)}</a>
                <Link href="/contact" className="btn btn-sm mt-3 w-full">ارسال پیام</Link>
              </div>
            </aside>
            <div className="space-y-10">
              {groups.map((g, i) => (
                <div key={g.name} id={`cat-${i}`} className="scroll-mt-28">
                  <h2 className="mb-4 text-xl font-black text-brand-900">{g.name}</h2>
                  <FaqList faqs={g.items} open={i === 0 ? 0 : -1} />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
