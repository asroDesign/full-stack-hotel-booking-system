"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Clapperboard,
  LayoutGrid,
  BedDouble,
  Waves,
  Sparkles,
  ConciergeBell,
  MapPinned,
  Star,
  SearchCheck,
  Map as MapIcon,
  Plus,
  Trash2,
  RotateCcw,
  ExternalLink,
  Save,
} from "lucide-react";
import Link from "next/link";
import type { HomeContent } from "@/lib/content";
import { HOME_SECTIONS } from "@/lib/content-meta";
import { ArrowUp, ArrowDown, ListOrdered, UtensilsCrossed } from "lucide-react";
import { saveContent, resetContent } from "@/app/actions/admin";
import { FormAlert, SubmitButton } from "./ui";
import { IconSelect, MediaListEditor, StringListEditor } from "./media-inputs";
import { SectionCard, Switch, TextField } from "./content-fields";
import { MediaPlaylist } from "@/components/media-playlist";

export function HomeEditor({ initial, services, hasDining }: { initial: HomeContent; services: { slug: string; name: string }[]; hasDining: boolean }) {
  const [c, setC] = useState<HomeContent>(initial);
  const [state, action] = useActionState(saveContent, null);
  const [resetting, startReset] = useTransition();
  const router = useRouter();
  const set = <K extends keyof HomeContent>(k: K, v: HomeContent[K]) => setC((p) => ({ ...p, [k]: v }));

  return (
    <form action={action} className="space-y-4 pb-24">
      <input type="hidden" name="key" value="home" />
      <input type="hidden" name="json" value={JSON.stringify(c)} />

      <SectionCard title="ترتیب سکشن‌های صفحه اصلی" desc="سکشن‌ها به همین ترتیب زیر سکشن اول نمایش داده می‌شوند" icon={<ListOrdered className="h-5 w-5" />}>
        <ol className="space-y-2">
          {c.sectionOrder.map((k, i) => {
            const meta = HOME_SECTIONS.find((x) => x.key === k);
            const showKey = ({ features: "showFeatures", rooms: "showRooms", packages: "showPackages", spotlight: "showPool", dining: "showDining", amenities: "showAmenities", services: "showServices", attractions: "showAttractions", reviews: "showReviews", track: "showTrack", map: "showMap", offers: "showOffers", gallery: "showGallery", faq: "showFaq" } as const)[k as "rooms"];
            const visible = showKey ? (c[showKey] as boolean) : true;
            const mv = (d: number) => {
              const j = i + d;
              if (j < 0 || j >= c.sectionOrder.length) return;
              const a = [...c.sectionOrder];
              [a[i], a[j]] = [a[j], a[i]];
              set("sectionOrder", a);
            };
            return (
              <li key={k} className={`flex items-center gap-3 rounded-box border border-base-300 px-3 py-2 ${visible ? "" : "opacity-50"}`}>
                <span className="badge badge-ghost">{i + 1}</span>
                <span className="flex-1 text-sm font-medium">{meta?.title ?? k}</span>
                {showKey && <input type="checkbox" className="toggle toggle-sm toggle-success" checked={visible} onChange={(e) => set(showKey, e.target.checked as never)} title="نمایش" />}
                <button type="button" onClick={() => mv(-1)} disabled={i === 0} className="btn btn-square btn-ghost btn-xs"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => mv(1)} disabled={i === c.sectionOrder.length - 1} className="btn btn-square btn-ghost btn-xs"><ArrowDown className="h-3.5 w-3.5" /></button>
              </li>
            );
          })}
        </ol>
      </SectionCard>

      {/* HERO */}
      <SectionCard title="سکشن اول (Hero)" desc="ویدیو / GIF پس‌زمینه، عنوان، متن و دکمه‌ها" icon={<Clapperboard className="h-5 w-5" />} defaultOpen>
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div>
            <h4 className="mb-2 text-sm font-bold text-slate-700">رسانه‌های پس‌زمینه (پخش پشت سر هم)</h4>
            <MediaListEditor value={c.heroMedia} onChange={(v) => set("heroMedia", v)} />
          </div>
          <div>
            <h4 className="mb-2 text-sm font-bold text-slate-700">پیش‌نمایش زنده</h4>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-brand-950">
              <MediaPlaylist key={JSON.stringify(c.heroMedia)} items={c.heroMedia} fallback="/images/hero.jpg" indicatorClassName="bottom-3 left-3" />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/30" />
              <div className="absolute inset-0 bg-brand-950" style={{ opacity: (c.heroOverlay / 100) * 0.6 }} />
              <div className="absolute bottom-4 right-4 left-4 text-white">
                <div className="text-xs text-white/70">{c.heroBadge}</div>
                <div className="text-xl font-black">{c.heroTitle}</div>
                <div className="text-gradient text-sm font-bold">{c.heroHighlight}</div>
              </div>
            </div>
            <label className="field-label mt-4">تیرگی روی ویدیو: {c.heroOverlay}٪</label>
            <input type="range" min={0} max={90} value={c.heroOverlay} onChange={(e) => set("heroOverlay", Number(e.target.value))} className="range range-primary range-sm w-full" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="نشان بالای عنوان" value={c.heroBadge} onChange={(v) => set("heroBadge", v)} />
          <TextField label="عنوان اصلی" value={c.heroTitle} onChange={(v) => set("heroTitle", v)} />
          <TextField label="عنوان طلایی (زیرعنوان)" value={c.heroHighlight} onChange={(v) => set("heroHighlight", v)} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="دکمه اصلی" value={c.heroPrimaryCta} onChange={(v) => set("heroPrimaryCta", v)} />
            <TextField label="دکمه دوم" value={c.heroSecondaryCta} onChange={(v) => set("heroSecondaryCta", v)} />
          </div>
        </div>
        <TextField label="متن معرفی" value={c.heroText} onChange={(v) => set("heroText", v)} area />
        <div>
          <h4 className="mb-2 text-sm font-bold text-slate-700">کارت‌های آمار (حداکثر ۴)</h4>
          <div className="grid gap-2 md:grid-cols-2">
            {c.stats.map((s, i) => (
              <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
                <IconSelect value={s.icon} onChange={(v) => set("stats", c.stats.map((x, j) => (j === i ? { ...x, icon: v } : x)))} />
                <input value={s.value} onChange={(e) => set("stats", c.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} className="input w-24" placeholder="مقدار" />
                <input value={s.label} onChange={(e) => set("stats", c.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} className="input w-full" placeholder="عنوان" />
                <button type="button" onClick={() => set("stats", c.stats.filter((_, j) => j !== i))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          {c.stats.length < 4 && (
            <button type="button" onClick={() => set("stats", [...c.stats, { icon: "Star", value: "", label: "" }])} className="btn mt-2"><Plus className="h-4 w-4" /> افزودن کارت</button>
          )}
        </div>
      </SectionCard>

      {/* FEATURES */}
      <SectionCard title="نوار ویژگی‌ها" desc="۴ ویژگی زیر سکشن اول" icon={<LayoutGrid className="h-5 w-5" />} visible={c.showFeatures} onToggleVisible={(v) => set("showFeatures", v)}>
        <div className="grid gap-2 md:grid-cols-2">
          {c.features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl bg-slate-50 p-2">
              <IconSelect value={f.icon} onChange={(v) => set("features", c.features.map((x, j) => (j === i ? { ...x, icon: v } : x)))} />
              <input value={f.title} onChange={(e) => set("features", c.features.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="input w-full" placeholder="عنوان" />
              <input value={f.text} onChange={(e) => set("features", c.features.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} className="input w-full" placeholder="توضیح" />
              <button type="button" onClick={() => set("features", c.features.filter((_, j) => j !== i))} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        {c.features.length < 4 && (
          <button type="button" onClick={() => set("features", [...c.features, { icon: "Sparkles", title: "", text: "" }])} className="btn"><Plus className="h-4 w-4" /> افزودن ویژگی</button>
        )}
      </SectionCard>

      {/* ROOMS */}
      <SectionCard title="سکشن اتاق‌ها" desc={c.roomsTitle} icon={<BedDouble className="h-5 w-5" />} visible={c.showRooms} onToggleVisible={(v) => set("showRooms", v)}>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="برچسب" value={c.roomsEyebrow} onChange={(v) => set("roomsEyebrow", v)} />
          <TextField label="عنوان" value={c.roomsTitle} onChange={(v) => set("roomsTitle", v)} />
          <div>
            <label className="field-label">تعداد اتاق نمایشی</label>
            <input type="number" min={1} max={16} value={c.roomsCount} onChange={(e) => set("roomsCount", Number(e.target.value) || 6)} className="input w-full" />
          </div>
        </div>
        <TextField label="توضیح" value={c.roomsText} onChange={(v) => set("roomsText", v)} area rows={2} hint="اتاق‌هایی که در بخش «اتاق‌ها» به‌عنوان «ویژه» علامت خورده‌اند نمایش داده می‌شوند." />
      </SectionCard>

      {/* POOL */}
      <SectionCard title="سکشن ویژه (استخر، اسپا، سالن جلسات، …)" desc="معرفی برجسته یک خدمت با ویدیو / GIF" icon={<Waves className="h-5 w-5" />} visible={c.showPool} onToggleVisible={(v) => set("showPool", v)}>
        <div>
          <label className="field-label">خدمت نمایش داده‌شده</label>
          <select value={c.spotlightServiceSlug} onChange={(e) => set("spotlightServiceSlug", e.target.value)} className="select w-full">
            <option value="">خودکار (استخر یا اسپا در صورت وجود)</option>
            {services.map((sv) => <option key={sv.slug} value={sv.slug}>{sv.name}</option>)}
          </select>
          {services.length === 0 && <p className="mt-1 text-xs text-warning">هیچ خدمتی تعریف نشده؛ این سکشن نمایش داده نمی‌شود.</p>}
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
          <div>
            <h4 className="mb-2 text-sm font-bold text-slate-700">ویدیو / GIF استخر</h4>
            <MediaListEditor value={c.poolMedia} onChange={(v) => set("poolMedia", v)} />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-950">
            <MediaPlaylist key={JSON.stringify(c.poolMedia)} items={c.poolMedia} fallback="/images/pool.jpg" indicatorClassName="bottom-3 right-3" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="برچسب" value={c.poolEyebrow} onChange={(v) => set("poolEyebrow", v)} />
          <TextField label="عنوان" value={c.poolTitle} onChange={(v) => set("poolTitle", v)} />
        </div>
        <TextField label="توضیحات" value={c.poolText} onChange={(v) => set("poolText", v)} area />
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="نشان (خط اول)" value={c.poolBadgeTop} onChange={(v) => set("poolBadgeTop", v)} />
          <TextField label="نشان (خط دوم)" value={c.poolBadgeBottom} onChange={(v) => set("poolBadgeBottom", v)} />
          <TextField label="متن دکمه رزرو" value={c.poolCta} onChange={(v) => set("poolCta", v)} />
        </div>
        <div>
          <label className="field-label">ویژگی‌های استخر</label>
          <StringListEditor value={c.poolFeatures} onChange={(v) => set("poolFeatures", v)} placeholder="مثلاً جکوزی و سونا" />
        </div>
        <div className="flex items-center justify-between rounded-xl bg-gold-400/10 p-4 text-sm text-slate-700">
          سانس‌ها، قیمت هر سانس و هزینه نفر اضافه در ویرایش همان خدمت مدیریت می‌شوند.
          <Link href="/admin/services" className="btn shrink-0">مدیریت سانس‌ها</Link>
        </div>
      </SectionCard>

      {/* DINING */}
      <SectionCard title="سکشن رستوران و کافه" desc={c.diningTitle} icon={<UtensilsCrossed className="h-5 w-5" />} visible={c.showDining} onToggleVisible={(v) => set("showDining", v)}>
        {!hasDining && <div role="alert" className="alert alert-warning alert-soft text-sm">هنوز رستوران یا کافه فعالی تعریف نشده؛ از منوی «رستوران و کافه» اضافه کنید.</div>}
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="برچسب" value={c.diningEyebrow} onChange={(v) => set("diningEyebrow", v)} />
          <TextField label="عنوان" value={c.diningTitle} onChange={(v) => set("diningTitle", v)} />
          <TextField label="متن دکمه" value={c.diningCta} onChange={(v) => set("diningCta", v)} />
        </div>
        <TextField label="توضیح" value={c.diningText} onChange={(v) => set("diningText", v)} area rows={2} />
      </SectionCard>

      {/* OFFERS / GALLERY / FAQ */}
      <SectionCard title="سکشن‌های پیشنهاد ویژه، گالری و سوالات متداول" desc="محتوا از منوهای «پیشنهادها»، «گالری» و «سوالات متداول» مدیریت می‌شود" icon={<Sparkles className="h-5 w-5" />}>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="برچسب پیشنهادها" value={c.offersEyebrow} onChange={(v) => set("offersEyebrow", v)} />
          <TextField label="عنوان پیشنهادها" value={c.offersTitle} onChange={(v) => set("offersTitle", v)} />
          <TextField label="توضیح پیشنهادها" value={c.offersText} onChange={(v) => set("offersText", v)} />
          <TextField label="برچسب گالری" value={c.galleryEyebrow} onChange={(v) => set("galleryEyebrow", v)} />
          <TextField label="عنوان گالری" value={c.galleryTitle} onChange={(v) => set("galleryTitle", v)} />
          <div />
          <TextField label="برچسب سوالات" value={c.faqEyebrow} onChange={(v) => set("faqEyebrow", v)} />
          <TextField label="عنوان سوالات" value={c.faqTitle} onChange={(v) => set("faqTitle", v)} />
        </div>
        <p className="text-xs text-base-content/50">نمایش یا پنهان کردن و ترتیب این سکشن‌ها از کارت «ترتیب سکشن‌ها» در بالای صفحه انجام می‌شود.</p>
      </SectionCard>

      {/* AMENITIES */}
      <SectionCard title="سکشن امکانات" desc={c.amenitiesTitle} icon={<Sparkles className="h-5 w-5" />} visible={c.showAmenities} onToggleVisible={(v) => set("showAmenities", v)}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="برچسب" value={c.amenitiesEyebrow} onChange={(v) => set("amenitiesEyebrow", v)} />
          <TextField label="عنوان" value={c.amenitiesTitle} onChange={(v) => set("amenitiesTitle", v)} />
        </div>
        <TextField label="توضیح" value={c.amenitiesText} onChange={(v) => set("amenitiesText", v)} />
      </SectionCard>

      {/* SERVICES */}
      <SectionCard title="سکشن خدمات" desc={c.servicesTitle} icon={<ConciergeBell className="h-5 w-5" />} visible={c.showServices} onToggleVisible={(v) => set("showServices", v)}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="برچسب" value={c.servicesEyebrow} onChange={(v) => set("servicesEyebrow", v)} />
          <TextField label="عنوان" value={c.servicesTitle} onChange={(v) => set("servicesTitle", v)} />
        </div>
      </SectionCard>

      {/* ATTRACTIONS */}
      <SectionCard title="سکشن جاذبه‌های گردشگری" desc={c.attractionsTitle} icon={<MapPinned className="h-5 w-5" />} visible={c.showAttractions} onToggleVisible={(v) => set("showAttractions", v)}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="برچسب" value={c.attractionsEyebrow} onChange={(v) => set("attractionsEyebrow", v)} />
          <TextField label="عنوان" value={c.attractionsTitle} onChange={(v) => set("attractionsTitle", v)} />
        </div>
        <TextField label="توضیح" value={c.attractionsText} onChange={(v) => set("attractionsText", v)} />
      </SectionCard>

      {/* REVIEWS */}
      <SectionCard title="سکشن نظرات مهمانان" desc={c.reviewsTitle} icon={<Star className="h-5 w-5" />} visible={c.showReviews} onToggleVisible={(v) => set("showReviews", v)}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="برچسب" value={c.reviewsEyebrow} onChange={(v) => set("reviewsEyebrow", v)} />
          <TextField label="عنوان" value={c.reviewsTitle} onChange={(v) => set("reviewsTitle", v)} />
        </div>
      </SectionCard>

      {/* TRACK */}
      <SectionCard title="سکشن پیگیری رزرو" desc={c.trackTitle} icon={<SearchCheck className="h-5 w-5" />} visible={c.showTrack} onToggleVisible={(v) => set("showTrack", v)}>
        <TextField label="عنوان" value={c.trackTitle} onChange={(v) => set("trackTitle", v)} />
        <TextField label="توضیح" value={c.trackText} onChange={(v) => set("trackText", v)} area rows={2} />
      </SectionCard>

      {/* MAP */}
      <SectionCard title="سکشن نقشه و موقعیت" desc={c.mapTitle} icon={<MapIcon className="h-5 w-5" />} visible={c.showMap} onToggleVisible={(v) => set("showMap", v)}>
        <div className="grid gap-4 md:grid-cols-3">
          <TextField label="برچسب" value={c.mapEyebrow} onChange={(v) => set("mapEyebrow", v)} />
          <TextField label="عنوان" value={c.mapTitle} onChange={(v) => set("mapTitle", v)} />
          <TextField label="متن دکمه" value={c.mapCta} onChange={(v) => set("mapCta", v)} />
        </div>
        <p className="text-xs text-slate-400">آدرس و مختصات نقشه از بخش تنظیمات ویرایش می‌شوند.</p>
      </SectionCard>

      <div className="fixed inset-x-4 bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-2xl ring-1 ring-slate-200 backdrop-blur lg:right-[19rem]">
        <SubmitButton className="btn btn-primary px-8"><Save className="h-4 w-4" /> ذخیره و انتشار</SubmitButton>
        <Link href="/" target="_blank" className="btn"><ExternalLink className="h-4 w-4" /> مشاهده صفحه اصلی</Link>
        <button
          type="button"
          disabled={resetting}
          onClick={() => {
            if (!confirm("تمام محتوای صفحه اصلی به حالت پیش‌فرض برگردد؟")) return;
            startReset(async () => {
              await resetContent("home");
              router.refresh();
              window.location.reload();
            });
          }}
          className="btn text-slate-500 hover:bg-slate-100"
        >
          <RotateCcw className="h-4 w-4" /> بازگشت به پیش‌فرض
        </button>
        <div className="min-w-[200px] flex-1"><FormAlert state={state} /></div>
      </div>
    </form>
  );
}
