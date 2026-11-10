"use client";

import { useActionState, useEffect, useOptimistic, useState, useTransition } from "react";
import { Pencil, Trash2, Plus, Sparkles, MapPinned, Star, MapPin } from "lucide-react";
import type { Amenity, Attraction, Testimonial } from "@/db/schema";
import { setTestimonialApproved } from "@/app/actions/extras";
import { useRouter } from "next/navigation";
import {
  saveAmenity,
  deleteAmenity,
  saveAttraction,
  deleteAttraction,
  saveTestimonial,
  deleteTestimonial,
  type ActionState,
} from "@/app/actions/admin";
import { EmptyBox, FormAlert, ImageListInput, Modal, PageHeader, SubmitButton, Toast } from "./ui";
import { DynIcon, iconNames } from "@/components/dyn-icon";
import { MapView } from "@/components/map-view";
import { cn, faNum } from "@/lib/utils";

type SaveFn = (p: ActionState, fd: FormData) => Promise<ActionState>;

function useCrud<T extends { id: number }>(initial: T[], del: (id: number) => Promise<void>) {
  const [toast, setToast] = useState<string | null>(null);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [, start] = useTransition();
  const [items, removeOpt] = useOptimistic(initial, (s: T[], id: number) => s.filter((x) => x.id !== id));
  const open = (v: T | "new") => {
    setFormKey((k) => k + 1);
    setEditing(v);
  };
  const remove = (id: number, label: string) => {
    if (!confirm(`«${label}» حذف شود؟`)) return;
    start(async () => {
      removeOpt(id);
      await del(id);
      setToast("حذف شد");
    });
  };
  return { toast, setToast, editing, setEditing, formKey, items, open, remove };
}

function CrudForm({ save, onDone, children }: { save: SaveFn; onDone: (msg: string) => void; children: React.ReactNode }) {
  const [state, action] = useActionState(save, null);
  useEffect(() => {
    if (state?.ok) onDone(state.message ?? "ذخیره شد");
  }, [state, onDone]);
  return (
    <form action={action} className="space-y-4">
      {children}
      <FormAlert state={state?.ok ? null : state} />
      <SubmitButton className="btn btn-primary w-full h-12">ذخیره</SubmitButton>
    </form>
  );
}

/* ------------- Amenities ------------- */
export function AmenitiesManager({ initial }: { initial: Amenity[] }) {
  const c = useCrud(initial, deleteAmenity);
  const [icon, setIcon] = useState("Sparkles");
  const e = c.editing === "new" ? null : c.editing;
  useEffect(() => setIcon(e?.icon ?? "Sparkles"), [e, c.formKey]);
  const cats = Array.from(new Set(c.items.map((a) => a.category)));
  return (
    <div>
      <PageHeader title="امکانات هتل" desc={`${faNum(c.items.length)} امکان`} action={<button onClick={() => c.open("new")} className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن امکان</button>} />
      {c.items.length === 0 ? (
        <EmptyBox title="هنوز امکاناتی ثبت نشده" icon={<Sparkles className="h-6 w-6" />} action={<button onClick={() => c.open("new")} className="btn btn-primary">افزودن اولین امکان</button>} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {c.items.map((a) => (
            <div key={a.id} className="card card-border bg-base-100 shadow-sm group flex items-start gap-3 p-4 flex-row">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700"><DynIcon name={a.icon} className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-800">{a.title}</div>
                <div className="text-xs text-slate-500">{a.description}</div>
                <span className="mt-2 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">{a.category}</span>
              </div>
              <div className="flex flex-col gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <button onClick={() => c.open(a)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => c.remove(a.id, a.title)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!c.editing} onClose={() => c.setEditing(null)} title={e ? "ویرایش امکان" : "امکان جدید"}>
        <CrudForm key={c.formKey} save={saveAmenity} onDone={(m) => { c.setEditing(null); c.setToast(m); }}>
          <input type="hidden" name="id" value={e?.id ?? ""} />
          <input type="hidden" name="icon" value={icon} />
          <div><label className="field-label">عنوان *</label><input name="title" defaultValue={e?.title} required className="input w-full" /></div>
          <div><label className="field-label">توضیح</label><input name="description" defaultValue={e?.description} className="input w-full" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">دسته‌بندی</label><input name="category" defaultValue={e?.category ?? "عمومی"} list="amenity-cats" className="input w-full" /><datalist id="amenity-cats">{cats.map((x) => <option key={x} value={x} />)}</datalist></div>
            <div><label className="field-label">ترتیب</label><input name="sortOrder" type="number" defaultValue={e?.sortOrder ?? c.items.length} className="input w-full" /></div>
          </div>
          <div>
            <label className="field-label">آیکون</label>
            <div className="grid grid-cols-8 gap-1.5">
              {iconNames.map((n) => (
                <button type="button" key={n} onClick={() => setIcon(n)} className={cn("grid aspect-square place-items-center rounded-lg", icon === n ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}><DynIcon name={n} className="h-4 w-4" /></button>
              ))}
            </div>
          </div>
        </CrudForm>
      </Modal>
      <Toast message={c.toast} onDone={() => c.setToast(null)} />
    </div>
  );
}

/* ------------- Attractions ------------- */
export function AttractionsManager({ initial, hotel }: { initial: Attraction[]; hotel: { lat: number; lng: number; name: string } }) {
  const c = useCrud(initial, deleteAttraction);
  const e = c.editing === "new" ? null : c.editing;
  return (
    <div>
      <PageHeader title="جاذبه‌های گردشگری" desc="مکان‌های دیدنی اطراف هتل همراه با موقعیت روی نقشه" action={<button onClick={() => c.open("new")} className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن مکان</button>} />
      <MapView
        center={hotel}
        fitBounds
        className="mb-6 h-72"
        markers={[{ ...hotel, title: hotel.name, kind: "hotel" }, ...c.items.filter((a) => a.lat && a.lng).map((a) => ({ lat: a.lat, lng: a.lng, title: a.name, subtitle: a.category }))]}
      />
      {c.items.length === 0 ? (
        <EmptyBox title="هنوز جاذبه‌ای ثبت نشده" icon={<MapPinned className="h-6 w-6" />} action={<button onClick={() => c.open("new")} className="btn btn-primary">افزودن مکان</button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {c.items.map((a) => (
            <div key={a.id} className="card card-border bg-base-100 shadow-sm overflow-hidden block">
              <div className="relative aspect-[16/9] bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {a.image && <img src={a.image} alt="" className="h-full w-full object-cover" />}
                <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-slate-700">{a.category}</span>
              </div>
              <div className="p-4">
                <h3 className="font-extrabold text-slate-900">{a.name}</h3>
                <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-500">{a.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" />{faNum(a.distanceKm)} کیلومتر</span>
                  <div className="flex gap-1">
                    <button onClick={() => c.open(a)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => c.remove(a.id, a.name)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!c.editing} onClose={() => c.setEditing(null)} title={e ? "ویرایش مکان" : "مکان گردشگری جدید"}>
        <CrudForm key={c.formKey} save={saveAttraction} onDone={(m) => { c.setEditing(null); c.setToast(m); }}>
          <input type="hidden" name="id" value={e?.id ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="field-label">نام مکان *</label><input name="name" defaultValue={e?.name} required className="input w-full" /></div>
            <div><label className="field-label">دسته‌بندی</label><select name="category" defaultValue={e?.category ?? "طبیعی"} className="select w-full">{["طبیعی", "تاریخی", "تفریحی", "روستایی", "مذهبی", "خرید"].map((x) => <option key={x}>{x}</option>)}</select></div>
            <div><label className="field-label">ترتیب</label><input name="sortOrder" type="number" defaultValue={e?.sortOrder ?? c.items.length} className="input w-full" /></div>
            <div><label className="field-label">فاصله (کیلومتر)</label><input name="distanceKm" defaultValue={e?.distanceKm ?? ""} className="input w-full" /></div>
            <div><label className="field-label">زمان رسیدن</label><input name="travelTime" defaultValue={e?.travelTime} className="input w-full" placeholder="۲۰ دقیقه با خودرو" /></div>
            <div><label className="field-label">عرض جغرافیایی (lat)</label><input name="lat" defaultValue={e?.lat ?? ""} dir="ltr" className="input w-full text-left" placeholder="38.15" /></div>
            <div><label className="field-label">طول جغرافیایی (lng)</label><input name="lng" defaultValue={e?.lng ?? ""} dir="ltr" className="input w-full text-left" placeholder="48.07" /></div>
          </div>
          <div><label className="field-label">توضیحات</label><textarea name="description" rows={3} defaultValue={e?.description} className="textarea w-full" /></div>
          <div><label className="field-label">تصویر</label><ImageListInput name="image" single initial={e?.image ? [e.image] : []} /></div>
        </CrudForm>
      </Modal>
      <Toast message={c.toast} onDone={() => c.setToast(null)} />
    </div>
  );
}

/* ------------- Testimonials ------------- */
export function TestimonialsManager({ initial }: { initial: Testimonial[] }) {
  const c = useCrud(initial, deleteTestimonial);
  const router = useRouter();
  const [, startMod] = useTransition();
  const pendingCount = c.items.filter((t) => !t.isApproved).length;
  const e = c.editing === "new" ? null : c.editing;
  return (
    <div>
      <PageHeader title="نظرات مهمانان" desc={pendingCount ? `${faNum(pendingCount)} نظر در انتظار تأیید · نظرات تأییدشده در سایت نمایش داده می‌شوند` : "نظرات تأییدشده در صفحه اصلی و صفحه نظرات نمایش داده می‌شوند"} action={<button onClick={() => c.open("new")} className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن نظر</button>} />
      {c.items.length === 0 ? (
        <EmptyBox title="هنوز نظری ثبت نشده" icon={<Star className="h-6 w-6" />} action={<button onClick={() => c.open("new")} className="btn btn-primary">افزودن نظر</button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {c.items.map((t) => (
            <div key={t.id} className={cn("card card-border bg-base-100 shadow-sm p-5 block", !t.isApproved && "ring-2 ring-warning")}>
              {(!t.isApproved || t.reservationId) && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {!t.isApproved && <span className="badge badge-warning">در انتظار تأیید</span>}
                  {t.reservationId && <span className="badge badge-success badge-soft">ثبت‌شده توسط مهمان (رزرو #{faNum(t.reservationId)})</span>}
                </div>
              )}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{t.name[0]}</span>
                  <div>
                    <div className="font-bold text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.city}</div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => c.open(t)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => c.remove(t.id, t.name)} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <div className="mt-3 flex">{Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-gold-400 text-gold-400" />)}</div>
              <p className="mt-2 text-sm leading-7 text-slate-600">{t.body}</p>
              <div className="mt-3 flex gap-2 border-t border-base-200 pt-3">
                {t.isApproved ? (
                  <button type="button" onClick={() => startMod(async () => { await setTestimonialApproved(t.id, false); c.setToast("از سایت پنهان شد"); router.refresh(); })} className="btn btn-xs btn-soft">پنهان کردن</button>
                ) : (
                  <button type="button" onClick={() => startMod(async () => { await setTestimonialApproved(t.id, true); c.setToast("تأیید و منتشر شد"); router.refresh(); })} className="btn btn-xs btn-success">تأیید و انتشار</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!c.editing} onClose={() => c.setEditing(null)} title={e ? "ویرایش نظر" : "نظر جدید"}>
        <CrudForm key={c.formKey} save={saveTestimonial} onDone={(m) => { c.setEditing(null); c.setToast(m); }}>
          <input type="hidden" name="id" value={e?.id ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">نام *</label><input name="name" defaultValue={e?.name} required className="input w-full" /></div>
            <div><label className="field-label">شهر</label><input name="city" defaultValue={e?.city} className="input w-full" /></div>
            <div className="col-span-2"><label className="field-label">امتیاز</label><select name="rating" defaultValue={e?.rating ?? 5} className="select w-full">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{faNum(n)} ستاره</option>)}</select></div>
          </div>
          <div><label className="field-label">متن نظر *</label><textarea name="body" rows={4} defaultValue={e?.body} required className="textarea w-full" /></div>
        </CrudForm>
      </Modal>
      <Toast message={c.toast} onDone={() => c.setToast(null)} />
    </div>
  );
}
