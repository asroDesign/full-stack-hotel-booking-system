"use client";

import Link from "next/link";
import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Pencil, Trash2, Star, Eye, EyeOff, PlayCircle, Users, Maximize, BedDouble, Plus } from "lucide-react";
import type { Room } from "@/db/schema";
import { deleteRoom, toggleRoom, saveRoom } from "@/app/actions/admin";
import { EmptyBox, FormAlert, ImageListInput, SubmitButton, Toast } from "./ui";
import { VideoUrlInput } from "./media-inputs";
import { CapacityFields, FeaturesEditor, RoomOptionsEditor } from "./room-extras";
import { cn, faNum, formatPrice } from "@/lib/utils";

type A = { type: "toggle"; id: number; field: "isActive" | "isFeatured"; value: boolean } | { type: "delete"; id: number };

export function RoomsGrid({ initial }: { initial: Room[] }) {
  const [toast, setToast] = useState<string | null>(null);
  const [, start] = useTransition();
  const [items, apply] = useOptimistic(initial, (s: Room[], a: A) =>
    a.type === "delete" ? s.filter((r) => r.id !== a.id) : s.map((r) => (r.id === a.id ? { ...r, [a.field]: a.value } : r)),
  );

  if (items.length === 0)
    return <EmptyBox title="هنوز اتاقی تعریف نشده" desc="اولین اتاق هتل را همراه با تصاویر و ویدیو اضافه کنید." icon={<BedDouble className="h-6 w-6" />} action={<Link href="/admin/rooms/new" className="btn btn-primary"><Plus className="h-4 w-4" /> افزودن اتاق</Link>} />;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((r) => (
          <div key={r.id} className={cn("card card-border bg-base-100 shadow-sm overflow-hidden transition block", !r.isActive && "opacity-60")}>
            <div className="relative aspect-[16/9] bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.images[0] && <img src={r.images[0]} alt="" className="h-full w-full object-cover" />}
              <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-slate-700">اتاق {faNum(r.roomNumber)}</span>
              <div className="absolute left-3 top-3 flex gap-1">
                {r.videoUrl && <span className="grid h-7 w-7 place-items-center rounded-lg bg-black/50 text-white"><PlayCircle className="h-4 w-4" /></span>}
                <span className="rounded-lg bg-black/50 px-2 py-1 text-xs text-white">{faNum(r.images.length)} تصویر</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-slate-900">{r.name}</h3>
                  <div className="text-xs text-slate-500">{r.type} · طبقه {faNum(r.floor)}</div>
                </div>
                <div className="text-left text-sm font-black text-brand-700">{formatPrice(r.pricePerNight)}<div className="text-[10px] font-normal text-slate-400">تومان/شب</div></div>
              </div>
              <div className="mt-3 flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{faNum(r.capacity)} تا {faNum(r.capacity + r.extraBeds)} نفر</span>
                <span className="flex items-center gap-1"><Maximize className="h-3.5 w-3.5" />{faNum(r.size)} م²</span>
              </div>
              <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-3">
                <button
                  onClick={() => start(async () => { apply({ type: "toggle", id: r.id, field: "isActive", value: !r.isActive }); await toggleRoom(r.id, "isActive", !r.isActive); setToast(r.isActive ? "اتاق غیرفعال شد" : "اتاق فعال شد"); })}
                  className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium", r.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}
                >
                  {r.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {r.isActive ? "فعال" : "غیرفعال"}
                </button>
                <button
                  onClick={() => start(async () => { apply({ type: "toggle", id: r.id, field: "isFeatured", value: !r.isFeatured }); await toggleRoom(r.id, "isFeatured", !r.isFeatured); setToast("به‌روزرسانی شد"); })}
                  className={cn("flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium", r.isFeatured ? "bg-gold-400/20 text-gold-600" : "bg-slate-100 text-slate-500")}
                >
                  <Star className={cn("h-3.5 w-3.5", r.isFeatured && "fill-current")} /> ویژه
                </button>
                <div className="flex-1" />
                <Link href={`/admin/rooms/${r.id}`} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"><Pencil className="h-4 w-4" /></Link>
                <button
                  onClick={() => { if (confirm(`«${r.name}» حذف شود؟`)) start(async () => { apply({ type: "delete", id: r.id }); await deleteRoom(r.id); setToast("اتاق حذف شد"); }); }}
                  className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </>
  );
}

export function RoomForm({ room }: { room?: Room }) {
  const [state, action] = useActionState(saveRoom, null);
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <input type="hidden" name="id" value={room?.id ?? ""} />
      <div className="space-y-6">
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <h3 className="font-extrabold text-slate-900">اطلاعات اصلی</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="field-label">نام اتاق *</label><input name="name" defaultValue={room?.name} required className="input w-full" placeholder="مثلاً دبل استاندارد ۱۰۱" /></div>
            <div><label className="field-label">نوع اتاق</label><input name="type" defaultValue={room?.type ?? "دبل استاندارد"} className="input w-full" list="room-types" />
              <datalist id="room-types">{["دبل استاندارد", "توئین", "سه‌تخته", "خانوادگی", "سوئیت جونیور", "سوئیت رویال", "یک‌نفره", "دبل"].map((t) => <option key={t} value={t} />)}</datalist>
            </div>
            <div><label className="field-label">شماره اتاق</label><input name="roomNumber" defaultValue={room?.roomNumber} className="input w-full" /></div>
            <div className="sm:col-span-2"><label className="field-label">توضیح کوتاه</label><input name="shortDescription" defaultValue={room?.shortDescription} className="input w-full" /></div>
            <div className="sm:col-span-2"><label className="field-label">توضیحات کامل</label><textarea name="description" rows={6} defaultValue={room?.description} className="textarea w-full" /></div>
          </div>
        </section>
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <h3 className="font-extrabold text-slate-900">مشخصات</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="field-label">متراژ (م²)</label><input name="size" type="number" defaultValue={room?.size ?? 25} className="input w-full" /></div>
            <div><label className="field-label">طبقه</label><input name="floor" type="number" defaultValue={room?.floor ?? 1} className="input w-full" /></div>
            <div className="sm:col-span-2"><label className="field-label">نوع تخت</label><input name="beds" defaultValue={room?.beds} className="input w-full" /></div>
            <div className="sm:col-span-3"><label className="field-label">چشم‌انداز</label><input name="view" defaultValue={room?.view} className="input w-full" placeholder="نمای کوه سبلان" /></div>
          </div>
          <CapacityFields capacity={room?.capacity ?? 2} maxCapacity={(room?.capacity ?? 2) + (room?.extraBeds ?? 1)} extraGuestPrice={room?.extraGuestPrice ?? 0} />
          <div><label className="field-label">امکانات اتاق</label><FeaturesEditor initial={room?.features ?? []} /></div>
        </section>
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <h3 className="font-extrabold">خدمات و وعده‌های غذایی قابل انتخاب</h3>
          <p className="-mt-2 text-xs text-base-content/60">مهمان هنگام رزرو می‌تواند این گزینه‌ها را انتخاب کند و مبلغ آن به صورتحساب افزوده می‌شود.</p>
          <RoomOptionsEditor initial={room?.options ?? []} />
        </section>
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <h3 className="font-extrabold text-slate-900">تصاویر</h3>
          <ImageListInput name="images" initial={room?.images ?? []} />
        </section>
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <h3 className="font-extrabold text-slate-900">ویدیو معرفی</h3>
          <VideoUrlInput name="videoUrl" defaultValue={room?.videoUrl} />
        </section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <section className="card card-border bg-base-100 shadow-sm space-y-4 p-5 block">
          <div><label className="field-label">قیمت پایه هر شب (تومان)</label><input name="pricePerNight" type="number" min={0} step={10000} defaultValue={room?.pricePerNight ?? 2500000} className="input w-full text-lg font-bold" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="field-label text-xs">قیمت روز تعطیل</label><input name="holidayPrice" type="number" min={0} step={10000} defaultValue={room?.holidayPrice ?? 0} className="input input-sm w-full" /></div>
            <div><label className="field-label text-xs">قیمت روز پیک</label><input name="peakPrice" type="number" min={0} step={10000} defaultValue={room?.peakPrice ?? 0} className="input input-sm w-full" /></div>
          </div>
          <p className="-mt-2 text-[11px] text-base-content/50">صفر = همان قیمت پایه. قیمت روزانه را از <Link href="/admin/pricing" className="link link-primary">تقویم قیمت‌گذاری</Link> تغییر دهید.</p>
          <div><label className="field-label">نامک (slug)</label><input name="slug" defaultValue={room?.slug} dir="ltr" className="input w-full text-left" placeholder="room-101" /></div>
          <div><label className="field-label">ترتیب نمایش</label><input name="sortOrder" type="number" defaultValue={room?.sortOrder ?? 0} className="input w-full" /></div>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span>نمایش در سایت</span><input type="checkbox" name="isActive" defaultChecked={room?.isActive ?? true} className="checkbox checkbox-primary" /></label>
          <label className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm"><span>اتاق ویژه (صفحه اصلی)</span><input type="checkbox" name="isFeatured" defaultChecked={room?.isFeatured ?? false} className="checkbox checkbox-primary" /></label>
          <FormAlert state={state} />
          <SubmitButton className="btn btn-primary w-full h-12">{room ? "ذخیره تغییرات" : "ایجاد اتاق"}</SubmitButton>
          <Link href="/admin/rooms" className="btn w-full">انصراف</Link>
        </section>
      </aside>
    </form>
  );
}
