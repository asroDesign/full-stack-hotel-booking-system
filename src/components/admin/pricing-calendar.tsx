"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarRange, Tag, Wand2, Save, Sparkles, MousePointerClick } from "lucide-react";
import { applyRates, bulkRoomPrices, markOfficialHolidays, markWeekdays, saveRoomPriceTable, setDayKind } from "@/app/actions/pricing";
import { Toast } from "./ui";
import { cn, faNum, formatPrice, jMonths, parseISODate, weekDays } from "@/lib/utils";

export type CalDay = { date: string; jd: number; price: number; kind: "normal" | "holiday" | "peak"; title: string; source: string };
export type PriceRoomRow = { id: number; name: string; roomNumber: string; pricePerNight: number; holidayPrice: number; peakPrice: number; extraGuestPrice: number };

export function PricingCalendar({
  rooms,
  roomId,
  jy,
  jm,
  days,
  today,
}: {
  rooms: PriceRoomRow[];
  roomId: number;
  jy: number;
  jm: number;
  days: CalDay[];
  today: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [tab, setTab] = useState<"price" | "kind">("price");
  const [mode, setMode] = useState<"set" | "percent" | "add" | "clear">("set");
  const [value, setValue] = useState("");
  const [allRooms, setAllRooms] = useState(false);
  const [kind, setKind] = useState<"holiday" | "peak" | "normal">("holiday");
  const [title, setTitle] = useState("");
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);

  const offset = days.length ? (parseISODate(days[0].date).getUTCDay() + 1) % 7 : 0;
  const prev = jm === 1 ? { jy: jy - 1, jm: 12 } : { jy, jm: jm - 1 };
  const next = jm === 12 ? { jy: jy + 1, jm: 1 } : { jy, jm: jm + 1 };
  const href = (p: { jy: number; jm: number }) => `/admin/pricing?room=${roomId}&jy=${p.jy}&jm=${p.jm}`;

  const click = (d: string, shift: boolean) => {
    if (shift && anchor) {
      const [a, b] = [anchor, d].sort();
      const range = days.filter((x) => x.date >= a && x.date <= b).map((x) => x.date);
      setSel((s) => Array.from(new Set([...s, ...range])));
    } else {
      setSel((s) => (s.includes(d) ? s.filter((x) => x !== d) : [...s, d]));
      setAnchor(d);
    }
  };
  const selectWhere = (fn: (d: CalDay) => boolean) => setSel(days.filter(fn).map((d) => d.date));

  const run = (p: Promise<{ ok: boolean; message: string }>, clear = true) =>
    start(async () => {
      const r = await p;
      setToast({ msg: r.message, tone: r.ok ? "success" : "error" });
      if (r.ok) {
        if (clear) setSel([]);
        router.refresh();
      }
    });

  const stats = useMemo(() => {
    const prices = days.map((d) => d.price);
    return {
      min: prices.length ? Math.min(...prices) : 0,
      max: prices.length ? Math.max(...prices) : 0,
      holidays: days.filter((d) => d.kind === "holiday").length,
      peaks: days.filter((d) => d.kind === "peak").length,
      custom: days.filter((d) => d.source === "custom").length,
    };
  }, [days]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
      <div className="card card-border bg-base-100 shadow-sm">
        <div className="card-body gap-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select className="select select-sm w-60" value={roomId} onChange={(e) => router.push(`/admin/pricing?room=${e.target.value}&jy=${jy}&jm=${jm}`)}>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="join">
              <Link href={href(prev)} className="btn join-item btn-sm"><ChevronRight className="h-4 w-4" /></Link>
              <span className="btn join-item btn-sm pointer-events-none min-w-36 font-bold">{jMonths[jm - 1]} {faNum(jy)}</span>
              <Link href={href(next)} className="btn join-item btn-sm"><ChevronLeft className="h-4 w-4" /></Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="badge badge-ghost">کمترین: {formatPrice(stats.min)}</span>
            <span className="badge badge-ghost">بیشترین: {formatPrice(stats.max)}</span>
            <span className="badge badge-error badge-soft">{faNum(stats.holidays)} تعطیل</span>
            <span className="badge badge-warning badge-soft">{faNum(stats.peaks)} پیک</span>
            <span className="badge badge-primary badge-soft">{faNum(stats.custom)} قیمت اختصاصی</span>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-base-content/50">
            {weekDays.map((w) => <div key={w} className="py-1 font-medium">{w}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}
            {days.map((d) => {
              const selected = sel.includes(d.date);
              const past = d.date < today;
              return (
                <button
                  key={d.date}
                  type="button"
                  title={d.title || undefined}
                  onClick={(e) => click(d.date, e.shiftKey)}
                  className={cn(
                    "relative flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-box border p-1 text-center transition select-none",
                    selected ? "border-primary bg-primary text-primary-content shadow-lg ring-2 ring-primary/30" :
                      d.kind === "holiday" ? "border-error/30 bg-error/5 hover:border-error" :
                      d.kind === "peak" ? "border-warning/40 bg-warning/10 hover:border-warning" :
                      "border-base-300 hover:border-primary/50",
                    past && !selected && "opacity-50",
                    d.date === today && !selected && "ring-2 ring-secondary",
                  )}
                >
                  <span className={cn("text-sm font-bold", !selected && d.kind === "holiday" && "text-error")}>{faNum(d.jd)}</span>
                  <span className={cn("text-[10px] leading-tight", selected ? "text-primary-content/90" : "text-base-content/70")}>{formatPrice(d.price / 1000)}<span className="opacity-60">هزار</span></span>
                  {d.title && <span className={cn("max-w-full truncate text-[9px]", selected ? "text-primary-content/80" : "text-base-content/50")}>{d.title}</span>}
                  {d.source === "custom" && <span className={cn("absolute left-1 top-1 h-1.5 w-1.5 rounded-full", selected ? "bg-primary-content" : "bg-primary")} />}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-t border-base-200 pt-3">
            <span className="flex items-center gap-1 text-xs text-base-content/50"><MousePointerClick className="h-3.5 w-3.5" /> انتخاب سریع:</span>
            <button type="button" className="btn btn-xs" onClick={() => selectWhere((d) => d.date >= today)}>کل ماه</button>
            <button type="button" className="btn btn-xs" onClick={() => selectWhere((d) => [4, 5].includes(parseISODate(d.date).getUTCDay()))}>پنجشنبه و جمعه‌ها</button>
            <button type="button" className="btn btn-xs" onClick={() => selectWhere((d) => d.kind === "holiday")}>تعطیلات</button>
            <button type="button" className="btn btn-xs" onClick={() => selectWhere((d) => d.kind === "peak")}>روزهای پیک</button>
            <button type="button" className="btn btn-xs" onClick={() => selectWhere((d) => d.kind === "normal")}>روزهای عادی</button>
            {sel.length > 0 && <button type="button" className="btn btn-xs btn-ghost text-error" onClick={() => setSel([])}>لغو انتخاب ({faNum(sel.length)})</button>}
          </div>
          <p className="text-[11px] text-base-content/50">برای انتخاب بازه، روی روز اول کلیک و سپس با نگه‌داشتن کلید Shift روی روز آخر کلیک کنید. نقطه آبی = قیمت اختصاصی آن روز.</p>
        </div>
      </div>

      <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-4 p-5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-extrabold"><CalendarRange className="h-5 w-5 text-primary" /> روزهای انتخاب‌شده</h3>
              <span className="badge badge-primary">{faNum(sel.length)} روز</span>
            </div>
            <div role="tablist" className="tabs tabs-box">
              <button type="button" role="tab" className={cn("tab flex-1", tab === "price" && "tab-active")} onClick={() => setTab("price")}><Tag className="ml-1 h-4 w-4" /> تغییر قیمت</button>
              <button type="button" role="tab" className={cn("tab flex-1", tab === "kind" && "tab-active")} onClick={() => setTab("kind")}><Sparkles className="ml-1 h-4 w-4" /> تعطیل / پیک</button>
            </div>
            {tab === "price" ? (
              <div className="space-y-3">
                <select className="select w-full" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
                  <option value="set">تعیین قیمت ثابت (تومان)</option>
                  <option value="percent">افزایش / کاهش درصدی (مثلاً ۲۰ یا ۱۰-)</option>
                  <option value="add">افزایش / کاهش مبلغ (تومان)</option>
                  <option value="clear">حذف قیمت اختصاصی (بازگشت به پیش‌فرض)</option>
                </select>
                {mode !== "clear" && (
                  <label className="input w-full">
                    <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder={mode === "percent" ? "درصد" : "مبلغ به تومان"} className="grow" />
                    <span className="text-xs opacity-60">{mode === "percent" ? "٪" : "تومان"}</span>
                  </label>
                )}
                {mode === "set" && Number(value) > 0 && <p className="text-xs text-base-content/60">{formatPrice(Number(value))} تومان</p>}
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" className="checkbox checkbox-sm checkbox-primary" checked={allRooms} onChange={(e) => setAllRooms(e.target.checked)} />
                  اعمال برای همه {faNum(rooms.length)} اتاق
                </label>
                <button
                  type="button"
                  disabled={pending || !sel.length || (mode !== "clear" && !value)}
                  onClick={() => run(applyRates({ roomIds: allRooms ? "all" : [roomId], dates: sel, mode, value: Number(value) }))}
                  className="btn btn-primary btn-block"
                >
                  {pending && <span className="loading loading-spinner loading-sm" />} اعمال روی {faNum(sel.length)} روز
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="join w-full">
                  {([["holiday", "تعطیل", "btn-error"], ["peak", "پیک", "btn-warning"], ["normal", "عادی", "btn-neutral"]] as const).map(([k, l, c]) => (
                    <button key={k} type="button" onClick={() => setKind(k)} className={cn("btn join-item flex-1", kind === k ? c : "btn-ghost border-base-300")}>{l}</button>
                  ))}
                </div>
                {kind !== "normal" && <input value={title} onChange={(e) => setTitle(e.target.value)} className="input w-full" placeholder="عنوان (مثلاً عید فطر، تعطیلات تابستان)" />}
                <button type="button" disabled={pending || !sel.length} onClick={() => run(setDayKind({ dates: sel, kind, title }))} className="btn btn-primary btn-block">
                  {pending && <span className="loading loading-spinner loading-sm" />} ثبت برای {faNum(sel.length)} روز
                </button>
                <p className="text-xs text-base-content/50">نوع روز برای همه اتاق‌ها مشترک است و قیمت «تعطیل/پیک» هر اتاق روی آن اعمال می‌شود.</p>
              </div>
            )}
          </div>
        </div>

        <div className="card card-border bg-base-100 shadow-sm">
          <div className="card-body gap-3 p-5">
            <h3 className="flex items-center gap-2 font-extrabold"><Wand2 className="h-5 w-5 text-secondary" /> ابزار تقویم سال {faNum(jy)}</h3>
            <button type="button" disabled={pending} className="btn btn-sm btn-soft btn-error justify-start" onClick={() => run(markOfficialHolidays(jy), false)}>ثبت تعطیلات رسمی شمسی سال {faNum(jy)}</button>
            <button type="button" disabled={pending} className="btn btn-sm btn-soft btn-warning justify-start" onClick={() => run(markWeekdays({ jy, weekdays: [4, 5], kind: "peak", title: "آخر هفته" }), false)}>علامت پنجشنبه و جمعه‌ها به‌عنوان «پیک»</button>
            <button type="button" disabled={pending} className="btn btn-sm btn-soft btn-error justify-start" onClick={() => run(markWeekdays({ jy, weekdays: [5], kind: "holiday", title: "جمعه" }), false)}>علامت جمعه‌ها به‌عنوان «تعطیل»</button>
          </div>
        </div>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

export function RoomPriceTable({ rooms }: { rooms: PriceRoomRow[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(rooms);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const [field, setField] = useState<"holidayPrice" | "peakPrice" | "pricePerNight">("holidayPrice");
  const [bmode, setBmode] = useState<"percentOfBase" | "set" | "percentChange" | "add">("percentOfBase");
  const [bval, setBval] = useState("25");
  const set = (i: number, k: keyof PriceRoomRow, v: number) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const run = (p: Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await p;
      setToast({ msg: r.message, tone: r.ok ? "success" : "error" });
      if (r.ok) router.refresh();
    });

  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-extrabold">قیمت پایه، تعطیل و پیک اتاق‌ها</h3>
          <button type="button" disabled={pending} onClick={() => run(saveRoomPriceTable(rows))} className="btn btn-primary btn-sm">
            {pending ? <span className="loading loading-spinner loading-sm" /> : <Save className="h-4 w-4" />} ذخیره جدول
          </button>
        </div>

        <div className="flex flex-wrap items-end gap-2 rounded-box bg-secondary/10 p-3">
          <div>
            <label className="field-label text-xs">تغییر یک‌کلیکی</label>
            <select className="select select-sm" value={field} onChange={(e) => setField(e.target.value as typeof field)}>
              <option value="holidayPrice">قیمت روزهای تعطیل</option>
              <option value="peakPrice">قیمت روزهای پیک</option>
              <option value="pricePerNight">قیمت پایه</option>
            </select>
          </div>
          <select className="select select-sm" value={bmode} onChange={(e) => setBmode(e.target.value as typeof bmode)}>
            {field !== "pricePerNight" && <option value="percentOfBase">٪ بیشتر از قیمت پایه</option>}
            <option value="percentChange">٪ تغییر نسبت به فعلی</option>
            <option value="add">افزودن مبلغ (تومان)</option>
            <option value="set">مبلغ ثابت (تومان)</option>
          </select>
          <input type="number" className="input input-sm w-32" value={bval} onChange={(e) => setBval(e.target.value)} />
          <button type="button" disabled={pending || !bval} onClick={() => run(bulkRoomPrices({ roomIds: "all", field, mode: field === "pricePerNight" && bmode === "percentOfBase" ? "percentChange" : bmode, value: Number(bval) }))} className="btn btn-secondary btn-sm">
            <Wand2 className="h-4 w-4" /> اعمال روی همه اتاق‌ها
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-sm min-w-[720px]">
            <thead>
              <tr>
                <th>اتاق</th>
                <th>پایه / شب</th>
                <th className="text-error">روز تعطیل</th>
                <th className="text-warning">روز پیک</th>
                <th>نفر اضافه / شب</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className="hover:bg-base-200/50">
                  <td className="whitespace-nowrap font-medium">{r.name}</td>
                  {(["pricePerNight", "holidayPrice", "peakPrice", "extraGuestPrice"] as const).map((k) => (
                    <td key={k}>
                      <input type="number" min={0} step={10000} value={r[k]} onChange={(e) => set(i, k, Number(e.target.value) || 0)} className="input input-sm w-32" />
                      {k !== "pricePerNight" && k !== "extraGuestPrice" && r[k] === 0 && <div className="text-[10px] text-base-content/40">= پایه</div>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}
