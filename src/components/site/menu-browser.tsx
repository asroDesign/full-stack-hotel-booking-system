"use client";

import { Img } from "@/components/img";

import { useMemo, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

type Item = { id: number; name: string; description: string; price: number; image: string; tags: string[]; isAvailable: boolean; isSignature: boolean };
type Cat = { name: string; items: Item[] };
const TAGS: Record<string, [string, string]> = {
  popular: ["محبوب", "badge-secondary"],
  new: ["جدید", "badge-info"],
  veg: ["گیاهی", "badge-success"],
  spicy: ["تند", "badge-error"],
  local: ["محلی", "badge-warning"],
  chef: ["پیشنهاد سرآشپز", "badge-primary"],
};

export function MenuBrowser({ categories }: { categories: Cat[] }) {
  const [active, setActive] = useState("all");
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const term = q.trim();
    return categories
      .filter((c) => active === "all" || c.name === active)
      .map((c) => ({ ...c, items: c.items.filter((i) => !term || i.name.includes(term) || i.description.includes(term)) }))
      .filter((c) => c.items.length);
  }, [categories, active, q]);

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div role="tablist" className="tabs tabs-box no-scrollbar flex-nowrap overflow-x-auto bg-base-100 shadow-sm">
          <button role="tab" type="button" onClick={() => setActive("all")} className={cn("tab whitespace-nowrap", active === "all" && "tab-active !text-primary font-bold")}>همه</button>
          {categories.map((c) => (
            <button key={c.name} role="tab" type="button" onClick={() => setActive(c.name)} className={cn("tab whitespace-nowrap", active === c.name && "tab-active !text-primary font-bold")}>{c.name}</button>
          ))}
        </div>
        <label className="input w-full md:w-64">
          <Search className="h-4 w-4 opacity-50" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو در منو" className="grow" />
        </label>
      </div>
      {list.length === 0 ? (
        <p className="rounded-box bg-base-100 p-10 text-center text-sm text-base-content/50">موردی پیدا نشد.</p>
      ) : (
        <div className="space-y-10">
          {list.map((c) => (
            <section key={c.name}>
              <h3 className="mb-4 flex items-center gap-3 text-xl font-black text-brand-900"><span className="h-6 w-1.5 rounded-full bg-gold-400" />{c.name}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {c.items.map((i) => (
                  <article key={i.id} className={cn("tpl-card flex gap-4 rounded-box bg-base-100 p-3 ring-1 ring-base-300 transition hover:shadow-md", !i.isAvailable && "opacity-50")}>
                    {i.image && (
                      <Img src={i.image} alt={i.name} className="h-24 w-24 shrink-0 rounded-field object-cover" loading="lazy" />
                    )}
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-bold text-brand-900">
                          {i.isSignature && <Sparkles className="ml-1 inline h-4 w-4 text-gold-500" />}
                          {i.name}
                        </h4>
                        <span className="shrink-0 font-black text-brand-700">{i.price > 0 ? formatPrice(i.price) : "—"}</span>
                      </div>
                      {i.description && <p className="mt-1 text-sm leading-6 text-base-content/60">{i.description}</p>}
                      <div className="mt-auto flex flex-wrap gap-1 pt-2">
                        {!i.isAvailable && <span className="badge badge-ghost badge-sm">ناموجود</span>}
                        {i.tags.map((t) => TAGS[t] && <span key={t} className={cn("badge badge-soft badge-sm", TAGS[t][1])}>{TAGS[t][0]}</span>)}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
          <p className="text-xs text-base-content/50">قیمت‌ها به تومان است و ممکن است بدون اطلاع قبلی تغییر کند.</p>
        </div>
      )}
    </div>
  );
}
