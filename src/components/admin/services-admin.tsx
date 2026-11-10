"use client";

import Link from "next/link";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Pencil, Trash2, Waves, Plus, CalendarCheck } from "lucide-react";
import type { Service } from "@/db/schema";
import { deleteService, saveService } from "@/app/actions/admin";
import { EmptyBox, FormAlert, ImageListInput, SubmitButton, Toast } from "./ui";
import { DynIcon, iconNames } from "@/components/dyn-icon";
import { SlotsEditor } from "./slots-editor";
import { VideoUrlInput } from "./media-inputs";
import { cn, faNum, formatPrice } from "@/lib/utils";

export function ServicesList({ initial }: { initial: Service[] }) {
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  const [items, remove] = useOptimistic(initial, (s: Service[], id: number) => s.filter((x) => x.id !== id));
  if (items.length === 0)
    return <EmptyBox title="هنوز خدمتی تعریف نشده" desc="خدماتی مانند استخر، اسپا، سالن جلسات یا ترانسفر را معرفی کنید." icon={<Waves className="h-6 w-6" />} action={<Link href="/admin/services/new" className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن خدمت</Link>} />;
  return (
    <>
      <div className="card card-border bg-base-100 shadow-sm divide-y divide-slate-100 block">
        {items.map((s) => (
          <div key={s.id} className={cn("flex flex-wrap items-center gap-4 p-4", !s.isActive && "opacity-60")}>
            <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {s.image && <img src={s.image} alt="" className="h-full w-full object-cover" />}
              <span className="absolute bottom-1 right-1 grid h-6 w-6 place-items-center rounded-md bg-white/90 text-brand-700"><DynIcon name={s.icon} className="h-3.5 w-3.5" /></span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-extrabold text-slate-900">{s.name}</h3>
                {s.isBookable && <span className="flex items-center gap-1 rounded-full bg-gold-400/20 px-2 py-0.5 text-[11px] font-bold text-gold-600"><CalendarCheck className="h-3 w-3" /> قابل رزرو · {faNum(s.timeSlots.length)} سانس</span>}
                {s.extraGuestPrice > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] text-sky-700">نفر اضافه {formatPrice(s.extraGuestPrice)}</span>}
                {!s.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">غیرفعال</span>}
              </div>
              <p className="mt-1 truncate text-sm text-slate-500">{s.shortDescription}</p>
            </div>
            <div className="text-sm font-bold text-brand-700">{s.price ? `${formatPrice(s.price)} تومان` : "—"}</div>
            <div className="flex gap-1">
              <Link href={`/admin/services/${s.id}`} className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><Pencil className="h-4 w-4" /></Link>
              <button onClick={() => { if (confirm(`«${s.name}» حذف شود؟`)) start(async () => { remove(s.id); await deleteService(s.id); setToast("خدمت حذف شد"); }); }} className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

export function ServiceForm({ service }: { service?: Service }) {
  const [state, action] = useActionState(saveService, null);
  const [icon, setIcon] = useState(service?.icon ?? "Waves");
  const [bookable, setBookable] = useState(service?.isBookable ?? false);
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <input type="hidden" name="id" value={service?.id ?? ""} />
      <input type="hidden" name="icon" value={icon} />
      <div className="space-y-6">
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <h3 className="font-extrabold text-slate-900">اطلاعات خدمت</h3>
          <div><label className="field-label">نام *</label><input name="name" defaultValue={service?.name} required className="input w-full" placeholder="مثلاً استخر، سالن جلسات، ترانسفر" /></div>
          <div><label className="field-label">توضیح کوتاه</label><input name="shortDescription" defaultValue={service?.shortDescription} className="input w-full" /></div>
          <div><label className="field-label">توضیحات کامل</label><textarea name="description" rows={6} defaultValue={service?.description} className="textarea w-full" /></div>
          <div><label className="field-label">ساعات کاری</label><input name="workingHours" defaultValue={service?.workingHours} className="input w-full" /></div>
          <div><label className="field-label">قوانین (هر مورد در یک خط)</label><textarea name="rules" rows={4} defaultValue={service?.rules.join("\n")} className="textarea w-full" /></div>
        </section>
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <h3 className="font-extrabold text-slate-900">آیکون</h3>
          <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
            {iconNames.map((n) => (
              <button type="button" key={n} onClick={() => setIcon(n)} className={cn("grid aspect-square place-items-center rounded-xl transition", icon === n ? "bg-brand-700 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
                <DynIcon name={n} className="h-5 w-5" />
              </button>
            ))}
          </div>
        </section>
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <h3 className="font-extrabold text-slate-900">گالری تصاویر</h3>
          <ImageListInput name="gallery" initial={service?.gallery.length ? service.gallery : service?.image ? [service.image] : []} />
          <div><label className="field-label">ویدیو معرفی (لینک یا آپلود)</label><VideoUrlInput name="videoUrl" defaultValue={service?.videoUrl} /></div>
        </section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <label className="flex items-center justify-between rounded-xl bg-gold-400/10 px-4 py-3 text-sm font-semibold"><span>قابل رزرو آنلاین</span><input type="checkbox" name="isBookable" checked={bookable} onChange={(e) => setBookable(e.target.checked)} className="checkbox checkbox-primary" /></label>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="field-label">قیمت پایه (تومان)</label><input name="price" type="number" min={0} step={10000} defaultValue={service?.price ?? 0} className="input w-full" /></div>
            <div><label className="field-label">واحد قیمت</label><input name="priceUnit" defaultValue={service?.priceUnit ?? "هر سانس"} className="input w-full" /></div>
          </div>
          {bookable && (
            <>
              <div>
                <label className="field-label">سانس‌ها و قیمت هر سانس</label>
                <SlotsEditor initialSlots={service?.timeSlots ?? []} initialPrices={service?.slotPrices ?? {}} basePrice={service?.price ?? 0} />
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <div className="mb-3 text-sm font-bold text-slate-700">ظرفیت و هزینه نفر اضافه</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="field-label text-xs">نفرات شامل قیمت سانس</label><input name="includedGuests" type="number" min={1} defaultValue={service?.includedGuests ?? 4} className="input w-full" /></div>
                  <div><label className="field-label text-xs">حداکثر نفرات</label><input name="maxGuests" type="number" min={1} defaultValue={service?.maxGuests ?? 6} className="input w-full" /></div>
                  <div className="col-span-2"><label className="field-label text-xs">مبلغ هر نفر اضافه (تومان)</label><input name="extraGuestPrice" type="number" min={0} step={10000} defaultValue={service?.extraGuestPrice ?? 0} className="input w-full" /></div>
                </div>
                <p className="mt-2 text-xs text-slate-400">مثال: قیمت سانس برای ۴ نفر؛ نفر پنجم به بعد هر نفر مبلغ اضافه پرداخت می‌کند.</p>
              </div>
            </>
          )}
          {!bookable && (
            <>
              <input type="hidden" name="maxGuests" value={service?.maxGuests ?? 6} />
              <input type="hidden" name="includedGuests" value={service?.includedGuests ?? 4} />
              <input type="hidden" name="extraGuestPrice" value={service?.extraGuestPrice ?? 0} />
              <input type="hidden" name="slots" value={JSON.stringify((service?.timeSlots ?? []).map((t) => ({ time: t, price: service?.slotPrices?.[t] ?? service?.price ?? 0 })))} />
            </>
          )}
          <div><label className="field-label">نامک (slug)</label><input name="slug" defaultValue={service?.slug} dir="ltr" className="input w-full text-left" /></div>
          <div><label className="field-label">ترتیب نمایش</label><input name="sortOrder" type="number" defaultValue={service?.sortOrder ?? 0} className="input w-full" /></div>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span>نمایش در سایت</span><input type="checkbox" name="isActive" defaultChecked={service?.isActive ?? true} className="checkbox checkbox-primary" /></label>
          <FormAlert state={state} />
          <SubmitButton className="btn btn-primary w-full h-12">{service ? "ذخیره تغییرات" : "ایجاد خدمت"}</SubmitButton>
          <Link href="/admin/services" className="btn w-full">انصراف</Link>
        </section>
      </aside>
    </form>
  );
}
