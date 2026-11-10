"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Palette, LayoutTemplate, ToggleRight, Building2, Wand2, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { applyPreset, saveSettings } from "@/app/actions/admin";
import { FormAlert, ImageListInput, SubmitButton, Toast } from "./ui";
import { cn, faNum } from "@/lib/utils";

type Opt = { key: string; title: string; desc?: string; colors?: readonly string[] };
type Preset = { key: string; title: string; desc: string; settings: Record<string, string> };

function TemplateThumb({ k, colors }: { k: string; colors: readonly string[] }) {
  const [dark, mid, light, accent] = colors;
  if (k === "opus") {
    return (
      <div className="relative h-32 overflow-hidden rounded-field" style={{ background: dark }}>
        <div className="flex items-center justify-between px-2.5 pt-2">
          <span className="h-3 w-3 rounded-full border border-white/40" />
          <span className="h-3 w-9 rounded-full border border-white/40" />
        </div>
        <div className="absolute right-2.5 top-8 space-y-1.5">
          <div className="h-4 w-20 rounded bg-white/90" />
          <div className="h-2.5 w-14 rounded" style={{ background: accent }} />
          <div className="h-1.5 w-16 rounded bg-white/30" />
          <div className="mt-2 h-3 w-10 rounded-full" style={{ background: accent }} />
        </div>
        <div className="absolute bottom-0 left-3 h-[86px] w-14 rounded-t-full" style={{ background: `linear-gradient(170deg, ${light}, ${mid})` }} />
        <span className="absolute bottom-3 left-14 h-6 w-6 rounded-full" style={{ background: accent }} />
        <div className="absolute inset-x-6 -bottom-1 h-3 rounded-t bg-white shadow" />
      </div>
    );
  }
  if (k === "glass") {
    const pane = { background: "rgba(255,255,255,.5)", border: "1px solid rgba(255,255,255,.75)", backdropFilter: "blur(6px)" } as const;
    return (
      <div className="relative h-32 overflow-hidden rounded-field" style={{ background: "#f3f2fb" }}>
        <span className="absolute -right-6 -top-8 h-24 w-24 rounded-full blur-xl" style={{ background: light, opacity: 0.8 }} />
        <span className="absolute -left-6 top-10 h-20 w-20 rounded-full blur-xl" style={{ background: accent, opacity: 0.7 }} />
        <span className="absolute bottom-[-1.5rem] right-1/3 h-20 w-20 rounded-full blur-xl" style={{ background: "#f9a8d4", opacity: 0.6 }} />
        <div className="relative m-2 h-3.5 rounded-md" style={pane} />
        <div className="relative mx-2 grid h-[82px] grid-cols-4 grid-rows-2 gap-1.5">
          <div className="col-span-2 row-span-2 rounded-lg" style={{ background: `linear-gradient(160deg, ${mid}, ${dark})` }} />
          <div className="col-span-2 rounded-lg p-1" style={pane}><div className="h-2 w-2/3 rounded" style={{ background: mid }} /></div>
          <div className="rounded-lg" style={pane} />
          <div className="rounded-lg" style={pane} />
        </div>
      </div>
    );
  }
  if (k === "soft") {
    const bg = "#e6ebf1";
    const up = "4px 4px 8px #b5c0cf, -4px -4px 8px #ffffff";
    const down = "inset 3px 3px 6px #b5c0cf, inset -3px -3px 6px #ffffff";
    return (
      <div className="relative h-32 overflow-hidden rounded-field p-2.5" style={{ background: bg }}>
        <div className="mx-auto flex h-5 w-11/12 items-center justify-between rounded-full px-1.5" style={{ background: bg, boxShadow: up }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: bg, boxShadow: up }} />
          <span className="h-2.5 w-14 rounded-full" style={{ boxShadow: down }} />
          <span className="h-2.5 w-5 rounded-full" style={{ background: mid }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5 pt-1">
            <div className="h-2.5 w-4/5 rounded" style={{ background: dark }} />
            <div className="h-2 w-3/5 rounded" style={{ background: mid }} />
            <div className="mt-2.5 h-3.5 w-12 rounded-full" style={{ background: mid, boxShadow: up }} />
          </div>
          <div className="rounded-xl p-1" style={{ background: bg, boxShadow: up }}>
            <div className="rounded-lg p-0.5" style={{ boxShadow: down }}>
              <div className="h-10 rounded-md" style={{ background: `linear-gradient(135deg, ${light}, ${mid})` }} />
            </div>
          </div>
        </div>
        <div className="absolute inset-x-3 bottom-2 flex h-5 items-center gap-1.5 rounded-full px-1.5" style={{ background: bg, boxShadow: up }}>
          <span className="h-2 flex-1 rounded-full" style={{ boxShadow: down }} />
          <span className="h-2 flex-1 rounded-full" style={{ boxShadow: down }} />
          <span className="h-3 w-6 rounded-full" style={{ background: accent }} />
        </div>
      </div>
    );
  }
  if (k === "grand")
    return (
      <div className="relative h-32 overflow-hidden rounded-field" style={{ background: `linear-gradient(180deg, ${mid}, ${dark})` }}>
        <div className="flex items-center justify-between px-2.5 pt-2">
          <div className="flex gap-1">{[0, 1, 2].map((i) => <div key={i} className="h-1 w-4 rounded bg-white/40" />)}</div>
          <div className="h-3 w-3 border" style={{ borderColor: accent }} />
          <div className="flex gap-1">{[0, 1].map((i) => <div key={i} className="h-1 w-4 rounded bg-white/40" />)}<div className="h-1.5 w-5 rounded border" style={{ borderColor: accent }} /></div>
        </div>
        <div className="mt-4 flex flex-col items-center gap-1.5">
          <div className="flex items-center gap-1"><span className="h-px w-4" style={{ background: accent }} /><span className="text-[6px]" style={{ color: accent }}>★★★★</span><span className="h-px w-4" style={{ background: accent }} /></div>
          <div className="h-2.5 w-24 rounded-full bg-white/80" />
          <div className="h-2 w-16 rounded-full" style={{ background: accent }} />
        </div>
        <div className="absolute inset-x-4 bottom-2 flex h-5 items-center gap-1 rounded bg-white px-1.5 shadow">
          <div className="h-1.5 flex-1 rounded bg-black/10" />
          <div className="h-1.5 flex-1 rounded bg-black/10" />
          <div className="h-3 w-6 rounded" style={{ background: mid }} />
        </div>
      </div>
    );
  if (k === "boutique")
    return (
      <div className="relative h-32 overflow-hidden rounded-field bg-[#fbf8f2] p-2.5">
        <div className="mb-2 h-1.5 w-full rounded" style={{ background: dark }} />
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5 pt-2">
            <div className="h-2.5 w-4/5 rounded" style={{ background: dark }} />
            <div className="h-2 w-3/5 rounded" style={{ background: mid }} />
            <div className="h-1.5 w-full rounded bg-black/10" />
            <div className="h-1.5 w-5/6 rounded bg-black/10" />
            <div className="mt-2 h-3 w-12 rounded" style={{ background: mid }} />
          </div>
          <div className="h-20 rounded-t-full" style={{ background: `linear-gradient(160deg, ${light}, ${mid})` }} />
        </div>
        <div className="absolute bottom-1.5 left-2.5 right-2.5 h-1 rounded" style={{ background: accent }} />
      </div>
    );
  return (
    <div className="relative h-32 overflow-hidden rounded-field p-2.5" style={{ background: `linear-gradient(180deg, ${mid}, ${dark})` }}>
      <div className="mx-auto h-3 w-11/12 rounded-full bg-white/25" />
      <div className="absolute bottom-3 right-3 space-y-1.5">
        <div className="h-3 w-24 rounded bg-white/90" />
        <div className="h-2 w-16 rounded" style={{ background: accent }} />
        <div className="h-3 w-10 rounded" style={{ background: accent }} />
      </div>
      <div className="absolute bottom-3 left-3 grid grid-cols-2 gap-1">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-5 w-7 rounded bg-white/20" />)}
      </div>
    </div>
  );
}

export function AppearanceForm({
  s,
  templates,
  palettes,
  presets,
}: {
  s: Record<string, string>;
  templates: Opt[];
  palettes: Opt[];
  presets: Preset[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(saveSettings, null);
  const [tpl, setTpl] = useState(s.siteTemplate);
  const [pal, setPal] = useState(s.palette);
  const [stars, setStars] = useState(Number(s.stars) || 3);
  const [mods, setMods] = useState({
    moduleDining: s.moduleDining === "1",
    moduleServices: s.moduleServices === "1",
    moduleAmenities: s.moduleAmenities === "1",
    moduleAttractions: s.moduleAttractions === "1",
    moduleOffers: s.moduleOffers === "1",
    moduleGallery: s.moduleGallery === "1",
    moduleFaq: s.moduleFaq === "1",
    floatingContact: s.floatingContact === "1",
  });
  const [replaceTexts, setReplaceTexts] = useState(false);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const palColors = palettes.find((p) => p.key === pal)?.colors ?? palettes[0].colors!;

  return (
    <div className="space-y-6">
      <div className="card card-border bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-5">
          <h3 className="flex items-center gap-2 font-extrabold"><Wand2 className="h-5 w-5 text-secondary" /> قالب‌های آماده (اعمال یک‌کلیکی)</h3>
          <p className="text-xs text-base-content/60">ظاهر، رنگ، ستاره و ترتیب سکشن‌ها را یکجا تنظیم می‌کند. اتاق‌ها، رزروها و تصاویر شما تغییر نمی‌کنند.</p>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {presets.map((p) => {
              const colors = palettes.find((x) => x.key === p.settings.palette)?.colors ?? palColors;
              return (
                <div key={p.key} className="flex flex-col gap-3 rounded-box border border-base-300 p-3">
                  <TemplateThumb k={p.settings.siteTemplate} colors={colors} />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{p.title}</span>
                    <span className="flex">{Array.from({ length: Number(p.settings.stars) }).map((_, i) => <Star key={i} className="h-3 w-3 fill-warning text-warning" />)}</span>
                  </div>
                  <p className="flex-1 text-xs leading-5 text-base-content/60">{p.desc}</p>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm(`قالب «${p.title}» اعمال شود؟${replaceTexts ? "\nمتن‌های صفحه اصلی و رزرو هم جایگزین می‌شوند." : ""}`)) return;
                      start(async () => { const r = await applyPreset(p.key, replaceTexts); setToast({ msg: r.message, tone: r.ok ? "success" : "error" }); if (r.ok) { router.refresh(); setTimeout(() => window.location.reload(), 600); } });
                    }}
                    className="btn btn-sm btn-soft btn-primary"
                  >
                    اعمال
                  </button>
                </div>
              );
            })}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="checkbox checkbox-sm checkbox-warning" checked={replaceTexts} onChange={(e) => setReplaceTexts(e.target.checked)} />
            متن‌های صفحه اصلی و صفحه رزرو هم با متن‌های عمومی (بدون استخر) جایگزین شود
          </label>
        </div>
      </div>

      <form action={action} className="space-y-6">
        <input type="hidden" name="siteTemplate" value={tpl} />
        <input type="hidden" name="palette" value={pal} />
        <input type="hidden" name="stars" value={stars} />
        {Object.entries(mods).map(([k, v]) => <input key={k} type="hidden" name={k} value={v ? "1" : "0"} />)}

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
            <h3 className="flex items-center gap-2 font-extrabold"><Building2 className="h-5 w-5 text-primary" /> هویت هتل</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="field-label">نام هتل</label><input name="hotelName" defaultValue={s.hotelName} className="input w-full" required /></div>
              <div><label className="field-label">نام لاتین</label><input name="hotelNameEn" defaultValue={s.hotelNameEn} dir="ltr" className="input w-full text-left" /></div>
              <div><label className="field-label">شهر</label><input name="city" defaultValue={s.city} className="input w-full" /></div>
              <div><label className="field-label">شعار</label><input name="tagline" defaultValue={s.tagline} className="input w-full" /></div>
            </div>
            <div>
              <label className="field-label">تعداد ستاره</label>
              <div className="join">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setStars(n)} className={cn("btn join-item btn-sm gap-1", stars === n ? "btn-warning" : "")}>{faNum(n)} <Star className="h-3 w-3" /></button>
                ))}
              </div>
            </div>
            <div><label className="field-label">لوگو (اختیاری؛ PNG شفاف پیشنهاد می‌شود)</label><ImageListInput name="logoUrl" single initial={s.logoUrl ? [s.logoUrl] : []} /></div>
            <div><label className="field-label">متن معرفی فوتر</label><textarea name="footerText" defaultValue={s.footerText} rows={3} className="textarea w-full" /></div>
            <div><label className="field-label">توضیح سئو (meta description)</label><textarea name="seoDescription" defaultValue={s.seoDescription} rows={2} className="textarea w-full" /></div>
          </div></section>

          <div className="space-y-6">
            <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
              <h3 className="flex items-center gap-2 font-extrabold"><LayoutTemplate className="h-5 w-5 text-primary" /> قالب ظاهری</h3>
              <div className="grid grid-cols-2 gap-3">
                {templates.map((t) => (
                  <button key={t.key} type="button" onClick={() => setTpl(t.key)} className={cn("rounded-box border-2 p-2 text-right transition", tpl === t.key ? "border-primary bg-primary/5" : "border-base-300 hover:border-primary/40")}>
                    <TemplateThumb k={t.key} colors={palColors} />
                    <div className="mt-2 flex items-center gap-1.5 text-sm font-bold">{tpl === t.key && <Check className="h-4 w-4 text-primary" />}{t.title}</div>
                    <p className="mt-1 text-[11px] leading-5 text-base-content/55">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div></section>

            <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
              <h3 className="flex items-center gap-2 font-extrabold"><Palette className="h-5 w-5 text-primary" /> پالت رنگ</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {palettes.map((p) => (
                  <button key={p.key} type="button" onClick={() => setPal(p.key)} className={cn("flex flex-col gap-2 rounded-box border-2 p-2.5 text-right", pal === p.key ? "border-primary" : "border-base-300")}>
                    <span className="flex h-7 overflow-hidden rounded-field">{p.colors!.map((c) => <span key={c} className="flex-1" style={{ background: c }} />)}</span>
                    <span className="flex items-center gap-1 text-xs font-medium">{pal === p.key && <Check className="h-3.5 w-3.5 text-primary" />}{p.title}</span>
                  </button>
                ))}
              </div>
            </div></section>

            <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
              <h3 className="flex items-center gap-2 font-extrabold"><ToggleRight className="h-5 w-5 text-primary" /> بخش‌های سایت</h3>
              {([
                ["moduleDining", "رستوران و کافه", "صفحه منو و معرفی رستوران/کافه"],
                ["moduleServices", "خدمات", "استخر، اسپا، سالن جلسات، ترانسفر و …"],
                ["moduleAmenities", "امکانات", "فهرست امکانات رفاهی"],
                ["moduleAttractions", "جاذبه‌های گردشگری", "مکان‌های دیدنی اطراف روی نقشه"],
                ["moduleOffers", "پیشنهادهای ویژه", "کدهای تخفیف عمومی و صفحه پیشنهادها"],
                ["moduleGallery", "گالری تصاویر", "صفحه گالری با فیلتر و نمایش تمام‌صفحه"],
                ["moduleFaq", "سوالات متداول", "صفحه سوالات متداول"],
                ["floatingContact", "دکمه‌های شناور تماس", "تماس، واتس‌اپ و بازگشت به بالا"],
              ] as const).map(([k, l, d]) => (
                <label key={k} className="flex cursor-pointer items-center justify-between gap-3 rounded-box bg-base-200/60 px-4 py-2.5">
                  <span><span className="block text-sm font-medium">{l}</span><span className="block text-xs text-base-content/50">{d}</span></span>
                  <input type="checkbox" className="toggle toggle-primary" checked={mods[k]} onChange={(e) => setMods((m) => ({ ...m, [k]: e.target.checked }))} />
                </label>
              ))}
              <p className="text-xs text-base-content/50">نمایش هر سکشن در صفحه اصلی و ترتیب آن‌ها از <Link href="/admin/home" className="link link-primary">مدیریت صفحه اصلی</Link> تنظیم می‌شود.</p>
            </div></section>
          </div>
        </div>

        <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-box bg-base-100/90 p-3 shadow-lg ring-1 ring-base-300 backdrop-blur">
          <SubmitButton className="btn btn-primary px-8">ذخیره و انتشار</SubmitButton>
          <Link href="/" target="_blank" className="btn"><ExternalLink className="h-4 w-4" /> مشاهده سایت</Link>
          <div className="flex-1"><FormAlert state={state} /></div>
        </div>
      </form>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}
