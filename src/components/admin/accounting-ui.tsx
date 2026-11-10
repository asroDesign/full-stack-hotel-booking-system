"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Download, Printer, Plus, Trash2, Pencil, FolderTree, ArrowDownCircle, ArrowUpCircle, FileText, Scale } from "lucide-react";
import { deleteAccount, deleteVoucher, saveAccount, saveManualVoucher, saveQuickEntry } from "@/app/actions/accounting";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { Modal, Toast } from "./ui";
import { cn, faNum, formatPrice, isoToJalali, jalaliToISO, todayISO } from "@/lib/utils";

export type AccRow = { id: number; code: string; name: string; level: number; type: string; parentId: number | null; isSystem: boolean; isActive: boolean };

const tabs = [
  { href: "/admin/accounting", label: "داشبورد مالی" },
  { href: "/admin/accounting/entry", label: "ثبت درآمد، هزینه و سند" },
  { href: "/admin/accounting/journal", label: "دفتر روزنامه" },
  { href: "/admin/accounting/ledger", label: "دفتر کل / معین" },
  { href: "/admin/accounting/trial-balance", label: "تراز آزمایشی" },
  { href: "/admin/accounting/profit-loss", label: "سود و زیان" },
  { href: "/admin/accounting/accounts", label: "سرفصل حساب‌ها" },
];

export function AccountingTabs() {
  const pathname = usePathname();
  return (
    <div role="tablist" className="tabs tabs-box no-scrollbar mb-6 flex-nowrap overflow-x-auto bg-base-100 shadow-sm print:hidden">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} role="tab" className={cn("tab whitespace-nowrap", (t.href === "/admin/accounting" ? pathname === t.href : pathname.startsWith(t.href)) && "tab-active !text-primary font-bold")}>
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function ReportToolbar({ from, to, exportHref, children }: { from: string; to: string; exportHref?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const push = (patch: Record<string, string>) => {
    const q = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => q.set(k, v));
    router.push(`${pathname}?${q}`);
  };
  const t = isoToJalali(todayISO());
  const presets = [
    { l: "ماه جاری", f: jalaliToISO(t.jy, t.jm, 1), t: todayISO() },
    { l: "ماه قبل", f: t.jm === 1 ? jalaliToISO(t.jy - 1, 12, 1) : jalaliToISO(t.jy, t.jm - 1, 1), t: (() => { const d = new Date(jalaliToISO(t.jy, t.jm, 1) + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })() },
    { l: "سال جاری", f: jalaliToISO(t.jy, 1, 1), t: todayISO() },
  ];
  return (
    <div className="card card-border mb-4 bg-base-100 shadow-sm print:hidden">
      <div className="card-body flex-row flex-wrap items-end gap-3 p-4">
        <div className="w-48"><JalaliDatePicker name="from" label="از تاریخ" value={from} onChange={(v) => push({ from: v })} /></div>
        <div className="w-48"><JalaliDatePicker name="to" label="تا تاریخ" value={to} onChange={(v) => push({ to: v })} /></div>
        <div className="join">
          {presets.map((p) => (
            <button key={p.l} type="button" onClick={() => push({ from: p.f, to: p.t })} className={cn("btn join-item btn-sm", from === p.f && to === p.t && "btn-primary")}>{p.l}</button>
          ))}
        </div>
        {children}
        <div className="flex-1" />
        {exportHref && <a href={exportHref} className="btn btn-sm btn-soft btn-success"><Download className="h-4 w-4" /> خروجی Excel (CSV)</a>}
        <button type="button" onClick={() => window.print()} className="btn btn-sm"><Printer className="h-4 w-4" /> چاپ / PDF</button>
      </div>
    </div>
  );
}

export function LevelSelect({ level }: { level: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <div className="join">
      {[[1, "کل"], [2, "معین"], [3, "تفصیلی"]].map(([v, l]) => (
        <button
          key={v}
          type="button"
          onClick={() => { const q = new URLSearchParams(sp.toString()); q.set("level", String(v)); router.push(`${pathname}?${q}`); }}
          className={cn("btn join-item btn-sm", level === v && "btn-secondary")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function AccountPicker({ accounts, value }: { accounts: AccRow[]; value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <select
      className="select select-sm w-72"
      value={value || ""}
      onChange={(e) => { const q = new URLSearchParams(sp.toString()); q.set("account", e.target.value); router.push(`${pathname}?${q}`); }}
    >
      <option value="">انتخاب حساب…</option>
      {accounts.map((a) => (
        <option key={a.id} value={a.id}>{"\u00a0\u00a0".repeat(a.level - 1)}{a.code} - {a.name}</option>
      ))}
    </select>
  );
}

function groupLeafs(accounts: AccRow[], filter?: (a: AccRow) => boolean) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const leafs = accounts.filter((a) => a.level === 3 && a.isActive && (!filter || filter(a)));
  const groups = new Map<string, AccRow[]>();
  for (const l of leafs) {
    const p = l.parentId ? byId.get(l.parentId) : undefined;
    const key = p ? `${p.code} - ${p.name}` : "سایر";
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  return Array.from(groups.entries());
}

function LeafSelect({ accounts, value, onChange, filter, className }: { accounts: AccRow[]; value: number; onChange: (v: number) => void; filter?: (a: AccRow) => boolean; className?: string }) {
  const groups = useMemo(() => groupLeafs(accounts, filter), [accounts, filter]);
  return (
    <select className={cn("select w-full", className)} value={value || ""} onChange={(e) => onChange(Number(e.target.value))}>
      <option value="">انتخاب حساب تفصیلی…</option>
      {groups.map(([g, list]) => (
        <optgroup key={g} label={g}>
          {list.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

const isMoney = (a: AccRow) => a.code.startsWith("11");

export function QuickEntryForm({ accounts }: { accounts: AccRow[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(todayISO());
  const [acc, setAcc] = useState(0);
  const [money, setMoney] = useState(accounts.find((a) => a.code === "110101")?.id ?? 0);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const typeFilter = useMemo(() => (a: AccRow) => a.type === (kind === "income" ? "revenue" : "expense"), [kind]);

  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <h3 className="font-extrabold">ثبت سریع درآمد یا هزینه</h3>
        <div className="join w-full">
          <button type="button" onClick={() => { setKind("income"); setAcc(0); }} className={cn("btn join-item flex-1", kind === "income" ? "btn-success" : "btn-ghost border-base-300")}><ArrowDownCircle className="h-4 w-4" /> درآمد</button>
          <button type="button" onClick={() => { setKind("expense"); setAcc(0); }} className={cn("btn join-item flex-1", kind === "expense" ? "btn-error" : "btn-ghost border-base-300")}><ArrowUpCircle className="h-4 w-4" /> هزینه</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">{kind === "income" ? "حساب درآمد" : "حساب هزینه"}</label><LeafSelect accounts={accounts} value={acc} onChange={setAcc} filter={typeFilter} /></div>
          <div><label className="field-label">{kind === "income" ? "واریز به" : "پرداخت از"}</label><LeafSelect accounts={accounts} value={money} onChange={setMoney} filter={isMoney} /></div>
          <div>
            <label className="field-label">مبلغ (تومان)</label>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-full" />
            {Number(amount) > 0 && <p className="mt-1 text-xs text-base-content/50">{formatPrice(Number(amount))} تومان</p>}
          </div>
          <JalaliDatePicker name="date" label="تاریخ" value={date} onChange={setDate} />
        </div>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input w-full" placeholder="شرح (مثلاً قبض برق خرداد)" />
        <button
          type="button"
          disabled={pending || !acc || !money || !(Number(amount) > 0)}
          onClick={() => start(async () => {
            const r = await saveQuickEntry({ kind, date, accountId: acc, moneyAccountId: money, amount: Number(amount), description: desc });
            setToast({ msg: r.message, tone: r.ok ? "success" : "error" });
            if (r.ok) { setAmount(""); setDesc(""); router.refresh(); }
          })}
          className={cn("btn btn-block", kind === "income" ? "btn-success" : "btn-error")}
        >
          {pending && <span className="loading loading-spinner loading-sm" />} ثبت {kind === "income" ? "درآمد" : "هزینه"}
        </button>
        <p className="text-xs text-base-content/50">سند دوطرفه به‌صورت خودکار ساخته می‌شود ({kind === "income" ? "بدهکار: صندوق/بانک — بستانکار: حساب درآمد" : "بدهکار: حساب هزینه — بستانکار: صندوق/بانک"}).</p>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

type Line = { accountId: number; debit: string; credit: string; description: string };
const emptyLine = (): Line => ({ accountId: 0, debit: "", credit: "", description: "" });

export function ManualVoucherForm({ accounts }: { accounts: AccRow[] }) {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const td = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const tc = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const balanced = td > 0 && td === tc;
  const upd = (i: number, p: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));

  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-5">
        <h3 className="flex items-center gap-2 font-extrabold"><FileText className="h-5 w-5 text-primary" /> سند حسابداری دستی</h3>
        <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
          <JalaliDatePicker name="date" label="تاریخ سند" value={date} onChange={setDate} />
          <div><label className="field-label">شرح سند</label><input value={desc} onChange={(e) => setDesc(e.target.value)} className="input w-full" placeholder="مثلاً واریز سرمایه اولیه" /></div>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm min-w-[760px]">
            <thead>
              <tr><th className="w-8">#</th><th>حساب تفصیلی</th><th>شرح ردیف</th><th className="w-36">بدهکار</th><th className="w-36">بستانکار</th><th className="w-10" /></tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>{faNum(i + 1)}</td>
                  <td><LeafSelect accounts={accounts} value={l.accountId} onChange={(v) => upd(i, { accountId: v })} className="select-sm" /></td>
                  <td><input value={l.description} onChange={(e) => upd(i, { description: e.target.value })} className="input input-sm w-full" /></td>
                  <td><input type="number" min={0} value={l.debit} onChange={(e) => upd(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })} className="input input-sm w-full" /></td>
                  <td><input type="number" min={0} value={l.credit} onChange={(e) => upd(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })} className="input input-sm w-full" /></td>
                  <td><button type="button" disabled={lines.length <= 2} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} className="btn btn-square btn-ghost btn-xs text-error"><Trash2 className="h-3.5 w-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm">
                <td colSpan={3}><button type="button" onClick={() => setLines((ls) => [...ls, emptyLine()])} className="btn btn-xs"><Plus className="h-3.5 w-3.5" /> ردیف جدید</button></td>
                <td className="font-bold">{formatPrice(td)}</td>
                <td className="font-bold">{formatPrice(tc)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn("badge gap-1", balanced ? "badge-success" : "badge-warning")}>
            <Scale className="h-3.5 w-3.5" /> {balanced ? "سند تراز است" : `اختلاف: ${formatPrice(Math.abs(td - tc))}`}
          </span>
          <div className="flex-1" />
          <button
            type="button"
            disabled={pending || !balanced || !desc}
            onClick={() => start(async () => {
              const r = await saveManualVoucher({ date, description: desc, lines: lines.map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description })) });
              setToast({ msg: r.message, tone: r.ok ? "success" : "error" });
              if (r.ok) { setDesc(""); setLines([emptyLine(), emptyLine()]); router.refresh(); }
            })}
            className="btn btn-primary"
          >
            {pending && <span className="loading loading-spinner loading-sm" />} ثبت سند
          </button>
        </div>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

export function DeleteVoucherButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => { if (confirm(`سند ${id} حذف شود؟`)) start(async () => { const r = await deleteVoucher(id); setToast({ msg: r.message, tone: r.ok ? "success" : "error" }); if (r.ok) router.refresh(); }); }}
        className="btn btn-ghost btn-xs text-error print:hidden"
      >
        {pending ? <span className="loading loading-spinner loading-xs" /> : <Trash2 className="h-3.5 w-3.5" />}
      </button>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </>
  );
}

const TYPE_LABEL: Record<string, string> = { asset: "دارایی", liability: "بدهی", equity: "سرمایه", revenue: "درآمد", expense: "هزینه" };
const TYPE_BADGE: Record<string, string> = { asset: "badge-info", liability: "badge-warning", equity: "badge-secondary", revenue: "badge-success", expense: "badge-error" };

export function AccountsTree({ accounts }: { accounts: AccRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const [modal, setModal] = useState<{ mode: "new" | "edit"; parent?: AccRow; acc?: AccRow } | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [active, setActive] = useState(true);

  const open = (m: NonNullable<typeof modal>) => {
    setModal(m);
    if (m.mode === "edit" && m.acc) {
      setCode(m.acc.code); setName(m.acc.name); setActive(m.acc.isActive);
    } else {
      const siblings = accounts.filter((a) => a.parentId === (m.parent?.id ?? null));
      const digits = m.parent ? (m.parent.level === 1 ? 2 : 2) : 2;
      const prefix = m.parent?.code ?? "";
      const nums = siblings.map((s) => Number(s.code.slice(prefix.length)) || 0);
      const nextNum = (nums.length ? Math.max(...nums) : 0) + 1;
      setCode(prefix + String(nextNum).padStart(digits, "0"));
      setName(""); setActive(true); setType(m.parent?.type ?? "expense");
    }
  };
  const run = (p: Promise<{ ok: boolean; message: string }>, close = false) =>
    start(async () => {
      const r = await p;
      setToast({ msg: r.message, tone: r.ok ? "success" : "error" });
      if (r.ok) { if (close) setModal(null); router.refresh(); }
    });

  return (
    <div className="card card-border bg-base-100 shadow-sm">
      <div className="card-body gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-extrabold"><FolderTree className="h-5 w-5 text-primary" /> سرفصل حساب‌ها (کل / معین / تفصیلی)</h3>
          <button type="button" onClick={() => open({ mode: "new" })} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> حساب کل جدید</button>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-sm">
            <thead><tr><th>کد</th><th>نام حساب</th><th>سطح</th><th>ماهیت</th><th className="text-left">عملیات</th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id} className={cn(a.level === 1 && "bg-base-200/70 font-bold", !a.isActive && "opacity-50")}>
                  <td className="font-mono" dir="ltr">{a.code}</td>
                  <td style={{ paddingRight: `${(a.level - 1) * 1.5 + 0.75}rem` }}>{a.level > 1 && <span className="text-base-content/30">└ </span>}{a.name}{!a.isActive && <span className="badge badge-ghost badge-xs mr-2">غیرفعال</span>}</td>
                  <td><span className="badge badge-sm badge-outline">{["", "کل", "معین", "تفصیلی"][a.level]}</span></td>
                  <td><span className={cn("badge badge-sm badge-soft", TYPE_BADGE[a.type])}>{TYPE_LABEL[a.type]}</span></td>
                  <td>
                    <div className="flex justify-end gap-1">
                      {a.level < 3 && <button type="button" onClick={() => open({ mode: "new", parent: a })} className="btn btn-ghost btn-xs" title="افزودن زیرحساب"><Plus className="h-3.5 w-3.5" /> زیرحساب</button>}
                      <button type="button" onClick={() => open({ mode: "edit", acc: a })} className="btn btn-ghost btn-xs btn-square"><Pencil className="h-3.5 w-3.5" /></button>
                      {!a.isSystem && <button type="button" onClick={() => { if (confirm(`حساب «${a.name}» حذف شود؟`)) run(deleteAccount(a.id)); }} className="btn btn-ghost btn-xs btn-square text-error"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === "edit" ? "ویرایش حساب" : modal?.parent ? `زیرحساب جدید برای «${modal.parent.name}»` : "حساب کل جدید"}>
        <div className="space-y-4">
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <div><label className="field-label">کد حساب</label><input value={code} onChange={(e) => setCode(e.target.value)} disabled={modal?.mode === "edit" && modal.acc?.isSystem} dir="ltr" className="input w-full font-mono" /></div>
            <div><label className="field-label">نام حساب</label><input value={name} onChange={(e) => setName(e.target.value)} className="input w-full" /></div>
          </div>
          {modal?.mode === "new" && !modal.parent && (
            <div><label className="field-label">ماهیت</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className="select w-full">
                {Object.entries(TYPE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          )}
          {modal?.mode === "edit" && (
            <label className="flex cursor-pointer items-center justify-between rounded-box bg-base-200 px-4 py-3 text-sm">حساب فعال است<input type="checkbox" className="toggle toggle-primary" checked={active} onChange={(e) => setActive(e.target.checked)} /></label>
          )}
          <button
            type="button"
            disabled={pending || !code || !name}
            onClick={() => run(saveAccount({ id: modal?.mode === "edit" ? modal.acc?.id : undefined, parentId: modal?.parent?.id ?? null, code, name, type: type as AccRow["type"] as never, isActive: active }), true)}
            className="btn btn-primary btn-block"
          >
            {pending && <span className="loading loading-spinner loading-sm" />} ذخیره
          </button>
        </div>
      </Modal>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}
