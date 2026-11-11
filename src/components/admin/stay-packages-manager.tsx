"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Plus, Trash2 } from "lucide-react";
import type { StayPackage } from "@/db/schema";
import { deleteStayPackage, saveStayPackage } from "@/app/actions/stay-packages";
import { EmptyBox, FormAlert, PageHeader, SubmitButton, Toast } from "./ui";
import { cn, faNum, formatPrice } from "@/lib/utils";

function StayPackageForm({ item, onSaved }: { item: StayPackage | null; onSaved: (message: string) => void }) {
  const [state, action] = useActionState(saveStayPackage, null);
  const [mode, setMode] = useState<"fixed" | "contact">(item?.pricingMode ?? "contact");
  useEffect(() => {
    if (state?.ok) onSaved(state.message ?? "بسته ذخیره شد.");
  }, [state, onSaved]);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={item?.id ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="field-label">عنوان بسته *</label><input name="title" defaultValue={item?.title} required className="input w-full" placeholder="مثلاً پکیج ویژه تولد" /></div>
        <div><label className="field-label">شناسهٔ انگلیسی برای لینک *</label><input name="slug" defaultValue={item?.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" dir="ltr" className="input w-full text-left font-mono" placeholder="birthday" /></div>
      </div>
      <div><label className="field-label">توضیح کوتاه</label><textarea name="description" defaultValue={item?.description} rows={2} maxLength={600} className="textarea w-full" /></div>
      <div><label className="field-label">امکانات (هر مورد در یک خط)</label><textarea name="features" defaultValue={item?.features.join("\n")} rows={4} className="textarea w-full" placeholder={"دیزاین اتاق\nکیک تولد"} /></div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div><label className="field-label">قیمت</label><select name="pricingMode" value={mode} onChange={(e) => setMode(e.target.value as "fixed" | "contact")} className="select w-full"><option value="contact">با هماهنگی پذیرش</option><option value="fixed">قیمت ثابت</option></select></div>
        <div><label className="field-label">مبلغ (تومان)</label><input name="price" type="number" min={0} defaultValue={item?.price ?? 0} disabled={mode !== "fixed"} className="input w-full" /></div>
        <div><label className="field-label">ترتیب نمایش</label><input name="sortOrder" type="number" defaultValue={item?.sortOrder ?? 0} className="input w-full" /></div>
      </div>
      <div><label className="field-label">نشانی تصویر (اختیاری)</label><input name="image" defaultValue={item?.image} dir="ltr" className="input w-full text-left" placeholder="https://… یا /images/package.jpg" /></div>
      <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-4 py-2.5 text-sm">نمایش در سایت<input type="checkbox" name="isActive" defaultChecked={item?.isActive ?? true} className="toggle toggle-success toggle-sm" /></label>
      <FormAlert state={state?.ok ? null : state} />
      <SubmitButton className="btn btn-primary btn-block">ذخیره بسته</SubmitButton>
    </form>
  );
}

function DeleteButton({ id, onDeleted }: { id: number; onDeleted: () => void }) {
  const [busy, start] = useTransition();
  return <button type="button" disabled={busy} onClick={() => { if (confirm("این بسته حذف شود؟")) start(async () => { await deleteStayPackage(id); onDeleted(); }); }} className="btn btn-ghost btn-sm text-error"><Trash2 className="h-4 w-4" /> حذف بسته</button>;
}

export function StayPackagesManager({ initial }: { initial: StayPackage[] }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const onSaved = (message: string) => { setToast(message); router.refresh(); };
  return (
    <div>
      <PageHeader title="بسته‌های اقامتی" desc="بسته‌ها در صفحهٔ اصلی نمایش داده می‌شوند و مهمان می‌تواند آن‌ها را هنگام رزرو اتاق انتخاب کند." action={<a href="/#stay-packages" target="_blank" rel="noreferrer" className="btn"><PackageCheck className="h-4 w-4" /> مشاهده در سایت</a>} />
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body p-5"><h2 className="mb-2 flex items-center gap-2 font-extrabold"><Plus className="h-5 w-5 text-primary" /> بستهٔ جدید</h2><StayPackageForm item={null} onSaved={onSaved} /></div></section>
        {initial.length === 0 ? <EmptyBox title="بسته‌ای برای ویرایش وجود ندارد" icon={<PackageCheck className="h-6 w-6" />} /> : initial.map((item) => (
          <section key={item.id} className={cn("card card-border bg-base-100 shadow-sm", !item.isActive && "opacity-70")}>
            <div className="card-body p-5">
              <div className="mb-2 flex items-start justify-between gap-3">
                <div><h2 className="font-extrabold">{item.title}</h2><p className="mt-1 text-xs text-base-content/50" dir="ltr">{item.slug}</p></div>
                <span className="badge badge-primary badge-soft">{item.pricingMode === "fixed" ? `${formatPrice(item.price)} تومان` : "با هماهنگی"}</span>
              </div>
              <p className="text-xs text-base-content/55">ترتیب {faNum(item.sortOrder)} · {item.isActive ? "فعال" : "مخفی"}</p>
              <StayPackageForm key={`${item.id}-${item.title}-${item.price}-${item.isActive}`} item={item} onSaved={onSaved} />
              <DeleteButton id={item.id} onDeleted={() => { setToast("بسته حذف شد."); router.refresh(); }} />
            </div>
          </section>
        ))}
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
