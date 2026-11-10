"use client";

import { useState } from "react";
import { BedDouble, ScrollText, Waves, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function RulesTabs({ groups }: { groups: { key: string; title: string; kind: "room" | "service"; rules: string[] }[] }) {
  const list = groups.filter((g) => g.rules.length > 0);
  const [active, setActive] = useState(list[0]?.key ?? "");
  const current = list.find((g) => g.key === active) ?? list[0];
  if (!current) return null;
  return (
    <div id="rules" className="card card-border bg-base-100 shadow-sm scroll-mt-28 overflow-hidden block">
      <div className="flex items-center gap-2 border-b border-slate-100 p-5">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600"><ScrollText className="h-5 w-5" /></span>
        <h3 className="font-extrabold text-slate-900">قوانین و مقررات</h3>
      </div>
      {list.length > 1 && (
        <div role="tablist" className="tabs tabs-box no-scrollbar mx-4 mt-4 flex-nowrap overflow-x-auto bg-base-200">
          {list.map((g) => (
            <button
              type="button"
              role="tab"
              key={g.key}
              onClick={() => setActive(g.key)}
              className={cn(
                "tab flex-1 gap-1.5 whitespace-nowrap text-xs font-semibold",
                current.key === g.key && "tab-active !text-primary",
              )}
            >
              {g.kind === "room" ? <BedDouble className="h-3.5 w-3.5" /> : <Waves className="h-3.5 w-3.5" />}
              {g.title}
            </button>
          ))}
        </div>
      )}
      <ul key={current.key} className="max-h-[420px] animate-fade-up space-y-3 overflow-y-auto p-5">
        {current.rules.map((r, i) => (
          <li key={i} className="flex gap-3 text-sm leading-7 text-slate-600">
            <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-brand-600" />
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}
