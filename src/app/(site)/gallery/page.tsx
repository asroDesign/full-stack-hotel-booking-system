import { notFound } from "next/navigation";
import { getSettings } from "@/lib/data";
import { getGallery } from "@/lib/extras";
import { PageHero, EmptyState } from "@/components/site/ui";
import { GalleryGrid } from "@/components/site/extras-client";
import { faNum } from "@/lib/utils";

export const metadata = { title: "گالری تصاویر" };

export default async function GalleryPage() {
  const s = await getSettings();
  if (s.moduleGallery !== "1") notFound();
  const items = await getGallery();
  return (
    <>
      <PageHero eyebrow={`${faNum(items.length)} تصویر`} title="گالری تصاویر" subtitle={`نگاهی به اتاق‌ها، فضاهای عمومی، رستوران و حال‌وهوای ${s.hotelName}.`} image={items[0]?.url || "/images/hero.jpg"} />
      <section className="mx-auto max-w-7xl px-6 py-14">
        {items.length === 0 ? <EmptyState title="هنوز تصویری در گالری ثبت نشده است" /> : <GalleryGrid items={items.map((i) => ({ id: i.id, url: i.url, caption: i.caption, category: i.category }))} />}
      </section>
    </>
  );
}
