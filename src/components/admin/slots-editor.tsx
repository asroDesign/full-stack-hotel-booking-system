"use client";

import { useState } from "react";
import { Plus, Trash2, Clock, ArrowUp, Wand2 } from "lucide-react";
import { faNum, formatPrice } from "@/lib/utils";

type Row = { time: string; price: number };

export function SlotsEditor({
  initialSlots,
  initialPrices,
  basePrice,
}: {
  initialSlots: string[];
  initialPrices: Record<string, number>;
  basePrice: number;
}) {
  const [rows, setRows] = useState<Row[]>(
    initialSlots.length
      ? initialSlots.map((t) => ({ time: t, price: initialPrices[t] ?? basePrice }))
      : [
          { time: "09:00-10:30", price: basePrice },
          { time: "11:00-12:30", price: basePrice },
        ],
  );
  const [bulk, setBulk] = useState("");
  const update = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const addNext = () => {
    const last = rows[rows.length - 1];
    let time = "";
    const m = last?.time.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (m) {
      const start = Number(m[1]) * 60 + Number(m[2]);
      const end = Number(m[3]) * 60 + Number(m[4]);
      const dur = end - start;
      const gap = 30;
      const ns = end + gap;
      const ne = ns + dur;
      const f = (x: number) => `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
      time = `${f(ns)}-${f(ne)}`;
    }
    setRows((r) => [...r, { time, price: last?.price ?? basePrice }]);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name="slots" value={JSON.stringify(rows)} />
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
          <span>بازه زمانی سانس</span>
          <span>قیمت (تومان)</span>
          <span className="w-16" />
        </div>
        {rows.length === 0 && <div className="p-4 text-center text-sm text-slate-400">سانسی تعریف نشده است.</div>}
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 border-t border-slate-100 px-3 py-2">
            <div className="relative">
              <Clock className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input value={r.time} onChange={(e) => update(i, { time: e.target.value })} dir="ltr" placeholder="09:00-10:30" className="input w-full py-2 pl-8 text-left font-mono" />
            </div>
            <div>
              <input type="number" min={0} step={10000} value={r.price} onChange={(e) => update(i, { price: Number(e.target.value) || 0 })} className="input w-full py-2" />
              <div className="mt-0.5 text-[10px] text-slate-400">{formatPrice(r.price)} تومان</div>
            </div>
            <div className="flex w-16 gap-1">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => setRows((rs) => { const a = [...rs]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; })}
                className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500 disabled:opacity-30"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addNext} className="btn"><Plus className="h-4 w-4" /> افزودن سانس</button>
        <div className="flex flex-1 gap-2">
          <input value={bulk} onChange={(e) => setBulk(e.target.value)} type="number" placeholder="قیمت یکسان برای همه" className="input w-full min-w-0" />
          <button type="button" onClick={() => bulk && setRows((rs) => rs.map((r) => ({ ...r, price: Number(bulk) || 0 })))} className="btn shrink-0"><Wand2 className="h-4 w-4" /> اعمال</button>
        </div>
      </div>
      <p className="text-xs text-slate-400">{faNum(rows.length)} سانس · هر سانس در هر روز فقط برای یک رزرو قابل تایید است.</p>
    </div>
  );
}
