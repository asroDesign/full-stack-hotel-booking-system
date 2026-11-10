"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { ListOrdered, ScrollText, Waves, SearchCheck, Type, Plus, Trash2, ArrowUp, ArrowDown, Save, ExternalLink, RotateCcw, Info } from "lucide-react";
import type { BookingContent } from "@/lib/content";
import { saveContent, resetContent } from "@/app/actions/admin";
import { FormAlert, SubmitButton } from "./ui";
import { StringListEditor } from "./media-inputs";
import { SectionCard, Switch, TextField } from "./content-fields";
import { faNum } from "@/lib/utils";

const EMOJIS = ["🔎", "📝", "💳", "🔑", "🏨", "🛏️", "🏊", "📅", "✅", "📞", "📩", "⭐", "🎉", "🧾"];

export function BookingEditor({
  initial,
  services,
}: {
  initial: BookingContent;
  services: { id: number; name: string; rules: string[] }[];
}) {
  const [c, setC] = useState<BookingContent>(initial);
  const [svcRules, setSvcRules] = useState<Record<string, string[]>>(Object.fromEntries(services.map((s) => [String(s.id), s.rules])));
  const [state, action] = useActionState(saveContent, null);
  const [resetting, startReset] = useTransition();
  const set = <K extends keyof BookingContent>(k: K, v: BookingContent[K]) => setC((p) => ({ ...p, [k]: v }));
  const setStep = (i: number, patch: Partial<BookingContent["steps"][number]>) =>
    set("steps", c.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const moveStep = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= c.steps.length) return;
    const a = [...c.steps];
    [a[i], a[j]] = [a[j], a[i]];
    set("steps", a);
  };

  return (
    <form action={action} className="space-y-4 pb-24">
      <input type="hidden" name="key" value="booking" />
      <input type="hidden" name="json" value={JSON.stringify(c)} />
      <input type="hidden" name="serviceRules" value={JSON.stringify(svcRules)} />

      <SectionCard title="عنوان صفحه رزرو" icon={<Type className="h-5 w-5" />} desc={c.pageTitle}>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="عنوان صفحه" value={c.pageTitle} onChange={(v) => set("pageTitle", v)} />
          <TextField label="زیرعنوان" value={c.pageSubtitle} onChange={(v) => set("pageSubtitle", v)} />
        </div>
      </SectionCard>

      <SectionCard title="فرایند رزرو" desc={`${faNum(c.steps.length)} مرحله · ${c.processSubtitle}`} icon={<ListOrdered className="h-5 w-5" />} defaultOpen>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="برچسب" value={c.processTitle} onChange={(v) => set("processTitle", v)} />
          <TextField label="عنوان" value={c.processSubtitle} onChange={(v) => set("processSubtitle", v)} />
        </div>
        <ol className="grid gap-3 lg:grid-cols-2">
          {c.steps.map((s, i) => (
            <li key={i} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-400 text-sm font-black text-brand-950">{faNum(i + 1)}</span>
                <input value={s.emoji} onChange={(e) => setStep(i, { emoji: e.target.value })} className="input w-16 text-center text-xl" maxLength={4} />
                <div className="no-scrollbar flex flex-1 gap-1 overflow-x-auto">
                  {EMOJIS.map((em) => (
                    <button key={em} type="button" onClick={() => setStep(i, { emoji: em })} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-lg hover:bg-white">{em}</button>
                  ))}
                </div>
              </div>
              <input value={s.title} onChange={(e) => setStep(i, { title: e.target.value })} className="input w-full mb-2 font-bold" placeholder="عنوان مرحله" />
              <textarea value={s.text} onChange={(e) => setStep(i, { text: e.target.value })} rows={3} className="textarea w-full" placeholder="توضیح مرحله" />
              <div className="mt-2 flex justify-end gap-1">
                <button type="button" onClick={() => moveStep(i, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-500 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => moveStep(i, 1)} disabled={i === c.steps.length - 1} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-slate-500 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => set("steps", c.steps.filter((_, j) => j !== i))} className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={() => set("steps", [...c.steps, { emoji: "✅", title: "", text: "" }])} className="btn"><Plus className="h-4 w-4" /> افزودن مرحله</button>
        <div>
          <label className="field-label flex items-center gap-1.5"><Info className="h-4 w-4 text-amber-600" /> متن «توجه»</label>
          <textarea value={c.notice} onChange={(e) => set("notice", e.target.value)} rows={3} className="textarea w-full border-amber-200 bg-amber-50/40" />
        </div>
      </SectionCard>

      <SectionCard title="قوانین اقامت در هتل" desc={`${faNum(c.hotelRules.length)} قانون`} icon={<ScrollText className="h-5 w-5" />}>
        <TextField label="عنوان قوانین" value={c.hotelRulesTitle} onChange={(v) => set("hotelRulesTitle", v)} />
        <StringListEditor value={c.hotelRules} onChange={(v) => set("hotelRules", v)} placeholder="متن قانون" />
        <Switch label="الزام تأیید قوانین توسط مهمان" hint="مهمان باید پیش از ثبت درخواست، تیک پذیرش قوانین را بزند." checked={c.requireRulesAccept} onChange={(v) => set("requireRulesAccept", v)} />
      </SectionCard>

      {services.map((s) => (
        <SectionCard key={s.id} title={`قوانین ${s.name}`} desc={`${faNum(svcRules[String(s.id)]?.length ?? 0)} قانون`} icon={<Waves className="h-5 w-5" />}>
          <StringListEditor value={svcRules[String(s.id)] ?? []} onChange={(v) => setSvcRules((p) => ({ ...p, [String(s.id)]: v }))} placeholder="متن قانون" />
        </SectionCard>
      ))}

      <SectionCard title="بخش پیگیری رزرو" desc={c.trackTitle} icon={<SearchCheck className="h-5 w-5" />}>
        <TextField label="عنوان" value={c.trackTitle} onChange={(v) => set("trackTitle", v)} />
        <TextField label="توضیح" value={c.trackText} onChange={(v) => set("trackText", v)} area rows={2} />
      </SectionCard>

      <div className="fixed inset-x-4 bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-2xl bg-white/90 p-3 shadow-2xl ring-1 ring-slate-200 backdrop-blur lg:right-[19rem]">
        <SubmitButton className="btn btn-primary px-8"><Save className="h-4 w-4" /> ذخیره و انتشار</SubmitButton>
        <Link href="/booking" target="_blank" className="btn"><ExternalLink className="h-4 w-4" /> مشاهده صفحه رزرو</Link>
        <button
          type="button"
          disabled={resetting}
          onClick={() => {
            if (!confirm("محتوای صفحه رزرو (به جز قوانین خدمات) به پیش‌فرض برگردد؟")) return;
            startReset(async () => {
              await resetContent("booking");
              window.location.reload();
            });
          }}
          className="btn text-slate-500 hover:bg-slate-100"
        >
          <RotateCcw className="h-4 w-4" /> پیش‌فرض
        </button>
        <div className="min-w-[200px] flex-1"><FormAlert state={state} /></div>
      </div>
    </form>
  );
}
