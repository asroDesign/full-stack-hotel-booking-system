"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionCard({
  title,
  desc,
  icon,
  visible,
  onToggleVisible,
  defaultOpen = false,
  children,
}: {
  title: string;
  desc?: string;
  icon?: ReactNode;
  visible?: boolean;
  onToggleVisible?: (v: boolean) => void;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={cn("card card-border bg-base-100 shadow-sm overflow-hidden transition block", visible === false && "opacity-70")}>
      <div className="flex items-center gap-3 p-4">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex flex-1 items-center gap-3 text-right">
          {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">{icon}</span>}
          <div className="min-w-0 flex-1">
            <div className="font-extrabold text-slate-900">{title}</div>
            {desc && <div className="truncate text-xs text-slate-500">{desc}</div>}
          </div>
          <ChevronDown className={cn("h-5 w-5 text-slate-400 transition", open && "rotate-180")} />
        </button>
        {onToggleVisible && (
          <button
            type="button"
            onClick={() => onToggleVisible(!visible)}
            className={cn("btn btn-sm btn-soft", visible ? "btn-success" : "")}
          >
            {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {visible ? "نمایش" : "مخفی"}
          </button>
        )}
      </div>
      {open && <div className="animate-fade-up space-y-4 border-t border-slate-100 p-5">{children}</div>}
    </section>
  );
}

export function TextField({
  label,
  value,
  onChange,
  area,
  rows = 3,
  hint,
  ltr,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  area?: boolean;
  rows?: number;
  hint?: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {area ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="textarea w-full" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} dir={ltr ? "ltr" : undefined} className={cn("input w-full", ltr && "text-left")} />
      )}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

export function Switch({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-box bg-base-200 px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-base-content/50">{hint}</span>}
      </span>
      <input type="checkbox" className="toggle toggle-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
