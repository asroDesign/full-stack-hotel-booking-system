"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Send, Users, KeyRound, Copy, Check, Play, Gift, Ban, CheckCircle2, MessageSquare } from "lucide-react";
import {
  activateGiftCardAction,
  audienceCount,
  deleteCampaign,
  deleteCustomer,
  deleteGroup,
  deletePartner,
  deleteSmsTemplate,
  issueGiftCard,
  regeneratePartnerCredentials,
  replyGuestRequest,
  runJobsNow,
  saveCampaign,
  saveCustomer,
  saveGroup,
  savePartner,
  saveSmsTemplate,
  sendManualSms,
  setTableBookingStatus,
  voidGiftCardAction,
} from "@/app/actions/hotel";
import type { CampaignAudience, CustomerGroup, CustomerTier, Partner } from "@/db/schema";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { FormAlert, Modal, SubmitButton, Toast } from "./ui";
import { cn, faNum, formatPrice, jMonths } from "@/lib/utils";

const TIERS: [CustomerTier, string][] = [["bronze", "برنزی"], ["silver", "نقره‌ای"], ["gold", "طلایی"], ["platinum", "پلاتینیوم"]];
const useToast = () => {
  const [t, setT] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  return { t, show: (msg: string, ok = true) => setT({ msg, tone: ok ? "success" : "error" }), node: <Toast message={t?.msg ?? null} tone={t?.tone} onDone={() => setT(null)} /> };
};

/* ---------------------------- customers ---------------------------- */

type CustomerDTO = { id?: number; name: string; phone: string; email: string; nationalId: string; birthDate: string | null; gender: string; city: string; tags: string[]; notes: string; smsOptIn: boolean; groupIds: number[] };

export function CustomerForm({ c, groups }: { c: CustomerDTO; groups: { id: number; name: string }[] }) {
  const [state, action] = useActionState(saveCustomer, null);
  const [birth, setBirth] = useState(c.birthDate ?? "");
  return (
    <form action={action} className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <input type="hidden" name="id" value={c.id ?? ""} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">نام و نام خانوادگی</label><input name="name" defaultValue={c.name} className="input w-full" /></div>
          <div><label className="field-label">موبایل *</label><input name="phone" defaultValue={c.phone} required dir="ltr" className="input w-full text-left" /></div>
          <div><label className="field-label">ایمیل</label><input name="email" defaultValue={c.email} dir="ltr" className="input w-full text-left" /></div>
          <div><label className="field-label">کد ملی</label><input name="nationalId" defaultValue={c.nationalId} dir="ltr" className="input w-full text-left" /></div>
          <JalaliDatePicker name="birthDate" label="تاریخ تولد" value={birth} min="1300-01-01" onChange={setBirth} placeholder="انتخاب تاریخ تولد" />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="field-label">جنسیت</label><select name="gender" defaultValue={c.gender} className="select w-full"><option value="">—</option><option value="m">آقا</option><option value="f">خانم</option></select></div>
            <div><label className="field-label">شهر</label><input name="city" defaultValue={c.city} className="input w-full" /></div>
          </div>
        </div>
        <p className="-mt-2 text-[11px] text-base-content/50">برای انتخاب سال تولد، در تقویم با فلش‌ها به ماه‌ها/سال‌های قبل بروید.</p>
        <div><label className="field-label">برچسب‌ها (با کاما جدا کنید)</label><input name="tags" defaultValue={c.tags.join("، ")} className="input w-full" placeholder="VIP، تجاری، خانوادگی" /></div>
        {groups.length > 0 && (
          <div>
            <label className="field-label">گروه‌های دستی</label>
            <div className="flex flex-wrap gap-2">
              {groups.map((g) => (
                <label key={g.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-base-300 px-3 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                  <input type="checkbox" name="groupIds" value={g.id} defaultChecked={c.groupIds.includes(g.id)} className="checkbox checkbox-xs checkbox-primary" />{g.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div><label className="field-label">یادداشت داخلی</label><textarea name="notes" defaultValue={c.notes} rows={3} className="textarea w-full" placeholder="ترجیحات، حساسیت‌ها، نکات پذیرش…" /></div>
        <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-4 py-2.5 text-sm">دریافت پیامک‌های تبلیغاتی و کمپین‌ها<input type="checkbox" name="smsOptIn" defaultChecked={c.smsOptIn} className="toggle toggle-primary toggle-sm" /></label>
        <FormAlert state={state} />
        <SubmitButton className="btn btn-primary">ذخیره پروفایل</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteCustomerButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => { if (confirm("مشتری حذف شود؟ (رزروها حفظ می‌شوند)")) start(async () => { await deleteCustomer(id); router.push("/admin/customers"); }); }} className="btn btn-ghost btn-sm text-error"><Trash2 className="h-4 w-4" /> حذف مشتری</button>
  );
}

export function GroupsManager({ groups, counts }: { groups: CustomerGroup[]; counts: Record<number, number> }) {
  const router = useRouter();
  const [edit, setEdit] = useState<CustomerGroup | "new" | null>(null);
  const [kind, setKind] = useState<"static" | "dynamic">("dynamic");
  const [key, setKey] = useState(0);
  const [state, action] = useActionState(saveGroup, null);
  const [, start] = useTransition();
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) {
      setEdit(null);
      toast.show(state.message ?? "ذخیره شد");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const g = edit === "new" ? null : edit;
  const open = (v: CustomerGroup | "new") => {
    setKey((k) => k + 1);
    setKind(v === "new" ? "dynamic" : v.kind);
    setEdit(v);
  };
  return (
    <div>
      <div className="mb-4 flex justify-end"><button type="button" onClick={() => open("new")} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> گروه جدید</button></div>
      {groups.length === 0 ? (
        <p className="rounded-box border-2 border-dashed border-base-300 p-10 text-center text-sm text-base-content/50">هنوز گروهی تعریف نشده. گروه‌های هوشمند بر اساس سطح، تعداد اقامت، ماه تولد، شهر یا برچسب خودکار به‌روز می‌شوند.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groups.map((x) => (
            <div key={x.id} className="card card-border bg-base-100 shadow-sm">
              <div className="card-body gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold">{x.name}</div>
                    <div className="text-xs text-base-content/55">{x.description}</div>
                  </div>
                  <span className={cn("badge badge-sm", x.kind === "dynamic" ? "badge-secondary" : "badge-ghost")}>{x.kind === "dynamic" ? "هوشمند" : "دستی"}</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm"><Users className="h-4 w-4 text-primary" />{faNum(counts[x.id] ?? 0)} عضو</div>
                <div className="card-actions justify-end">
                  <button type="button" onClick={() => open(x)} className="btn btn-square btn-ghost btn-sm"><Pencil className="h-4 w-4" /></button>
                  <button type="button" onClick={() => { if (confirm("گروه حذف شود؟")) start(async () => { await deleteGroup(x.id); router.refresh(); }); }} className="btn btn-square btn-ghost btn-sm text-error"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={g ? "ویرایش گروه" : "گروه جدید"}>
        <form key={key} action={action} className="space-y-3">
          <input type="hidden" name="id" value={g?.id ?? ""} />
          <input type="hidden" name="kind" value={kind} />
          <div><label className="field-label">نام گروه *</label><input name="name" defaultValue={g?.name} required className="input w-full" /></div>
          <div><label className="field-label">توضیح</label><input name="description" defaultValue={g?.description} className="input w-full" /></div>
          <div className="join w-full">
            <button type="button" onClick={() => setKind("dynamic")} className={cn("btn join-item flex-1 btn-sm", kind === "dynamic" && "btn-secondary")}>هوشمند (بر اساس شرایط)</button>
            <button type="button" onClick={() => setKind("static")} className={cn("btn join-item flex-1 btn-sm", kind === "static" && "btn-secondary")}>دستی</button>
          </div>
          {kind === "dynamic" ? (
            <div className="space-y-3 rounded-box bg-base-200/60 p-3">
              <div className="flex flex-wrap gap-2">{TIERS.map(([k, l]) => <label key={k} className="flex items-center gap-1 text-xs"><input type="checkbox" name="tiers" value={k} defaultChecked={g?.rules.tiers?.includes(k)} className="checkbox checkbox-xs" />{l}</label>)}</div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="field-label text-xs">حداقل تعداد اقامت</label><input name="minStays" type="number" min={0} defaultValue={g?.rules.minStays ?? ""} className="input input-sm w-full" /></div>
                <div><label className="field-label text-xs">حداقل مبلغ خرید (تومان)</label><input name="minSpent" type="number" min={0} defaultValue={g?.rules.minSpent ?? ""} className="input input-sm w-full" /></div>
                <div><label className="field-label text-xs">ماه تولد</label><select name="birthdayMonth" defaultValue={g?.rules.birthdayMonth ?? ""} className="select select-sm w-full"><option value="">—</option>{jMonths.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></div>
                <div><label className="field-label text-xs">شهر</label><input name="city" defaultValue={g?.rules.city ?? ""} className="input input-sm w-full" /></div>
                <div><label className="field-label text-xs">آخرین اقامت در X روز اخیر</label><input name="lastStayWithinDays" type="number" min={0} defaultValue={g?.rules.lastStayWithinDays ?? ""} className="input input-sm w-full" /></div>
                <div><label className="field-label text-xs">بدون اقامت در X روز اخیر</label><input name="lastStayBeforeDays" type="number" min={0} defaultValue={g?.rules.lastStayBeforeDays ?? ""} className="input input-sm w-full" /></div>
                <div><label className="field-label text-xs">برچسب</label><input name="tag" defaultValue={g?.rules.tag ?? ""} className="input input-sm w-full" /></div>
                <div><label className="field-label text-xs">منبع جذب</label><select name="source" defaultValue={g?.rules.source ?? ""} className="select select-sm w-full"><option value="">—</option><option value="website">سایت</option><option value="walk_in">حضوری</option><option value="phone">تلفنی</option><option value="agency">آژانس</option><option value="partner_site">سایت همکار</option></select></div>
              </div>
            </div>
          ) : (
            <p className="rounded-box bg-base-200/60 p-3 text-xs text-base-content/60">اعضای گروه دستی را از صفحه پروفایل هر مشتری اضافه کنید.</p>
          )}
          <FormAlert state={state?.ok ? null : state} />
          <SubmitButton className="btn btn-primary btn-block">ذخیره</SubmitButton>
        </form>
      </Modal>
      {toast.node}
    </div>
  );
}

/* ---------------------------- campaigns ---------------------------- */

const VARS = ["{name}", "{code}", "{hotel}", "{expires}"];

export function CampaignForm({ groups, templates }: { groups: { id: number; name: string; count: number }[]; templates: { id: number; title: string; body: string }[] }) {
  const [state, action] = useActionState(saveCampaign, null);
  const [all, setAll] = useState(true);
  const [gids, setGids] = useState<number[]>([]);
  const [tiers, setTiers] = useState<CustomerTier[]>([]);
  const [msg, setMsg] = useState("{name} عزیز، ");
  const [promo, setPromo] = useState<"none" | "shared" | "unique">("unique");
  const [count, setCount] = useState<number | null>(null);
  const audience: CampaignAudience = useMemo(() => (all ? { all: true } : { groupIds: gids, tiers }), [all, gids, tiers]);
  useEffect(() => {
    let alive = true;
    setCount(null);
    audienceCount(audience).then((n) => alive && setCount(n));
    return () => {
      alive = false;
    };
  }, [audience]);
  const parts = Math.max(1, Math.ceil((msg.length + 6) / 70));
  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="space-y-6">
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
          <div><label className="field-label">نام کمپین *</label><input name="name" required className="input w-full" placeholder="مثلاً تخفیف آخر هفته پاییز" /></div>
          <div>
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <label className="field-label mb-0">متن پیامک *</label>
              <div className="flex flex-wrap gap-1">
                {VARS.map((v) => <button key={v} type="button" onClick={() => setMsg((m) => m + v)} className="badge badge-ghost cursor-pointer font-mono" dir="ltr">{v}</button>)}
                {templates.length > 0 && (
                  <select onChange={(e) => { const t = templates.find((x) => x.id === Number(e.target.value)); if (t) setMsg(t.body); e.target.value = ""; }} className="select select-xs" defaultValue="">
                    <option value="">از قالب‌ها…</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                )}
              </div>
            </div>
            <textarea name="message" value={msg} onChange={(e) => setMsg(e.target.value)} rows={5} required className="textarea w-full" />
            <p className="mt-1 text-xs text-base-content/50">{faNum(msg.length)} کاراکتر · حدود {faNum(parts)} پیامک برای هر نفر · عبارت لغو (مثل «لغو۱۱») خودکار به انتهای پیام اضافه می‌شود.</p>
          </div>
        </div></section>
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
          <h3 className="font-extrabold">کد تخفیف</h3>
          <input type="hidden" name="promoMode" value={promo} />
          <div className="join w-full">
            {([["none", "بدون کد"], ["unique", "کد اختصاصی برای هر نفر"], ["shared", "یک کد مشترک"]] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setPromo(k)} className={cn("btn join-item btn-sm flex-1", promo === k && "btn-primary")}>{l}</button>
            ))}
          </div>
          {promo !== "none" && (
            <div className="grid gap-2 sm:grid-cols-3">
              <div><label className="field-label text-xs">نوع</label><select name="promoKind" className="select select-sm w-full"><option value="percent">درصدی</option><option value="fixed">مبلغ ثابت</option></select></div>
              <div><label className="field-label text-xs">مقدار</label><input name="promoValue" type="number" min={1} defaultValue={15} className="input input-sm w-full" /></div>
              <div><label className="field-label text-xs">اعتبار (روز)</label><input name="promoValidDays" type="number" min={1} defaultValue={30} className="input input-sm w-full" /></div>
              {promo === "shared" && <div className="sm:col-span-3"><label className="field-label text-xs">کد دلخواه (خالی = خودکار)</label><input name="promoCode" dir="ltr" className="input input-sm w-full text-left font-mono uppercase" /></div>}
              <p className="text-xs text-base-content/55 sm:col-span-3">متغیر <code dir="ltr">{"{code}"}</code> را در متن قرار دهید. کدهای اختصاصی یک‌بارمصرف و غیرعمومی هستند.</p>
            </div>
          )}
        </div></section>
      </div>
      <aside className="space-y-4 lg:sticky lg:top-8 lg:self-start">
        <section className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-3 p-5">
          <h3 className="font-extrabold">مخاطبان</h3>
          <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-3 py-2 text-sm">همه مشتریان<input type="checkbox" name="audienceAll" checked={all} onChange={(e) => setAll(e.target.checked)} className="toggle toggle-primary toggle-sm" /></label>
          {!all && (
            <>
              <div className="space-y-1">
                {groups.map((g) => (
                  <label key={g.id} className="flex cursor-pointer items-center justify-between rounded-field px-2 py-1.5 text-sm hover:bg-base-200">
                    <span className="flex items-center gap-2"><input type="checkbox" name="groupIds" value={g.id} checked={gids.includes(g.id)} onChange={(e) => setGids((x) => (e.target.checked ? [...x, g.id] : x.filter((y) => y !== g.id)))} className="checkbox checkbox-xs checkbox-primary" />{g.name}</span>
                    <span className="badge badge-ghost badge-sm">{faNum(g.count)}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">{TIERS.map(([k, l]) => <label key={k} className="flex items-center gap-1 text-xs"><input type="checkbox" name="tiers" value={k} checked={tiers.includes(k)} onChange={(e) => setTiers((x) => (e.target.checked ? [...x, k] : x.filter((y) => y !== k)))} className="checkbox checkbox-xs" />{l}</label>)}</div>
            </>
          )}
          <div className="rounded-box bg-primary/10 p-3 text-center text-sm">{count === null ? <span className="loading loading-dots loading-sm" /> : <><b className="text-2xl">{faNum(count)}</b> گیرنده (فقط مشتریان دارای رضایت دریافت پیامک)</>}</div>
          <div><label className="field-label">زمان ارسال (برای زمان‌بندی)</label><input name="scheduledAt" type="datetime-local" className="input w-full" dir="ltr" /></div>
          <FormAlert state={state} />
          <div className="grid gap-2">
            <button name="intent" value="send" className="btn btn-primary" onClick={(e) => { if (!confirm(`ارسال فوری برای ${count ?? 0} نفر؟`)) e.preventDefault(); }}><Send className="h-4 w-4" /> ارسال فوری</button>
            <button name="intent" value="schedule" className="btn btn-secondary">زمان‌بندی ارسال</button>
            <button name="intent" value="draft" className="btn btn-ghost">ذخیره پیش‌نویس</button>
          </div>
        </div></section>
      </aside>
    </form>
  );
}

export function CampaignDelete({ id }: { id: number }) {
  const router = useRouter();
  const [p, start] = useTransition();
  return <button type="button" disabled={p} onClick={() => { if (confirm("کمپین حذف شود؟")) start(async () => { await deleteCampaign(id); router.refresh(); }); }} className="btn btn-square btn-ghost btn-xs text-error"><Trash2 className="h-3.5 w-3.5" /></button>;
}

export function RunJobsButton() {
  const router = useRouter();
  const [p, start] = useTransition();
  const toast = useToast();
  return (
    <>
      <button type="button" disabled={p} onClick={() => start(async () => { const r = await runJobsNow(); toast.show(r.message, r.ok); router.refresh(); })} className="btn btn-sm">
        {p ? <span className="loading loading-spinner loading-xs" /> : <Play className="h-4 w-4" />} اجرای کارهای زمان‌بندی‌شده
      </button>
      {toast.node}
    </>
  );
}

/* ---------------------------- SMS center ---------------------------- */

export function SmsSendForm({ groups, templates }: { groups: { id: number; name: string; count: number }[]; templates: { id: number; title: string; body: string }[] }) {
  const [state, action] = useActionState(sendManualSms, null);
  const [target, setTarget] = useState("numbers");
  const [text, setText] = useState("");
  return (
    <form action={action} className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-3 p-5">
        <h3 className="flex items-center gap-2 font-extrabold"><Send className="h-5 w-5 text-primary" /> ارسال پیامک</h3>
        <input type="hidden" name="target" value={target} />
        <div className="join w-full">
          {([["numbers", "شماره‌ها"], ["groups", "گروه‌ها"], ["all", "همه مشتریان"]] as const).map(([k, l]) => <button key={k} type="button" onClick={() => setTarget(k)} className={cn("btn join-item btn-sm flex-1", target === k && "btn-primary")}>{l}</button>)}
        </div>
        {target === "numbers" && <textarea name="numbers" rows={3} dir="ltr" className="textarea w-full text-left" placeholder="09121234567, 09351234567 …" />}
        {target === "groups" && (
          <div className="flex flex-wrap gap-2">{groups.map((g) => <label key={g.id} className="flex items-center gap-1.5 rounded-full border border-base-300 px-3 py-1 text-xs"><input type="checkbox" name="groupIds" value={g.id} className="checkbox checkbox-xs" />{g.name} ({faNum(g.count)})</label>)}</div>
        )}
        {templates.length > 0 && (
          <select onChange={(e) => { const t = templates.find((x) => x.id === Number(e.target.value)); if (t) setText(t.body); }} className="select select-sm" defaultValue="">
            <option value="">انتخاب از قالب‌ها…</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
        )}
        <textarea name="text" value={text} onChange={(e) => setText(e.target.value)} rows={4} required className="textarea w-full" placeholder="متن پیامک…" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-base-content/55">
          <span>{faNum(text.length)} کاراکتر</span>
          <label className="flex items-center gap-1.5"><input type="checkbox" name="marketing" defaultChecked={target !== "numbers"} className="checkbox checkbox-xs" />پیام تبلیغاتی (افزودن عبارت لغو)</label>
        </div>
        <FormAlert state={state} />
        <SubmitButton className="btn btn-primary"><Send className="h-4 w-4" /> ارسال</SubmitButton>
      </div>
    </form>
  );
}

export function TemplatesManager({ templates }: { templates: { id: number; title: string; body: string }[] }) {
  const router = useRouter();
  const [state, action] = useActionState(saveSmsTemplate, null);
  const [edit, setEdit] = useState<{ id: number; title: string; body: string } | null>(null);
  const [key, setKey] = useState(0);
  const [, start] = useTransition();
  useEffect(() => {
    if (state?.ok) {
      setEdit(null);
      setKey((k) => k + 1);
      router.refresh();
    }
  }, [state, router]);
  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-3 p-5">
        <h3 className="flex items-center gap-2 font-extrabold"><MessageSquare className="h-5 w-5 text-primary" /> قالب‌های پیامک</h3>
        <ul className="divide-y divide-base-200">
          {templates.map((t) => (
            <li key={t.id} className="flex items-start gap-2 py-2">
              <div className="min-w-0 flex-1"><div className="text-sm font-bold">{t.title}</div><div className="line-clamp-2 text-xs text-base-content/60">{t.body}</div></div>
              <button type="button" onClick={() => { setEdit(t); setKey((k) => k + 1); }} className="btn btn-square btn-ghost btn-xs"><Pencil className="h-3.5 w-3.5" /></button>
              <button type="button" onClick={() => start(async () => { await deleteSmsTemplate(t.id); router.refresh(); })} className="btn btn-square btn-ghost btn-xs text-error"><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
        <form key={key} action={action} className="space-y-2 rounded-box bg-base-200/60 p-3">
          <input type="hidden" name="id" value={edit?.id ?? ""} />
          <input name="title" defaultValue={edit?.title} placeholder="عنوان قالب" className="input input-sm w-full" required />
          <textarea name="body" defaultValue={edit?.body} rows={3} placeholder="متن (متغیرها: {name} {code} {hotel})" className="textarea textarea-sm w-full" required />
          <FormAlert state={state?.ok ? null : state} />
          <div className="flex gap-2"><SubmitButton className="btn btn-sm btn-primary">{edit ? "ذخیره تغییرات" : "افزودن قالب"}</SubmitButton>{edit && <button type="button" onClick={() => { setEdit(null); setKey((k) => k + 1); }} className="btn btn-sm btn-ghost">انصراف</button>}</div>
        </form>
      </div>
    </div>
  );
}

/* ---------------------------- gift cards ---------------------------- */

export function IssueGiftCard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(issueGiftCard, null);
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) {
      setOpen(false);
      toast.show(state.message ?? "");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn btn-primary"><Gift className="h-4 w-4" /> صدور کارت هدیه</button>
      <Modal open={open} onClose={() => setOpen(false)} title="صدور کارت هدیه (پنل)">
        <form action={action} className="space-y-3">
          <div><label className="field-label">مبلغ (تومان) *</label><input name="amount" type="number" min={100000} step={100000} required className="input w-full" /></div>
          <div className="grid grid-cols-2 gap-2">
            <input name="purchaserName" placeholder="نام خریدار" className="input input-sm w-full" />
            <input name="purchaserPhone" placeholder="موبایل خریدار" dir="ltr" className="input input-sm w-full text-left" />
            <input name="recipientName" placeholder="نام گیرنده" className="input input-sm w-full" />
            <input name="recipientPhone" placeholder="موبایل گیرنده" dir="ltr" className="input input-sm w-full text-left" />
          </div>
          <input name="message" placeholder="پیام تبریک (اختیاری)" className="input input-sm w-full" />
          <div className="grid grid-cols-2 gap-2">
            <select name="paymentMethod" className="select select-sm w-full"><option value="cash">نقد / کارتخوان</option><option value="card">کارت به کارت</option><option value="gateway">درگاه</option></select>
            <input name="paymentRef" placeholder="شماره پیگیری" dir="ltr" className="input input-sm w-full text-left" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="complimentary" className="checkbox checkbox-sm" /> کارت اهدایی (بدون فروش و سند مالی)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sendSms" defaultChecked className="checkbox checkbox-sm checkbox-primary" /> ارسال کد به گیرنده با پیامک</label>
          <FormAlert state={state?.ok ? null : state} />
          <SubmitButton className="btn btn-primary btn-block">صدور</SubmitButton>
        </form>
      </Modal>
      {toast.node}
    </>
  );
}

export function GiftCardActions({ id, status, used }: { id: number; status: string; used: boolean }) {
  const router = useRouter();
  const [p, start] = useTransition();
  const toast = useToast();
  const run = (f: Promise<{ ok: boolean; message: string }>) => start(async () => { const r = await f; toast.show(r.message, r.ok); router.refresh(); });
  return (
    <div className="flex gap-1">
      {status === "pending_payment" && <button type="button" disabled={p} onClick={() => run(activateGiftCardAction(id))} className="btn btn-success btn-xs"><CheckCircle2 className="h-3.5 w-3.5" /> تایید پرداخت</button>}
      {(status === "pending_payment" || (status === "active" && !used)) && <button type="button" disabled={p} onClick={() => { if (confirm("کارت باطل شود؟")) run(voidGiftCardAction(id)); }} className="btn btn-ghost btn-xs text-error"><Ban className="h-3.5 w-3.5" /> ابطال</button>}
      {toast.node}
    </div>
  );
}

/* ---------------------------- table bookings ---------------------------- */

const TB: [string, string, string][] = [["new", "جدید", "btn-ghost"], ["confirmed", "تایید", "btn-success"], ["seated", "حاضر شد", "btn-info"], ["no_show", "نیامد", "btn-warning"], ["cancelled", "لغو", "btn-error"]];

export function TableBookingActions({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [p, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-1">
      {TB.filter(([k]) => k !== "new").map(([k, l, c]) => (
        <button key={k} type="button" disabled={p || status === k} onClick={() => start(async () => { await setTableBookingStatus(id, k as "confirmed"); router.refresh(); })} className={cn("btn btn-xs", status === k ? c : "btn-ghost border-base-300")}>{l}</button>
      ))}
    </div>
  );
}

/* ---------------------------- guest requests ---------------------------- */

export function GuestRequestReply({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [p, start] = useTransition();
  const send = (st?: "open" | "in_progress" | "done") => start(async () => { await replyGuestRequest(id, text, st); setText(""); router.refresh(); });
  return (
    <div className="space-y-2 border-t border-base-200 pt-3">
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="textarea w-full" placeholder="پاسخ به مهمان…" />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={p || !text.trim()} onClick={() => send()} className="btn btn-primary btn-sm"><Send className="h-4 w-4" /> ارسال پاسخ</button>
        {status !== "done" && <button type="button" disabled={p} onClick={() => send("done")} className="btn btn-success btn-sm btn-soft"><Check className="h-4 w-4" /> {text.trim() ? "ارسال و انجام شد" : "انجام شد"}</button>}
        {status === "done" && <button type="button" disabled={p} onClick={() => send("open")} className="btn btn-sm btn-ghost">بازگشایی</button>}
      </div>
    </div>
  );
}

/* ---------------------------- partners ---------------------------- */

function CopyField({ label, value }: { label: string; value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div>
      <div className="field-label text-xs">{label}</div>
      <div className="join w-full">
        <input readOnly value={value} dir="ltr" className="input input-sm join-item w-full text-left font-mono text-xs" />
        <button type="button" onClick={() => { navigator.clipboard?.writeText(value); setOk(true); setTimeout(() => setOk(false), 1500); }} className="btn btn-sm join-item">{ok ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}</button>
      </div>
    </div>
  );
}

export function PartnersManager({ partners: list, stats }: { partners: (Partner & { hasToken: boolean })[]; stats: Record<number, { count: number; revenue: number }> }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Partner | "new" | null>(null);
  const [key, setKey] = useState(0);
  const [creds, setCreds] = useState<{ name: string; token: string; secret: string } | null>(null);
  const [state, action] = useActionState(savePartner, null);
  const [p, start] = useTransition();
  const toast = useToast();
  useEffect(() => {
    if (state?.ok) {
      setEdit(null);
      toast.show(state.message ?? "");
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);
  const e = edit === "new" ? null : edit;
  return (
    <div>
      <div className="mb-4 flex justify-end"><button type="button" onClick={() => { setKey((k) => k + 1); setEdit("new"); }} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> همکار جدید</button></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {list.map((x) => (
          <div key={x.id} className={cn("card card-border bg-base-100 shadow-sm", !x.isActive && "opacity-60")}>
            <div className="card-body gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-bold">{x.name}</div><div className="text-xs text-base-content/55">{x.contactName} {x.phone && <span dir="ltr">· {faNum(x.phone)}</span>}</div></div>
                <span className={cn("badge badge-sm", x.type === "agency" ? "badge-warning" : "badge-error")}>{x.type === "agency" ? "آژانس" : "سایت همکار"}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-field bg-base-200 p-2"><div className="font-black">{faNum(stats[x.id]?.count ?? 0)}</div>رزرو</div>
                <div className="rounded-field bg-base-200 p-2"><div className="font-black">{faNum(x.commissionPercent)}٪</div>کمیسیون</div>
                <div className="rounded-field bg-base-200 p-2"><div className="truncate font-black">{formatPrice(Math.round((stats[x.id]?.revenue ?? 0) / 1_000_000))}M</div>فروش</div>
              </div>
              <div className="flex flex-wrap gap-1 text-[11px]">
                <span className={cn("badge badge-xs", x.hasToken ? "badge-success" : "badge-ghost")}>{x.hasToken ? `API فعال ····${x.tokenHint}` : "بدون توکن"}</span>
                {x.autoConfirm && <span className="badge badge-xs badge-info">تایید خودکار</span>}
                {x.allowedIps && <span className="badge badge-xs badge-ghost">محدودیت IP</span>}
              </div>
              <div className="card-actions items-center justify-between border-t border-base-200 pt-2">
                <button type="button" disabled={p} onClick={() => { if (!x.hasToken || confirm("توکن و کلید امضای جدید صادر شود؟ کلیدهای فعلی همکار از کار می‌افتند.")) start(async () => { const r = await regeneratePartnerCredentials(x.id); if (r.token && r.secret) setCreds({ name: x.name, token: r.token, secret: r.secret }); router.refresh(); }); }} className="btn btn-xs btn-secondary"><KeyRound className="h-3.5 w-3.5" /> {x.hasToken ? "صدور مجدد کلید" : "صدور توکن و کلید امضا"}</button>
                <div className="flex gap-1">
                  <button type="button" onClick={() => { setKey((k) => k + 1); setEdit(x); }} className="btn btn-square btn-ghost btn-xs"><Pencil className="h-3.5 w-3.5" /></button>
                  {x.isActive && <button type="button" onClick={() => { if (confirm("دسترسی این همکار قطع شود؟")) start(async () => { await deletePartner(x.id); router.refresh(); }); }} className="btn btn-square btn-ghost btn-xs text-error"><Ban className="h-3.5 w-3.5" /></button>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!edit} onClose={() => setEdit(null)} title={e ? `ویرایش ${e.name}` : "همکار جدید"}>
        <form key={key} action={action} className="space-y-3">
          <input type="hidden" name="id" value={e?.id ?? ""} />
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2"><label className="field-label">نام *</label><input name="name" defaultValue={e?.name} required className="input w-full" /></div>
            <div><label className="field-label">نوع</label><select name="type" defaultValue={e?.type ?? "agency"} className="select w-full"><option value="agency">آژانس مسافرتی</option><option value="site">سایت رزرو همکار</option></select></div>
            <div><label className="field-label">کمیسیون (٪)</label><input name="commissionPercent" type="number" min={0} max={50} defaultValue={e?.commissionPercent ?? 10} className="input w-full" /></div>
            <input name="contactName" defaultValue={e?.contactName} placeholder="نام رابط" className="input input-sm w-full" />
            <input name="phone" defaultValue={e?.phone} placeholder="تلفن" dir="ltr" className="input input-sm w-full text-left" />
            <input name="email" defaultValue={e?.email} placeholder="ایمیل" dir="ltr" className="input input-sm col-span-2 w-full text-left" />
          </div>
          <div><label className="field-label">IPهای مجاز (اختیاری، با فاصله یا کاما)</label><input name="allowedIps" defaultValue={e?.allowedIps} dir="ltr" className="input w-full text-left" placeholder="185.1.2.3, 5.6.7.8" /></div>
          <label className="flex items-center justify-between rounded-box bg-base-200 px-3 py-2 text-sm">تایید خودکار رزروها و صدور کد رزرو<input type="checkbox" name="autoConfirm" defaultChecked={e?.autoConfirm ?? true} className="toggle toggle-sm toggle-primary" /></label>
          <label className="flex items-center justify-between rounded-box bg-base-200 px-3 py-2 text-sm">اجازه لغو رزرو از طریق API<input type="checkbox" name="canCancel" defaultChecked={e?.canCancel ?? true} className="toggle toggle-sm toggle-primary" /></label>
          <label className="flex items-center justify-between rounded-box bg-base-200 px-3 py-2 text-sm">فعال<input type="checkbox" name="isActive" defaultChecked={e?.isActive ?? true} className="toggle toggle-sm toggle-success" /></label>
          <FormAlert state={state?.ok ? null : state} />
          <SubmitButton className="btn btn-primary btn-block">ذخیره</SubmitButton>
        </form>
      </Modal>
      <Modal open={!!creds} onClose={() => setCreds(null)} title={`کلیدهای API — ${creds?.name ?? ""}`}>
        {creds && (
          <div className="space-y-3">
            <div role="alert" className="alert alert-warning alert-soft text-xs">این کلیدها فقط همین یک بار نمایش داده می‌شوند. آن‌ها را به‌صورت امن برای همکار ارسال کنید.</div>
            <CopyField label="Bearer Token (هدر Authorization)" value={creds.token} />
            <CopyField label="Signing Secret (برای ساخت امضای HMAC)" value={creds.secret} />
            <a href="/admin/partners/docs" className="btn btn-sm btn-ghost">مستندات وب‌سرویس</a>
          </div>
        )}
      </Modal>
      {toast.node}
    </div>
  );
}
