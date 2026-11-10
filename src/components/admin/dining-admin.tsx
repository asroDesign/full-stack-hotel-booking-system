"use client";

import Link from "next/link";
import { useActionState, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, Eye, EyeOff, UtensilsCrossed, ArrowUp, ArrowDown, Sparkles, Save, Copy } from "lucide-react";
import type { DiningVenue, MenuItem } from "@/db/schema";
import { deleteVenue, saveMenu, saveVenue, toggleVenue, type MenuItemInput } from "@/app/actions/dining";
import { EmptyBox, FormAlert, ImageListInput, SubmitButton, Toast } from "./ui";
import { VideoUrlInput, uploadFile } from "./media-inputs";
import { FeaturesEditor } from "./room-extras";
import { cn, faNum, formatPrice } from "@/lib/utils";

const KINDS: [string, string][] = [
  ["restaurant", "رستوران"],
  ["cafe", "کافه"],
  ["coffee_shop", "کافی‌شاپ"],
  ["breakfast", "سالن صبحانه"],
  ["rooftop", "روف‌گاردن"],
  ["bar", "لانژ / آبمیوه‌بار"],
];
const kindLabel = (k: string) => KINDS.find(([v]) => v === k)?.[1] ?? k;
const TAGS: [string, string][] = [
  ["popular", "محبوب"],
  ["new", "جدید"],
  ["veg", "گیاهی"],
  ["spicy", "تند"],
  ["local", "محلی"],
  ["chef", "پیشنهاد سرآشپز"],
];

export function VenuesList({ initial, counts }: { initial: DiningVenue[]; counts: Record<number, number> }) {
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  type A = { type: "del"; id: number } | { type: "toggle"; id: number; v: boolean };
  const [items, apply] = useOptimistic(initial, (s: DiningVenue[], a: A) =>
    a.type === "del" ? s.filter((x) => x.id !== a.id) : s.map((x) => (x.id === a.id ? { ...x, isActive: a.v } : x)),
  );
  if (!items.length)
    return <EmptyBox title="هنوز رستوران یا کافه‌ای تعریف نشده" desc="رستوران، کافه، سالن صبحانه یا روف‌گاردن هتل را همراه با منو معرفی کنید." icon={<UtensilsCrossed className="h-6 w-6" />} action={<Link href="/admin/dining/new" className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن</Link>} />;
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((v) => (
          <div key={v.id} className={cn("card card-border overflow-hidden bg-base-100 shadow-sm", !v.isActive && "opacity-60")}>
            <figure className="relative aspect-[16/9] bg-base-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {v.images[0] && <img src={v.images[0]} alt="" className="h-full w-full object-cover" />}
              <span className="badge badge-secondary absolute right-3 top-3">{kindLabel(v.kind)}</span>
              {v.isDemo && <span className="badge badge-ghost absolute left-3 top-3">نمونه</span>}
            </figure>
            <div className="card-body gap-2 p-4">
              <h3 className="card-title text-base">{v.name}</h3>
              <p className="line-clamp-1 text-sm text-base-content/60">{v.tagline || v.cuisine}</p>
              <div className="text-xs text-base-content/50">{faNum(counts[v.id] ?? 0)} آیتم منو · {v.hours[0] ? `${v.hours[0].label} ${v.hours[0].time}` : "ساعت کاری تعریف نشده"}</div>
              <div className="card-actions mt-2 items-center border-t border-base-200 pt-3">
                <button
                  type="button"
                  onClick={() => start(async () => { apply({ type: "toggle", id: v.id, v: !v.isActive }); await toggleVenue(v.id, !v.isActive); setToast(v.isActive ? "غیرفعال شد" : "فعال شد"); })}
                  className={cn("btn btn-xs btn-soft", v.isActive ? "btn-success" : "")}
                >
                  {v.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {v.isActive ? "فعال" : "غیرفعال"}
                </button>
                <div className="flex-1" />
                <Link href={`/admin/dining/${v.id}`} className="btn btn-square btn-sm btn-soft"><Pencil className="h-4 w-4" /></Link>
                <button type="button" onClick={() => { if (confirm(`«${v.name}» و منوی آن حذف شود؟`)) start(async () => { apply({ type: "del", id: v.id }); await deleteVenue(v.id); setToast("حذف شد"); }); }} className="btn btn-square btn-sm btn-soft btn-error"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

export function VenueForm({ venue }: { venue?: DiningVenue }) {
  const [state, action] = useActionState(saveVenue, null);
  const [hours, setHours] = useState(venue?.hours ?? [{ label: "همه روزه", time: "" }]);
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <input type="hidden" name="id" value={venue?.id ?? ""} />
      <input type="hidden" name="hours" value={JSON.stringify(hours)} />
      <div className="space-y-6">
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
          <h3 className="font-extrabold">معرفی</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="field-label">نام *</label><input name="name" defaultValue={venue?.name} required className="input w-full" placeholder="مثلاً کافه نارون" /></div>
            <div><label className="field-label">نوع</label><select name="kind" defaultValue={venue?.kind ?? "restaurant"} className="select w-full">{KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div className="sm:col-span-2"><label className="field-label">شعار کوتاه</label><input name="tagline" defaultValue={venue?.tagline} className="input w-full" placeholder="مثلاً قهوه، کتاب و پنجره‌ای رو به خیابان" /></div>
            <div><label className="field-label">نوع غذا / منو</label><input name="cuisine" defaultValue={venue?.cuisine} className="input w-full" placeholder="ایرانی، فست‌فود، قهوه تخصصی…" /></div>
            <div><label className="field-label">سطح قیمت</label><select name="priceLevel" defaultValue={venue?.priceLevel ?? 2} className="select w-full"><option value={1}>اقتصادی</option><option value={2}>متوسط</option><option value={3}>بالا</option><option value={4}>لوکس</option></select></div>
          </div>
          <div><label className="field-label">توضیحات کامل</label><textarea name="description" rows={6} defaultValue={venue?.description} className="textarea w-full" /></div>
        </div></section>
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
          <h3 className="font-extrabold">ساعات کاری</h3>
          {hours.map((h, i) => (
            <div key={i} className="flex gap-2">
              <input value={h.label} onChange={(e) => setHours((x) => x.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} className="input input-sm w-40" placeholder="صبحانه / ناهار / همه روزه" />
              <input value={h.time} onChange={(e) => setHours((x) => x.map((y, j) => (j === i ? { ...y, time: e.target.value } : y)))} className="input input-sm flex-1" placeholder="۷:۰۰ تا ۱۰:۰۰" />
              <button type="button" onClick={() => setHours((x) => x.filter((_, j) => j !== i))} className="btn btn-square btn-ghost btn-sm text-error"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button type="button" onClick={() => setHours((x) => [...x, { label: "", time: "" }])} className="btn btn-sm w-fit"><Plus className="h-4 w-4" /> بازه جدید</button>
        </div></section>
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
          <h3 className="font-extrabold">تصاویر و ویدیو</h3>
          <ImageListInput name="images" initial={venue?.images ?? []} />
          <div><label className="field-label">ویدیو معرفی</label><VideoUrlInput name="videoUrl" defaultValue={venue?.videoUrl} /></div>
        </div></section>
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
          <h3 className="font-extrabold">ویژگی‌ها</h3>
          <FeaturesEditor initial={venue?.features ?? []} />
        </div></section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label text-xs">ظرفیت (نفر)</label><input name="capacity" type="number" min={0} defaultValue={venue?.capacity ?? 0} className="input input-sm w-full" /></div>
            <div><label className="field-label text-xs">ترتیب نمایش</label><input name="sortOrder" type="number" defaultValue={venue?.sortOrder ?? 0} className="input input-sm w-full" /></div>
          </div>
          <div><label className="field-label text-xs">تلفن رزرو میز (خالی = تلفن هتل)</label><input name="phone" defaultValue={venue?.phone} dir="ltr" className="input input-sm w-full text-left" /></div>
          <div><label className="field-label text-xs">نامک (slug)</label><input name="slug" defaultValue={venue?.slug} dir="ltr" className="input input-sm w-full text-left" placeholder="cafe" /></div>
          {([["openToPublic", "پذیرش مهمانان غیرمقیم", venue?.openToPublic ?? true], ["bookingEnabled", "رزرو آنلاین میز در سایت", venue?.bookingEnabled ?? false], ["showMenu", "نمایش منو در سایت", venue?.showMenu ?? true], ["isActive", "نمایش در سایت", venue?.isActive ?? true]] as const).map(([n, l, d]) => (
            <label key={n} className="flex cursor-pointer items-center justify-between rounded-box bg-base-200/60 px-4 py-2.5 text-sm">{l}<input type="checkbox" name={n} defaultChecked={d} className="toggle toggle-primary toggle-sm" /></label>
          ))}
          <FormAlert state={state} />
          <SubmitButton className="btn btn-primary btn-block">{venue ? "ذخیره تغییرات" : "ایجاد و رفتن به منو"}</SubmitButton>
          <Link href="/admin/dining" className="btn btn-ghost btn-block">بازگشت</Link>
        </div></section>
      </aside>
    </form>
  );
}

type Row = MenuItemInput & { key: string };
const rid = () => Math.random().toString(36).slice(2, 9);

export function MenuEditor({ venueId, initial }: { venueId: number; initial: MenuItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(initial.map((i) => ({ ...i, key: String(i.id) })));
  const [filter, setFilter] = useState("all");
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))), [rows]);
  const upd = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const move = (key: string, d: number) =>
    setRows((rs) => {
      const i = rs.findIndex((r) => r.key === key);
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const a = [...rs];
      [a[i], a[j]] = [a[j], a[i]];
      return a;
    });
  const add = (category: string) => setRows((rs) => [...rs, { key: rid(), category, name: "", description: "", price: 0, image: "", tags: [], isAvailable: true, isSignature: false }]);
  const visible = rows.filter((r) => filter === "all" || r.category === filter);

  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-extrabold"><UtensilsCrossed className="h-5 w-5 text-primary" /> منو ({faNum(rows.length)} آیتم)</h3>
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await saveMenu(venueId, rows); setToast({ msg: r.message, tone: r.ok ? "success" : "error" }); if (r.ok) router.refresh(); })} className="btn btn-primary btn-sm">
            {pending ? <span className="loading loading-spinner loading-sm" /> : <Save className="h-4 w-4" />} ذخیره منو
          </button>
        </div>
        <div role="tablist" className="tabs tabs-box no-scrollbar flex-nowrap overflow-x-auto">
          <button type="button" role="tab" onClick={() => setFilter("all")} className={cn("tab whitespace-nowrap", filter === "all" && "tab-active")}>همه</button>
          {cats.map((c) => <button key={c} type="button" role="tab" onClick={() => setFilter(c)} className={cn("tab whitespace-nowrap", filter === c && "tab-active")}>{c} <span className="mr-1 text-xs opacity-60">{faNum(rows.filter((r) => r.category === c).length)}</span></button>)}
        </div>
        {visible.length === 0 && <p className="rounded-box border-2 border-dashed border-base-300 p-8 text-center text-sm text-base-content/50">آیتمی وجود ندارد. با دکمه زیر اولین آیتم را اضافه کنید.</p>}
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.key} className={cn("grid gap-3 rounded-box border p-3 md:grid-cols-[88px_1fr_auto]", r.isAvailable ? "border-base-300" : "border-dashed border-base-300 opacity-60")}>
              <label className="relative grid h-[88px] w-[88px] cursor-pointer place-items-center overflow-hidden rounded-field bg-base-200 text-xs text-base-content/50">
                {r.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" className="h-full w-full object-cover" />
                ) : uploading === r.key ? <span className="loading loading-spinner" /> : "تصویر"}
                <input type="file" accept="image/*,.heic,.heif" hidden onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setUploading(r.key);
                  try { upd(r.key, { image: (await uploadFile(f)).url }); } catch (er) { setToast({ msg: er instanceof Error ? er.message : "خطا", tone: "error" }); } finally { setUploading(null); }
                }} />
              </label>
              <div className="grid gap-2 sm:grid-cols-[1fr_1fr_140px]">
                <input value={r.name} onChange={(e) => upd(r.key, { name: e.target.value })} className="input input-sm w-full font-bold" placeholder="نام آیتم" />
                <input value={r.category} onChange={(e) => upd(r.key, { category: e.target.value })} list="menu-cats" className="input input-sm w-full" placeholder="دسته‌بندی" />
                <label className="input input-sm w-full"><input type="number" min={0} step={1000} value={r.price} onChange={(e) => upd(r.key, { price: Number(e.target.value) || 0 })} className="grow" /><span className="text-[10px] opacity-60">تومان</span></label>
                <input value={r.description} onChange={(e) => upd(r.key, { description: e.target.value })} className="input input-sm w-full sm:col-span-3" placeholder="توضیح کوتاه (مواد تشکیل‌دهنده)" />
                <div className="flex flex-wrap items-center gap-1.5 sm:col-span-3">
                  {TAGS.map(([t, l]) => (
                    <button key={t} type="button" onClick={() => upd(r.key, { tags: r.tags.includes(t) ? r.tags.filter((x) => x !== t) : [...r.tags, t] })} className={cn("badge badge-sm cursor-pointer", r.tags.includes(t) ? "badge-primary" : "badge-ghost")}>{l}</button>
                  ))}
                  <span className="mx-1 h-4 w-px bg-base-300" />
                  <label className="flex cursor-pointer items-center gap-1 text-xs"><input type="checkbox" className="checkbox checkbox-xs checkbox-secondary" checked={r.isSignature} onChange={(e) => upd(r.key, { isSignature: e.target.checked })} /><Sparkles className="h-3 w-3 text-gold-500" />امضای سرآشپز</label>
                  <label className="flex cursor-pointer items-center gap-1 text-xs"><input type="checkbox" className="checkbox checkbox-xs checkbox-success" checked={r.isAvailable} onChange={(e) => upd(r.key, { isAvailable: e.target.checked })} />موجود</label>
                  {r.price > 0 && <span className="mr-auto text-[11px] text-base-content/40">{formatPrice(r.price)} تومان</span>}
                </div>
              </div>
              <div className="flex gap-1 md:flex-col">
                <button type="button" onClick={() => move(r.key, -1)} className="btn btn-square btn-ghost btn-xs"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => move(r.key, 1)} className="btn btn-square btn-ghost btn-xs"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" title="کپی" onClick={() => setRows((rs) => { const i = rs.findIndex((x) => x.key === r.key); const a = [...rs]; a.splice(i + 1, 0, { ...r, id: undefined, key: rid(), name: r.name + " (کپی)" }); return a; })} className="btn btn-square btn-ghost btn-xs"><Copy className="h-3.5 w-3.5" /></button>
                {r.image && <button type="button" title="حذف تصویر" onClick={() => upd(r.key, { image: "" })} className="btn btn-square btn-ghost btn-xs text-warning">×</button>}
                <button type="button" onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} className="btn btn-square btn-ghost btn-xs text-error"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
        <datalist id="menu-cats">{[...cats, "پیش‌غذا", "غذای اصلی", "دسر", "نوشیدنی", "قهوه گرم", "قهوه سرد", "کیک و شیرینی", "صبحانه"].filter((v, i, a) => a.indexOf(v) === i).map((c) => <option key={c} value={c} />)}</datalist>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => add(filter !== "all" ? filter : cats[0] ?? "غذای اصلی")} className="btn btn-sm"><Plus className="h-4 w-4" /> آیتم جدید {filter !== "all" && `در «${filter}»`}</button>
          <button type="button" onClick={() => { const c = prompt("نام دسته جدید:"); if (c?.trim()) { add(c.trim()); setFilter(c.trim()); } }} className="btn btn-sm btn-ghost border-dashed border-base-300">+ دسته‌بندی جدید</button>
        </div>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}
