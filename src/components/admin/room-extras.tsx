"use client";

import { useState } from "react";
import { Plus, Trash2, UtensilsCrossed, Users } from "lucide-react";
import type { RoomOption } from "@/db/schema";
import { StringListEditor } from "./media-inputs";
import { faNum, formatPrice } from "@/lib/utils";

const UNITS: { v: RoomOption["unit"]; l: string }[] = [
  { v: "per_person_night", l: "هر نفر / هر شب" },
  { v: "per_night", l: "هر شب (کل اتاق)" },
  { v: "per_stay", l: "یک‌بار برای کل اقامت" },
  { v: "per_person", l: "هر نفر (یک‌بار)" },
];

const PRESETS: Omit<RoomOption, "id">[] = [
  { title: "صبحانه", price: 0, unit: "per_person_night", included: true },
  { title: "ناهار", price: 450000, unit: "per_person_night", included: false },
  { title: "شام", price: 400000, unit: "per_person_night", included: false },
  { title: "فول برد (ناهار + شام)", price: 800000, unit: "per_person_night", included: false },
  { title: "تخت اضافه نوزاد", price: 0, unit: "per_stay", included: false },
  { title: "ترانسفر فرودگاه", price: 1500000, unit: "per_stay", included: false },
];

const newId = () => `o${Math.random().toString(36).slice(2, 8)}`;

export function RoomOptionsEditor({ initial }: { initial: RoomOption[] }) {
  const [list, setList] = useState<RoomOption[]>(initial);
  const update = (i: number, patch: Partial<RoomOption>) => setList((l) => l.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  return (
    <div className="space-y-3">
      <input type="hidden" name="options" value={JSON.stringify(list)} />
      {list.length === 0 && (
        <div className="rounded-box border-2 border-dashed border-base-300 p-5 text-center text-sm text-base-content/50">
          <UtensilsCrossed className="mx-auto mb-2 h-6 w-6 opacity-40" />
          هنوز گزینه‌ای تعریف نشده. صبحانه، ناهار، شام یا هر خدمت دیگری را با مبلغ اضافه کنید.
        </div>
      )}
      {list.map((o, i) => (
        <div key={o.id} className="grid items-end gap-2 rounded-box border border-base-300 bg-base-100 p-3 sm:grid-cols-[1.4fr_1fr_1.2fr_auto_auto]">
          <div>
            <label className="field-label text-xs">عنوان</label>
            <input value={o.title} onChange={(e) => update(i, { title: e.target.value })} className="input input-sm w-full" placeholder="مثلاً شام" />
          </div>
          <div>
            <label className="field-label text-xs">مبلغ (تومان)</label>
            <input type="number" min={0} step={10000} value={o.price} disabled={o.included} onChange={(e) => update(i, { price: Number(e.target.value) || 0 })} className="input input-sm w-full" />
          </div>
          <div>
            <label className="field-label text-xs">نحوه محاسبه</label>
            <select value={o.unit} onChange={(e) => update(i, { unit: e.target.value as RoomOption["unit"] })} className="select select-sm w-full">
              {UNITS.map((u) => (
                <option key={u.v} value={u.v}>{u.l}</option>
              ))}
            </select>
          </div>
          <label className="flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs">
            <input type="checkbox" className="toggle toggle-success toggle-sm" checked={o.included} onChange={(e) => update(i, { included: e.target.checked, price: e.target.checked ? 0 : o.price })} />
            رایگان / شامل
          </label>
          <button type="button" onClick={() => setList((l) => l.filter((_, j) => j !== i))} className="btn btn-square btn-sm btn-ghost text-error">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setList((l) => [...l, { id: newId(), title: "", price: 0, unit: "per_person_night", included: false }])} className="btn btn-sm">
          <Plus className="h-4 w-4" /> گزینه جدید
        </button>
        {PRESETS.filter((p) => !list.some((o) => o.title === p.title)).map((p) => (
          <button key={p.title} type="button" onClick={() => setList((l) => [...l, { ...p, id: newId() }])} className="btn btn-sm btn-ghost border border-dashed border-base-300">
            + {p.title} {p.price > 0 && <span className="text-[10px] opacity-60">{formatPrice(p.price)}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CapacityFields({ capacity, maxCapacity, extraGuestPrice }: { capacity: number; maxCapacity: number; extraGuestPrice: number }) {
  const [std, setStd] = useState(capacity);
  const [max, setMax] = useState(Math.max(capacity, maxCapacity));
  const [fee, setFee] = useState(extraGuestPrice);
  return (
    <div className="space-y-3 rounded-box bg-base-200/60 p-4">
      <div className="flex items-center gap-2 text-sm font-bold"><Users className="h-4 w-4 text-primary" /> ظرفیت و نفر اضافه</div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="field-label text-xs">ظرفیت استاندارد</label>
          <input name="capacity" type="number" min={1} value={std} onChange={(e) => { const v = Math.max(1, Number(e.target.value) || 1); setStd(v); if (max < v) setMax(v); }} className="input w-full" />
        </div>
        <div>
          <label className="field-label text-xs">حداکثر ظرفیت</label>
          <input name="maxCapacity" type="number" min={std} value={max} onChange={(e) => setMax(Math.max(std, Number(e.target.value) || std))} className="input w-full" />
        </div>
        <div>
          <label className="field-label text-xs">هزینه هر نفر اضافه / شب</label>
          <input name="extraGuestPrice" type="number" min={0} step={10000} value={fee} onChange={(e) => setFee(Number(e.target.value) || 0)} className="input w-full" />
        </div>
      </div>
      <p className="text-xs text-base-content/60">
        قیمت شب برای {faNum(std)} نفر است. {max > std ? <>تا {faNum(max - std)} نفر اضافه (حداکثر {faNum(max)} نفر)، هر نفر شبی {formatPrice(fee)} تومان.</> : "نفر اضافه پذیرفته نمی‌شود."}
      </p>
    </div>
  );
}

export function FeaturesEditor({ initial }: { initial: string[] }) {
  const [list, setList] = useState(initial);
  return (
    <>
      <input type="hidden" name="features" value={list.map((x) => x.trim()).filter(Boolean).join("\n")} />
      <StringListEditor value={list} onChange={setList} placeholder="مثلاً تلویزیون هوشمند ۴۳ اینچ" />
    </>
  );
}
