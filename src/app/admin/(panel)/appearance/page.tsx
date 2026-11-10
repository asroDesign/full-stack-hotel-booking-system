import { getSettingsFresh } from "@/lib/data";
import { PALETTES, TEMPLATES } from "@/lib/appearance";
import { PRESETS } from "@/lib/presets";
import { PageHeader } from "@/components/admin/ui";
import { AppearanceForm } from "@/components/admin/appearance";

export default async function AppearancePage() {
  const s = await getSettingsFresh();
  const pick = ["hotelName", "hotelNameEn", "city", "tagline", "stars", "logoUrl", "footerText", "seoDescription", "siteTemplate", "palette", "moduleDining", "moduleServices", "moduleAmenities", "moduleAttractions", "moduleOffers", "moduleGallery", "moduleFaq", "floatingContact"] as const;
  return (
    <div>
      <PageHeader title="هویت و ظاهر سایت" desc="نام و لوگو، قالب ظاهری، رنگ‌بندی، ستاره و بخش‌های فعال سایت" />
      <AppearanceForm
        s={Object.fromEntries(pick.map((k) => [k, s[k]]))}
        templates={TEMPLATES.map((t) => ({ key: t.key, title: t.title, desc: t.desc }))}
        palettes={PALETTES.map((p) => ({ key: p.key, title: p.title, colors: p.colors }))}
        presets={PRESETS.map((p) => ({ key: p.key, title: p.title, desc: p.desc, settings: p.settings }))}
      />
    </div>
  );
}
