"use client";

import Link from "next/link";
import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogIn, LogOut, Plus, Trash2, UserPlus, Save, Undo2 } from "lucide-react";
import {
  checkInReservation,
  checkOutReservation,
  createAdminReservation,
  quickRoomQuote,
  saveCompanions,
  setHousekeeping,
  setReservationSource,
  undoCheck,
  type CompanionInput,
} from "@/app/actions/hotel";
import type { ReservationSource } from "@/db/schema";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { FormAlert, SubmitButton, Toast } from "./ui";
import { addDaysISO, cn, faNum, formatPrice, todayISO } from "@/lib/utils";

export const SOURCE_OPTS: { key: ReservationSource; label: string; color: string }[] = [
  { key: "website", label: "سایت", color: "#0ea5e9" },
  { key: "walk_in", label: "حضوری", color: "#22c55e" },
  { key: "phone", label: "تلفنی", color: "#a855f7" },
  { key: "agency", label: "آژانس", color: "#f59e0b" },
  { key: "partner_site", label: "سایت همکار", color: "#ef4444" },
  { key: "admin", label: "پنل مدیریت", color: "#64748b" },
];

export function SourceBadge({ source, partner }: { source: string; partner?: string | null }) {
  const s = SOURCE_OPTS.find((x) => x.key === source) ?? SOURCE_OPTS[5];
  return (
    <span className="badge badge-sm gap-1 whitespace-nowrap border-0 font-medium text-white" style={{ background: s.color }}>
      {s.label}
      {partner ? ` · ${partner}` : ""}
    </span>
  );
}

export function CheckButtons({ id, checkedIn, checkedOut, confirmed, size = "sm" }: { id: number; checkedIn: boolean; checkedOut: boolean; confirmed: boolean; size?: "sm" | "xs" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const run = (p: Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await p;
      setToast({ msg: r.message, tone: r.ok ? "success" : "error" });
      router.refresh();
    });
  const cls = `btn btn-${size}`;
  if (!confirmed) return null;
  return (
    <>
      {!checkedIn && <button type="button" disabled={pending} onClick={() => run(checkInReservation(id))} className={`${cls} btn-success`}><LogIn className="h-3.5 w-3.5" /> پذیرش</button>}
      {checkedIn && !checkedOut && <button type="button" disabled={pending} onClick={() => run(checkOutReservation(id))} className={`${cls} btn-warning`}><LogOut className="h-3.5 w-3.5" /> تخلیه</button>}
      {checkedIn && <button type="button" disabled={pending} onClick={() => run(undoCheck(id, checkedOut ? "out" : "in"))} className={`${cls} btn-ghost`} title="لغو"><Undo2 className="h-3.5 w-3.5" /></button>}
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </>
  );
}

const HK: Record<string, [string, string]> = {
  clean: ["تمیز", "select-success"],
  dirty: ["نیاز به نظافت", "select-warning"],
  inspected: ["بازبینی‌شده", "select-info"],
  out_of_order: ["خارج از سرویس", "select-error"],
};

export function HousekeepingSelect({ roomId, value }: { roomId: number; value: string }) {
  const [v, setV] = useState(value);
  const [, start] = useTransition();
  return (
    <select
      value={v}
      onChange={(e) => {
        const nv = e.target.value as "clean";
        setV(nv);
        start(async () => void (await setHousekeeping(roomId, nv)));
      }}
      className={cn("select select-xs w-full", HK[v]?.[1])}
    >
      {Object.entries(HK).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}

type Opt = { id: number; name: string; extra?: string };

function CompanionRows({ value, onChange }: { value: CompanionInput[]; onChange: (v: CompanionInput[]) => void }) {
  const upd = (i: number, p: Partial<CompanionInput>) => onChange(value.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-box border border-base-300 p-2 sm:grid-cols-[1.4fr_1fr_0.9fr_1fr_0.8fr_auto]">
          <input value={c.fullName} onChange={(e) => upd(i, { fullName: e.target.value })} placeholder="نام و نام خانوادگی" className="input input-sm col-span-2 w-full sm:col-span-1" />
          <input value={c.idNumber} onChange={(e) => upd(i, { idNumber: e.target.value })} placeholder="کد ملی / پاسپورت" dir="ltr" className="input input-sm w-full text-left" />
          <input value={c.nationality} onChange={(e) => upd(i, { nationality: e.target.value })} placeholder="ملیت" className="input input-sm w-full" />
          <input value={c.phone} onChange={(e) => upd(i, { phone: e.target.value })} placeholder="موبایل" dir="ltr" className="input input-sm w-full text-left" />
          <input value={c.relation} onChange={(e) => upd(i, { relation: e.target.value })} placeholder="نسبت" className="input input-sm w-full" />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="btn btn-square btn-ghost btn-sm text-error"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { fullName: "", idNumber: "", nationality: "ایرانی", phone: "", relation: "" }])} className="btn btn-sm"><UserPlus className="h-4 w-4" /> افزودن همراه</button>
    </div>
  );
}

export function CompanionsEditor({ reservationId, initial }: { reservationId: number; initial: CompanionInput[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold">لیست مهمانان همراه ({faNum(list.length)})</h3>
          <button type="button" disabled={pending} onClick={() => start(async () => { const r = await saveCompanions(reservationId, list); setToast(r.message); router.refresh(); })} className="btn btn-primary btn-sm"><Save className="h-4 w-4" /> ذخیره</button>
        </div>
        <CompanionRows value={list} onChange={setList} />
      </div>
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}

export function SourceEditor({ id, source, partnerId, partners }: { id: number; source: string; partnerId: number | null; partners: Opt[] }) {
  const router = useRouter();
  const [src, setSrc] = useState(source as ReservationSource);
  const [pid, setPid] = useState<number | null>(partnerId);
  const [pending, start] = useTransition();
  const needsPartner = src === "agency" || src === "partner_site";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={src} onChange={(e) => setSrc(e.target.value as ReservationSource)} className="select select-sm">
        {SOURCE_OPTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
      </select>
      {needsPartner && (
        <select value={pid ?? ""} onChange={(e) => setPid(Number(e.target.value) || null)} className="select select-sm">
          <option value="">انتخاب همکار…</option>
          {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      <button type="button" disabled={pending} onClick={() => start(async () => { await setReservationSource(id, src, pid); router.refresh(); })} className="btn btn-sm">ثبت منبع</button>
    </div>
  );
}

export function NewReservationForm({ rooms, partners, defaults }: { rooms: Opt[]; partners: Opt[]; defaults: { roomId?: number; checkIn?: string } }) {
  const [state, action] = useActionState(createAdminReservation, null);
  const today = todayISO();
  const [source, setSource] = useState<ReservationSource>("walk_in");
  const [roomId, setRoomId] = useState(defaults.roomId ?? rooms[0]?.id ?? 0);
  const [checkIn, setCheckIn] = useState(defaults.checkIn ?? today);
  const [checkOut, setCheckOut] = useState(addDaysISO(defaults.checkIn ?? today, 1));
  const [guests, setGuests] = useState(2);
  const [companions, setCompanions] = useState<CompanionInput[]>([]);
  const [quote, setQuote] = useState<{ total: number; nights: number; busy: boolean } | null>(null);
  useEffect(() => {
    let alive = true;
    if (roomId && checkIn && checkOut > checkIn) quickRoomQuote(roomId, checkIn, checkOut, guests).then((q) => alive && setQuote(q));
    return () => {
      alive = false;
    };
  }, [roomId, checkIn, checkOut, guests]);
  const needsPartner = source === "agency" || source === "partner_site";
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <input type="hidden" name="companions" value={JSON.stringify(companions)} />
      <input type="hidden" name="source" value={source} />
      <div className="space-y-6">
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
          <h3 className="font-extrabold">منبع رزرو</h3>
          <div className="flex flex-wrap gap-2">
            {SOURCE_OPTS.filter((s) => s.key !== "website").map((s) => (
              <button key={s.key} type="button" onClick={() => setSource(s.key)} className={cn("btn btn-sm", source === s.key ? "text-white" : "btn-ghost border-base-300")} style={source === s.key ? { background: s.color, borderColor: s.color } : undefined}>{s.label}</button>
            ))}
          </div>
          {needsPartner && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="field-label">آژانس / سایت همکار *</label><select name="partnerId" className="select w-full" required><option value="">انتخاب…</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div><label className="field-label">شماره رزرو همکار (اختیاری)</label><input name="externalRef" dir="ltr" className="input w-full text-left" /></div>
            </div>
          )}
        </div></section>
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
          <h3 className="font-extrabold">اتاق و تاریخ</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="field-label">اتاق</label><select name="roomId" value={roomId} onChange={(e) => setRoomId(Number(e.target.value))} className="select w-full">{rooms.map((r) => <option key={r.id} value={r.id}>{r.name}{r.extra ? ` — ${r.extra}` : ""}</option>)}</select></div>
            <JalaliDatePicker name="checkIn" label="ورود" value={checkIn} onChange={(v) => { setCheckIn(v); if (checkOut <= v) setCheckOut(addDaysISO(v, 1)); }} />
            <JalaliDatePicker name="checkOut" label="خروج" value={checkOut} min={addDaysISO(checkIn, 1)} onChange={setCheckOut} />
            <div><label className="field-label">تعداد نفرات</label><input name="guests" type="number" min={1} value={guests} onChange={(e) => setGuests(Number(e.target.value) || 1)} className="input w-full" /></div>
          </div>
          {quote && (
            <div className={cn("alert alert-soft text-sm", quote.busy ? "alert-error" : "alert-info")}>
              {quote.busy ? "این اتاق در بازه انتخابی رزرو قطعی دارد." : <>قیمت محاسبه‌شده: <b>{formatPrice(quote.total)}</b> تومان برای {faNum(quote.nights)} شب</>}
            </div>
          )}
        </div></section>
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
          <h3 className="font-extrabold">سرپرست مهمانان</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="field-label">نام و نام خانوادگی *</label><input name="guestName" required className="input w-full" /></div>
            <div><label className="field-label">موبایل</label><input name="phone" dir="ltr" className="input w-full text-left" placeholder="09…" /></div>
            <div><label className="field-label">کد ملی / پاسپورت</label><input name="nationalId" dir="ltr" className="input w-full text-left" /></div>
            <div><label className="field-label">ایمیل</label><input name="email" type="email" dir="ltr" className="input w-full text-left" /></div>
          </div>
          <div><label className="field-label">توضیحات</label><textarea name="notes" rows={2} className="textarea w-full" /></div>
        </div></section>
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
          <h3 className="font-extrabold">مهمانان همراه</h3>
          <CompanionRows value={companions} onChange={setCompanions} />
        </div></section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
          <h3 className="font-extrabold">مالی و وضعیت</h3>
          <div><label className="field-label">مبلغ کل (خالی = قیمت سیستم)</label><input name="totalOverride" type="number" min={0} placeholder={quote ? String(quote.total) : ""} className="input w-full" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="field-label">مبلغ دریافتی</label><input name="depositPaid" type="number" min={0} defaultValue={0} className="input w-full" /></div>
            <div><label className="field-label">روش</label><select name="paymentMethod" className="select w-full"><option value="cash">نقد / کارتخوان</option><option value="card">کارت به کارت</option><option value="gateway">درگاه</option><option value="partner">تسویه با همکار</option></select></div>
          </div>
          <div><label className="field-label">شماره پیگیری</label><input name="paymentRef" dir="ltr" className="input w-full text-left" /></div>
          <div className="join w-full">
            <label className="btn join-item flex-1 has-[:checked]:btn-success"><input type="radio" name="status" value="confirmed" defaultChecked className="hidden" /> قطعی</label>
            <label className="btn join-item flex-1 has-[:checked]:btn-warning"><input type="radio" name="status" value="pending" className="hidden" /> در انتظار پرداخت</label>
          </div>
          <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-3 py-2 text-sm">پذیرش (Check-in) همین الان<input type="checkbox" name="checkInNow" defaultChecked={source === "walk_in"} className="checkbox checkbox-sm checkbox-success" /></label>
          <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-3 py-2 text-sm">ارسال پیامک کد رزرو<input type="checkbox" name="sendSms" className="checkbox checkbox-sm checkbox-primary" /></label>
          <FormAlert state={state} />
          <SubmitButton className="btn btn-primary btn-block"><Plus className="h-4 w-4" /> ثبت رزرو</SubmitButton>
          <Link href="/admin/reservations" className="btn btn-ghost btn-block">انصراف</Link>
        </div></section>
      </aside>
    </form>
  );
}
