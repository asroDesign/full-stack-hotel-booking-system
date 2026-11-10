"use client";

import { useActionState, useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, TicketPercent, HelpCircle, Images, Upload, Save, Eye, EyeOff, Globe, Lock } from "lucide-react";
import type { Faq, GalleryItem, Promotion } from "@/db/schema";
import { addGalleryItems, deleteFaq, deleteGalleryItems, deletePromotion, saveFaq, saveGalleryItems, savePromotion, togglePromotion } from "@/app/actions/extras";
import { EmptyBox, FormAlert, ImageListInput, Modal, PageHeader, SubmitButton, Toast } from "./ui";
import { uploadFile } from "./media-inputs";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { cn, faNum, formatJalali, formatPrice } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Promotions                                                         */
/* ------------------------------------------------------------------ */

function PromoForm({ p, rooms, onDone }: { p: Promotion | null; rooms: { id: number; name: string }[]; onDone: (m: string) => void }) {
  const [state, action] = useActionState(savePromotion, null);
  const [kind, setKind] = useState<"percent" | "fixed">(p?.kind ?? "percent");
  const [applies, setApplies] = useState(p?.appliesTo ?? "rooms");
  const [from, setFrom] = useState(p?.validFrom ?? "");
  const [to, setTo] = useState(p?.validTo ?? "");
  useEffect(() => {
    if (state?.ok) onDone(state.message ?? "ذخیره شد");
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={p?.id ?? ""} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="appliesTo" value={applies} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label">کد تخفیف *</label><input name="code" defaultValue={p?.code} required dir="ltr" className="input w-full text-left font-mono uppercase" placeholder="SUMMER20" /></div>
        <div><label className="field-label">عنوان پیشنهاد</label><input name="title" defaultValue={p?.title} className="input w-full" placeholder="۲۰٪ تخفیف اقامت تابستانی" /></div>
      </div>
      <div><label className="field-label">توضیح</label><textarea name="description" defaultValue={p?.description} rows={2} className="textarea w-full" /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-1">
          <label className="field-label">نوع تخفیف</label>
          <div className="join w-full">
            <button type="button" onClick={() => setKind("percent")} className={cn("btn join-item flex-1 btn-sm", kind === "percent" && "btn-primary")}>درصدی</button>
            <button type="button" onClick={() => setKind("fixed")} className={cn("btn join-item flex-1 btn-sm", kind === "fixed" && "btn-primary")}>مبلغ ثابت</button>
          </div>
        </div>
        <div><label className="field-label">{kind === "percent" ? "درصد" : "مبلغ (تومان)"}</label><input name="value" type="number" min={1} max={kind === "percent" ? 100 : undefined} defaultValue={p?.value ?? (kind === "percent" ? 10 : 500000)} className="input w-full" required /></div>
        <div><label className="field-label">سقف تخفیف (تومان)</label><input name="maxDiscount" type="number" min={0} defaultValue={p?.maxDiscount ?? 0} disabled={kind === "fixed"} className="input w-full" /><p className="mt-1 text-[11px] text-base-content/50">۰ = بدون سقف</p></div>
      </div>
      <div>
        <label className="field-label">قابل استفاده برای</label>
        <div className="join">
          {([["all", "همه"], ["rooms", "اتاق‌ها"], ["services", "خدمات و سانس‌ها"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => setApplies(v)} className={cn("btn join-item btn-sm", applies === v && "btn-primary")}>{l}</button>
          ))}
        </div>
      </div>
      {applies !== "services" && rooms.length > 0 && (
        <details className="rounded-box border border-base-300 p-3" open={!!p?.roomIds.length}>
          <summary className="cursor-pointer text-sm font-medium">محدود به اتاق‌های خاص <span className="text-xs text-base-content/50">(هیچ تیک = همه اتاق‌ها)</span></summary>
          <div className="mt-3 grid max-h-44 grid-cols-2 gap-1.5 overflow-y-auto">
            {rooms.map((r) => (
              <label key={r.id} className="flex cursor-pointer items-center gap-2 text-xs"><input type="checkbox" name="roomIds" value={r.id} defaultChecked={p?.roomIds.includes(r.id)} className="checkbox checkbox-xs checkbox-primary" />{r.name}</label>
            ))}
          </div>
        </details>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <JalaliDatePicker name="validFrom" label="ورود از تاریخ (اختیاری)" value={from} onChange={setFrom} placeholder="بدون محدودیت" />
        <JalaliDatePicker name="validTo" label="ورود تا تاریخ (اختیاری)" value={to} onChange={setTo} placeholder="بدون محدودیت" />
      </div>
      {(from || to) && <button type="button" onClick={() => { setFrom(""); setTo(""); }} className="btn btn-ghost btn-xs">حذف محدودیت تاریخ</button>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="field-label">حداقل شب</label><input name="minNights" type="number" min={1} defaultValue={p?.minNights ?? 1} className="input w-full" /></div>
        <div><label className="field-label">حداکثر دفعات استفاده</label><input name="maxUses" type="number" min={0} defaultValue={p?.maxUses ?? 0} className="input w-full" /><p className="mt-1 text-[11px] text-base-content/50">۰ = نامحدود</p></div>
        <div><label className="field-label">ترتیب</label><input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className="input w-full" /></div>
      </div>
      <div><label className="field-label">تصویر (برای نمایش در سایت)</label><ImageListInput name="image" single initial={p?.image ? [p.image] : []} /></div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-4 py-2.5 text-sm">نمایش در سایت (عمومی)<input type="checkbox" name="isPublic" defaultChecked={p?.isPublic ?? true} className="toggle toggle-primary toggle-sm" /></label>
        <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-4 py-2.5 text-sm">فعال<input type="checkbox" name="isActive" defaultChecked={p?.isActive ?? true} className="toggle toggle-success toggle-sm" /></label>
      </div>
      <FormAlert state={state?.ok ? null : state} />
      <SubmitButton className="btn btn-primary btn-block">ذخیره</SubmitButton>
    </form>
  );
}

export function PromotionsManager({ initial, uses, rooms }: { initial: Promotion[]; uses: Record<string, number>; rooms: { id: number; name: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Promotion | "new" | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  type A = { t: "del"; id: number } | { t: "tog"; id: number; v: boolean };
  const [items, apply] = useOptimistic(initial, (s: Promotion[], a: A) => (a.t === "del" ? s.filter((x) => x.id !== a.id) : s.map((x) => (x.id === a.id ? { ...x, isActive: a.v } : x))));
  const open = (v: Promotion | "new") => { setFormKey((k) => k + 1); setEditing(v); };
  const e = editing === "new" ? null : editing;
  return (
    <div>
      <PageHeader title="پیشنهادها و کدهای تخفیف" desc="کدهای عمومی در صفحه «پیشنهادهای ویژه» و صفحه اصلی نمایش داده می‌شوند؛ کدهای خصوصی فقط با داشتن کد قابل استفاده‌اند." action={<button type="button" onClick={() => open("new")} className="btn btn-primary"><Plus className="h-4 w-4" /> کد جدید</button>} />
      {items.length === 0 ? (
        <EmptyBox title="هنوز کد تخفیفی تعریف نشده" icon={<TicketPercent className="h-6 w-6" />} action={<button type="button" onClick={() => open("new")} className="btn btn-primary">ایجاد اولین کد</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => {
            const used = uses[p.code] ?? 0;
            const expired = !!p.validTo && p.validTo < new Date().toISOString().slice(0, 10);
            return (
              <div key={p.id} className={cn("card card-border bg-base-100 shadow-sm", (!p.isActive || expired) && "opacity-60")}>
                <div className="card-body gap-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono text-lg font-black text-primary" dir="ltr">{p.code}</div>
                      <div className="text-sm font-medium">{p.title}</div>
                    </div>
                    <span className="badge badge-secondary whitespace-nowrap">{p.kind === "percent" ? `${faNum(p.value)}٪` : `${formatPrice(p.value)} ت`}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 text-[11px]">
                    <span className={cn("badge badge-sm gap-1", p.isPublic ? "badge-info badge-soft" : "badge-ghost")}>{p.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}{p.isPublic ? "عمومی" : "خصوصی"}</span>
                    <span className="badge badge-ghost badge-sm">{p.appliesTo === "rooms" ? "اتاق‌ها" : p.appliesTo === "services" ? "خدمات" : "همه"}</span>
                    {p.minNights > 1 && <span className="badge badge-ghost badge-sm">حداقل {faNum(p.minNights)} شب</span>}
                    {p.validTo && <span className={cn("badge badge-sm", expired ? "badge-error badge-soft" : "badge-ghost")}>تا {formatJalali(p.validTo)}</span>}
                    {p.roomIds.length > 0 && <span className="badge badge-ghost badge-sm">{faNum(p.roomIds.length)} اتاق</span>}
                    {p.isDemo && <span className="badge badge-ghost badge-sm">نمونه</span>}
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-base-content/60"><span>استفاده‌شده</span><span>{faNum(used)}{p.maxUses ? ` از ${faNum(p.maxUses)}` : ""}</span></div>
                    {p.maxUses > 0 && <progress className="progress progress-primary mt-1 h-1.5 w-full" value={used} max={p.maxUses} />}
                  </div>
                  <div className="card-actions items-center border-t border-base-200 pt-3">
                    <button type="button" onClick={() => start(async () => { apply({ t: "tog", id: p.id, v: !p.isActive }); await togglePromotion(p.id, !p.isActive); setToast(p.isActive ? "غیرفعال شد" : "فعال شد"); })} className={cn("btn btn-xs btn-soft", p.isActive && "btn-success")}>
                      {p.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {p.isActive ? "فعال" : "غیرفعال"}
                    </button>
                    <div className="flex-1" />
                    <button type="button" onClick={() => open(p)} className="btn btn-square btn-sm btn-soft"><Pencil className="h-4 w-4" /></button>
                    <button type="button" onClick={() => { if (confirm(`کد ${p.code} حذف شود؟`)) start(async () => { apply({ t: "del", id: p.id }); await deletePromotion(p.id); setToast("حذف شد"); }); }} className="btn btn-square btn-sm btn-soft btn-error"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={e ? `ویرایش ${e.code}` : "کد تخفیف جدید"}>
        <PromoForm key={formKey} p={e} rooms={rooms} onDone={(m) => { setEditing(null); setToast(m); router.refresh(); }} />
      </Modal>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ                                                                */
/* ------------------------------------------------------------------ */

function FaqForm({ f, cats, onDone }: { f: Faq | null; cats: string[]; onDone: (m: string) => void }) {
  const [state, action] = useActionState(saveFaq, null);
  useEffect(() => {
    if (state?.ok) onDone(state.message ?? "ذخیره شد");
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={f?.id ?? ""} />
      <div><label className="field-label">پرسش *</label><input name="question" defaultValue={f?.question} required className="input w-full" /></div>
      <div><label className="field-label">پاسخ *</label><textarea name="answer" defaultValue={f?.answer} required rows={5} className="textarea w-full" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="field-label">دسته‌بندی</label><input name="category" defaultValue={f?.category ?? "عمومی"} list="faq-cats" className="input w-full" /><datalist id="faq-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div><label className="field-label">ترتیب</label><input name="sortOrder" type="number" defaultValue={f?.sortOrder ?? 0} className="input w-full" /></div>
      </div>
      <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-4 py-2.5 text-sm">نمایش در سایت<input type="checkbox" name="isActive" defaultChecked={f?.isActive ?? true} className="toggle toggle-primary toggle-sm" /></label>
      <FormAlert state={state?.ok ? null : state} />
      <SubmitButton className="btn btn-primary btn-block">ذخیره</SubmitButton>
    </form>
  );
}

export function FaqManager({ initial }: { initial: Faq[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  const [items, remove] = useOptimistic(initial, (s: Faq[], id: number) => s.filter((x) => x.id !== id));
  const cats = useMemo(() => Array.from(new Set(items.map((f) => f.category))), [items]);
  const open = (v: Faq | "new") => { setFormKey((k) => k + 1); setEditing(v); };
  const e = editing === "new" ? null : editing;
  return (
    <div>
      <PageHeader title="سوالات متداول" desc={`${faNum(items.length)} پرسش در ${faNum(cats.length)} دسته`} action={<button type="button" onClick={() => open("new")} className="btn btn-primary"><Plus className="h-4 w-4" /> پرسش جدید</button>} />
      {items.length === 0 ? (
        <EmptyBox title="هنوز پرسشی ثبت نشده" icon={<HelpCircle className="h-6 w-6" />} action={<button type="button" onClick={() => open("new")} className="btn btn-primary">افزودن پرسش</button>} />
      ) : (
        <div className="space-y-6">
          {cats.map((c) => (
            <div key={c}>
              <h3 className="mb-2 font-extrabold">{c}</h3>
              <div className="space-y-2">
                {items.filter((f) => f.category === c).map((f) => (
                  <div key={f.id} className={cn("card card-border bg-base-100 shadow-sm", !f.isActive && "opacity-50")}>
                    <div className="card-body flex-row items-start gap-3 p-4">
                      <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold">{f.question}</div>
                        <p className="mt-1 line-clamp-2 text-sm text-base-content/60">{f.answer}</p>
                      </div>
                      <button type="button" onClick={() => open(f)} className="btn btn-square btn-sm btn-ghost"><Pencil className="h-4 w-4" /></button>
                      <button type="button" onClick={() => { if (confirm("این پرسش حذف شود؟")) start(async () => { remove(f.id); await deleteFaq(f.id); setToast("حذف شد"); }); }} className="btn btn-square btn-sm btn-ghost text-error"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={e ? "ویرایش پرسش" : "پرسش جدید"}>
        <FaqForm key={formKey} f={e} cats={cats} onDone={(m) => { setEditing(null); setToast(m); router.refresh(); }} />
      </Modal>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Gallery                                                            */
/* ------------------------------------------------------------------ */

export function GalleryManager({ initial }: { initial: GalleryItem[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [sel, setSel] = useState<number[]>([]);
  const [cat, setCat] = useState(initial[0]?.category ?? "هتل");
  const [busy, setBusy] = useState("");
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const cats = useMemo(() => Array.from(new Set(rows.map((r) => r.category))), [rows]);
  const upd = (id: number, p: Partial<GalleryItem>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  return (
    <div>
      <PageHeader title="گالری تصاویر" desc={`${faNum(rows.length)} تصویر · ${faNum(cats.length)} دسته`} />
      <div className="card card-border mb-6 bg-base-100 shadow-sm">
        <div className="card-body flex-row flex-wrap items-end gap-3 p-4">
          <div><label className="field-label text-xs">دسته تصاویر جدید</label><input value={cat} onChange={(e) => setCat(e.target.value)} list="gal-cats" className="input input-sm w-48" /><datalist id="gal-cats">{[...cats, "هتل", "اتاق‌ها", "رستوران و کافه", "اطراف هتل"].filter((v, i, a) => a.indexOf(v) === i).map((c) => <option key={c} value={c} />)}</datalist></div>
          <label className={cn("btn btn-primary btn-sm", busy && "btn-disabled")}>
            {busy ? <><span className="loading loading-spinner loading-xs" />{busy}</> : <><Upload className="h-4 w-4" /> آپلود تصاویر</>}
            <input type="file" accept="image/*,.heic,.heif" multiple hidden onChange={async (e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (!files.length) return;
              const urls: string[] = [];
              try {
                for (let i = 0; i < files.length; i++) {
                  setBusy(`${faNum(i + 1)} از ${faNum(files.length)}`);
                  urls.push((await uploadFile(files[i])).url);
                }
              } catch (er) {
                setToast({ msg: er instanceof Error ? er.message : "خطا در آپلود", tone: "error" });
              }
              setBusy("");
              if (urls.length) {
                const r = await addGalleryItems(urls, cat);
                setToast({ msg: r.message, tone: r.ok ? "success" : "error" });
                router.refresh();
                setTimeout(() => window.location.reload(), 400);
              }
            }} />
          </label>
          <div className="flex-1" />
          {sel.length > 0 && <button type="button" disabled={pending} onClick={() => { if (confirm(`${faNum(sel.length)} تصویر حذف شود؟`)) start(async () => { await deleteGalleryItems(sel); setRows((r) => r.filter((x) => !sel.includes(x.id))); setSel([]); setToast({ msg: "حذف شد", tone: "success" }); }); }} className="btn btn-error btn-sm btn-soft"><Trash2 className="h-4 w-4" /> حذف {faNum(sel.length)} مورد</button>}
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await saveGalleryItems(rows.map((x) => ({ id: x.id, caption: x.caption, category: x.category, sortOrder: x.sortOrder, isActive: x.isActive }))); setToast({ msg: r.message, tone: r.ok ? "success" : "error" }); router.refresh(); })} className="btn btn-sm"><Save className="h-4 w-4" /> ذخیره تغییرات</button>
        </div>
      </div>
      {rows.length === 0 ? (
        <EmptyBox title="گالری خالی است" desc="تصاویر هتل، اتاق‌ها و رستوران را آپلود کنید." icon={<Images className="h-6 w-6" />} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {rows.map((r) => (
            <div key={r.id} className={cn("card card-border overflow-hidden bg-base-100 shadow-sm", !r.isActive && "opacity-50", sel.includes(r.id) && "ring-2 ring-error")}>
              <figure className="relative aspect-[4/3] bg-base-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.url} alt="" className="h-full w-full object-cover" />
                <input type="checkbox" checked={sel.includes(r.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, r.id] : s.filter((x) => x !== r.id)))} className="checkbox checkbox-sm absolute right-2 top-2 bg-white" aria-label="انتخاب" />
                {r.isDemo && <span className="badge badge-ghost badge-xs absolute left-2 top-2">نمونه</span>}
              </figure>
              <div className="space-y-1.5 p-2.5">
                <input value={r.caption} onChange={(e) => upd(r.id, { caption: e.target.value })} placeholder="توضیح تصویر" className="input input-xs w-full" />
                <div className="flex gap-1.5">
                  <input value={r.category} onChange={(e) => upd(r.id, { category: e.target.value })} list="gal-cats" className="input input-xs flex-1" />
                  <input type="number" value={r.sortOrder} onChange={(e) => upd(r.id, { sortOrder: Number(e.target.value) || 0 })} className="input input-xs w-14" title="ترتیب" />
                  <input type="checkbox" checked={r.isActive} onChange={(e) => upd(r.id, { isActive: e.target.checked })} className="toggle toggle-xs toggle-success mt-1" title="نمایش" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}
