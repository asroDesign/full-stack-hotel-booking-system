import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import MenuTabs from "@/components/site/MenuTabs";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { getFacilities, getGallery, getMenuItems, getSettings } from "@/lib/data";
import { hasDining, modulesFromSettings } from "@/lib/modules";
import { toFa, phoneHref } from "@/lib/format";
import SmartImage from "@/components/site/SmartImage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "کافه و رستوران",
  description: "معرفی کافه‌‑رستوران هتل، منوی غذا و نوشیدنی، ساعت سرو و رزرو میز.",
};

export default async function DiningPage() {
  const [settings, menu, gallery, facilities] = await Promise.all([
    getSettings(),
    getMenuItems(),
    getGallery(),
    getFacilities(),
  ]);
  const modules = modulesFromSettings(settings);
  if (!hasDining(modules)) notFound();

  const diningImages = gallery.filter((item) => ["رستوران", "کافه"].includes(item.category)).slice(0, 4);
  const diningFacilities = facilities.filter((facility) => facility.category === "پذیرایی" || facility.slug.includes("restaurant") || facility.slug.includes("cafe"));
  const categories = Array.from(new Set(menu.map((item) => item.category)));

  return (
    <>
      <PageHero
        kicker={`${modules.restaurant && modules.cafe ? "کافه و رستوران" : modules.cafe ? "کافه" : "رستوران"} · ${settings.city}`}
        title={settings.diningTitle}
        description={settings.diningDescription}
        image={settings.diningImage || settings.heroImage}
        breadcrumb={[{ label: "کافه و رستوران" }]}
      >
        <div className="flex flex-wrap gap-2 pt-1">
          <a href={phoneHref((settings.diningPhone || settings.phone))} className="btn btn-gold btn-sm">
            رزرو میز با تماس
          </a>
          <Link href="/contact" className="btn btn-outline btn-sm">
            ارسال درخواست رزرو میز
          </Link>
          <span className="neu-pill !text-[9px]">🕒 {settings.diningHours}</span>
          <span className="neu-pill !text-[9px]">🍽 {toFa(menu.length)} آیتم منو</span>
        </div>
      </PageHero>

      <section className="container-x py-12">
        <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="space-y-5">
            <SectionHeading
              align="start"
              kicker="منوی کاج"
              title="از صبحانه تا شام، با طعم‌های محلی"
              description="مواد اولیه تازه، نان خانگی و قهوه تخصصی. منو بر اساس فصل به‌روزرسانی می‌شود."
            />
            <MenuTabs
              items={menu.map((item) => ({
                id: item.id,
                name: item.name,
                description: item.description,
                price: item.price,
                category: item.category,
                imageUrl: item.imageUrl,
                featured: item.featured,
              }))}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28">
            <div className="panel space-y-3 p-5">
              <h2 className="text-sm font-extrabold text-forest-950">اطلاعات کافه و رستوران</h2>
              <dl className="space-y-2 text-[11px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-forest-800/55">ساعت سرو</dt>
                  <dd className="font-bold text-forest-950">{settings.diningHours}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-forest-800/55">تلفن رزرو میز</dt>
                  <dd dir="ltr" className="font-bold text-forest-950">{settings.diningPhone || settings.phone}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-forest-800/55">دسته‌بندی‌های منو</dt>
                  <dd className="font-bold text-forest-950">{toFa(categories.length)} دسته</dd>
                </div>
              </dl>
              {settings.diningNote ? (
                <p className="rounded-lg bg-gold-50 p-3 text-[10px] leading-5 text-gold-700">{settings.diningNote}</p>
              ) : null}
              <a href={settings.whatsappLink || "#"} target="_blank" rel="noreferrer" className="btn btn-gold btn-sm w-full">
                هماهنگی در واتس‌اپ
              </a>
            </div>

            {diningImages.length ? (
              <div className="panel space-y-2 p-3">
                <p className="px-1 text-[10px] font-bold text-forest-950">تصاویر فضا</p>
                <div className="grid grid-cols-2 gap-2">
                  {diningImages.map((image) => (
                    <SmartImage key={image.id} src={image.imageUrl} alt={image.title} loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                  ))}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      {diningFacilities.length ? (
        <section className="border-y border-cream-200 py-12">
          <div className="container-x space-y-6">
            <SectionHeading align="start" kicker="فضا و خدمات" title="آنچه در کافه‑رستوران کاج تجربه می‌کنید" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {diningFacilities.map((facility) => (
                <article key={facility.id} className="overflow-hidden rounded-xl border border-cream-200 bg-cream-50">
                  <SmartImage src={facility.imageUrl} alt={facility.title} loading="lazy" className="h-36 w-full object-cover" />
                  <div className="space-y-1 p-3">
                    <p className="text-xs font-extrabold text-forest-950">
                      {facility.icon} {facility.title}
                    </p>
                    <p className="line-clamp-2 text-[10px] leading-5 text-forest-800/60">{facility.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {settings.diningVideoUrl ? (
        <section className="container-x py-12">
          <div className="overflow-hidden rounded-2xl border border-cream-200 shadow-card">
            <video
              src={settings.diningVideoUrl}
              poster={settings.diningImage || settings.heroImage}
              controls
              playsInline
              className="aspect-video w-full bg-forest-950 object-cover"
            />
          </div>
        </section>
      ) : null}
    </>
  );
}
