import type { Metadata } from "next";
import GalleryGrid from "@/components/site/GalleryGrid";
import { PageHero } from "@/components/site/ui";
import { getGallery, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "گالری تصاویر",
  description: "تصاویر اتاق‌ها، کافه‑رستوران، حیاط و طبیعت اطراف هتل کاج.",
};

export default async function GalleryPage() {
  const [items, settings] = await Promise.all([getGallery(), getSettings()]);

  return (
    <>
      <PageHero
        kicker="گالری کاج"
        title="قبل از سفر، کاج را ببینید"
        description="مجموعه‌ای از تصاویر واقعی فضاهای هتل و طبیعت اطراف؛ برای دیدن تصویر بزرگ‌تر روی هر عکس بزنید."
        image={settings.heroImage}
      />
      <section className="container-x py-12">
        <GalleryGrid items={items} />
      </section>
    </>
  );
}
