"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Download, Printer, Plus, Trash2, Pencil, FolderTree, ArrowDownCircle, ArrowUpCircle, FileText, Scale } from "lucide-react";
import { deleteAccount, deleteVoucher, recordGatewaySettlement, reverseVoucher, saveEditedVoucher, saveAccount, saveCostCenter, setCostCenterActive, saveManualVoucher, saveQuickEntry } from "@/app/actions/accounting";
import { JalaliDatePicker } from "@/components/jalali-date-picker";
import { Modal, Toast } from "./ui";
import { cn, faNum, formatPrice, isoToJalali, jalaliToISO, todayISO } from "@/lib/utils";

export type AccRow = { id: number; code: string; name: string; level: number; type: string; parentId: number | null; isSystem: boolean; isActive: boolean };
export type CostCenterOption = { id: number; code: string; name: string; isActive: boolean };

const tabs = [
  { href: "/admin/accounting", label: "داشبورد مالی" },
  { href: "/admin/accounting/entry", label: "ثبت درآمد، هزینه و سند" },
  { href: "/admin/accounting/gateway-settlements", label: "تسویه درگاه" },
  { href: "/admin/accounting/journal", label: "دفتر روزنامه" },
  { href: "/admin/accounting/ledger", label: "دفتر کل / معین" },
  { href: "/admin/accounting/detail-report", label: "گزارش تفصیلی" },
  { href: "/admin/accounting/trial-balance", label: "تراز آزمایشی" },
  { href: "/admin/accounting/profit-loss", label: "سود و زیان" },
  { href: "/admin/accounting/balance-sheet", label: "ترازنامه" },
  { href: "/admin/accounting/receivables-payables", label: "دریافتنی / پرداختنی" },
  { href: "/admin/accounting/vendor-accounts", label: "حساب فروشندگان" },
  { href: "/admin/accounting/cost-centers", label: "مراکز هزینه" },
  { href: "/admin/accounting/cost-accounting", label: "هزینه‌یابی" },
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

export function CostCenterManager({ centers }: { centers: CostCenterOption[] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const run = (operation: () => Promise<{ ok: boolean; message: string }>) => start(async () => {
    const result = await operation();
    setToast({ msg: result.message, tone: result.ok ? "success" : "error" });
    if (result.ok) router.refresh();
  });
  return <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
    <form className="card card-border bg-base-100 shadow-sm" onSubmit={(event) => { event.preventDefault(); run(() => saveCostCenter({ code, name })); }}>
      <div className="card-body gap-3 p-5"><h2 className="font-extrabold">تعریف مرکز هزینه</h2><p className="text-xs text-base-content/55">مرکز هزینه را روی ردیف‌های بدهکار حساب هزینه انتخاب کنید تا گزارش هزینه بر اساس بخش عملیاتی آماده شود.</p>
        <label className="form-control"><span className="field-label">کد</span><input className="input" value={code} onChange={(event) => setCode(event.target.value)} maxLength={24} required /></label>
        <label className="form-control"><span className="field-label">نام مرکز</span><input className="input" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /></label>
        <button disabled={pending} className="btn btn-primary self-start">{pending && <span className="loading loading-spinner loading-sm" />}ثبت مرکز هزینه</button>
      </div>
    </form>
    <section className="card card-border bg-base-100 shadow-sm"><div className="card-body p-4 md:p-5"><h2 className="mb-2 font-extrabold">فهرست مراکز هزینه</h2>{centers.length ? <div className="overflow-x-auto"><table className="table table-sm"><thead><tr><th>کد</th><th>نام مرکز</th><th>وضعیت</th><th /></tr></thead><tbody>{centers.map((center) => <tr key={center.id}><td className="font-mono" dir="ltr">{center.code}</td><td>{center.name}</td><td><span className={center.isActive ? "badge badge-success" : "badge badge-ghost"}>{center.isActive ? "فعال" : "غیرفعال"}</span></td><td><button type="button" disabled={pending} onClick={() => run(() => setCostCenterActive(center.id, !center.isActive))} className="btn btn-xs btn-outline">{center.isActive ? "غیرفعال‌کردن" : "فعال‌کردن"}</button></td></tr>)}</tbody></table></div> : <p className="py-8 text-center text-sm text-base-content/50">مرکزی تعریف نشده است.</p>}</div></section>
    <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
  </div>;
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


export function JournalFilters({ source, query }: { source: string; query: string }) {
  const router = useRouter();
  const search = useSearchParams();
  return (
    <form className="card card-border mb-4 bg-base-100 shadow-sm print:hidden" onSubmit={(event) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      const params = new URLSearchParams(search.toString());
      const nextSource = String(data.get("source") ?? "all");
      const nextQuery = String(data.get("q") ?? "").trim();
      if (nextSource === "all") params.delete("source"); else params.set("source", nextSource);
      if (nextQuery) params.set("q", nextQuery); else params.delete("q");
      router.push(`/admin/accounting/journal?${params.toString()}`);
    }}>
      <div className="card-body flex-row flex-wrap items-end gap-3 p-4">
        <label className="form-control"><span className="field-label">نوع سند</span><select className="select select-sm" name="source" defaultValue={source}><option value="all">همه اسناد</option><option value="reservation">رزرو</option><option value="income">درآمد</option><option value="expense">هزینه</option><option value="manual">دستی</option><option value="payroll">حقوق و بیمه</option></select></label>
        <label className="form-control min-w-60 flex-1"><span className="field-label">جست‌وجو در شرح</span><input className="input input-sm" name="q" defaultValue={query} maxLength={60} placeholder="شماره سند یا شرح سند" /></label>
        <button className="btn btn-sm btn-primary">اعمال فیلتر</button>
      </div>
    </form>
  );
}

export function AsOfToolbar({ date, children }: { date: string; children?: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  return <div className="card card-border mb-4 bg-base-100 shadow-sm print:hidden"><div className="card-body flex-row flex-wrap items-end gap-3 p-4">
    <div className="w-48"><JalaliDatePicker name="to" label="مانده تا تاریخ" value={date} onChange={(value) => { const params = new URLSearchParams(search.toString()); params.set("to", value); router.push(`${pathname}?${params.toString()}`); }} /></div>
    {children}<div className="flex-1" /><button type="button" onClick={() => window.print()} className="btn btn-sm"><Printer className="h-4 w-4" /> چاپ / PDF</button>
  </div></div>;
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

export function QuickEntryForm({ accounts, costCenters }: { accounts: AccRow[]; costCenters: CostCenterOption[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(todayISO());
  const [acc, setAcc] = useState(0);
  const [money, setMoney] = useState(accounts.find((a) => a.code === "110101")?.id ?? 0);
  const [costCenterId, setCostCenterId] = useState(0);
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
          <button type="button" onClick={() => { setKind("income"); setAcc(0); setCostCenterId(0); }} className={cn("btn join-item flex-1", kind === "income" ? "btn-success" : "btn-ghost border-base-300")}><ArrowDownCircle className="h-4 w-4" /> درآمد</button>
          <button type="button" onClick={() => { setKind("expense"); setAcc(0); }} className={cn("btn join-item flex-1", kind === "expense" ? "btn-error" : "btn-ghost border-base-300")}><ArrowUpCircle className="h-4 w-4" /> هزینه</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="field-label">{kind === "income" ? "حساب درآمد" : "حساب هزینه"}</label><LeafSelect accounts={accounts} value={acc} onChange={setAcc} filter={typeFilter} /></div>
          <div><label className="field-label">{kind === "income" ? "واریز به" : "پرداخت از"}</label><LeafSelect accounts={accounts} value={money} onChange={setMoney} filter={isMoney} /></div>
          {kind === "expense" && <label className="form-control"><span className="field-label">مرکز هزینه (اختیاری)</span><select className="select" value={costCenterId} onChange={(event) => setCostCenterId(Number(event.target.value))}><option value={0}>بدون مرکز هزینه</option>{costCenters.map((center) => <option key={center.id} value={center.id}>{center.code} · {center.name}</option>)}</select></label>}
          <div><label className="field-label">مبلغ (تومان)</label><input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-full" />{Number(amount) > 0 && <p className="mt-1 text-xs text-base-content/50">{formatPrice(Number(amount))} تومان</p>}</div>
          <JalaliDatePicker name="date" label="تاریخ" value={date} onChange={setDate} />
        </div>
        <input value={desc} onChange={(e) => setDesc(e.target.value)} className="input w-full" placeholder="شرح (مثلاً قبض برق خرداد)" />
        <button type="button" disabled={pending || !acc || !money || !(Number(amount) > 0)} onClick={() => start(async () => {
          const result = await saveQuickEntry({ kind, date, accountId: acc, moneyAccountId: money, amount: Number(amount), description: desc, costCenterId: kind === "expense" ? costCenterId || undefined : undefined });
          setToast({ msg: result.message, tone: result.ok ? "success" : "error" });
          if (result.ok) { setAmount(""); setDesc(""); router.refresh(); }
        })} className={cn("btn btn-block", kind === "income" ? "btn-success" : "btn-error")}>
          {pending && <span className="loading loading-spinner loading-sm" />} ثبت {kind === "income" ? "درآمد" : "هزینه"}
        </button>
        <p className="text-xs text-base-content/50">سند دوطرفه به‌صورت خودکار ساخته می‌شود. برای هزینه می‌توانید مرکز هزینه را هم ثبت کنید.</p>
      </div>
      <Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} />
    </div>
  );
}

type Line = { accountId: number; costCenterId: number; debit: string; credit: string; description: string };
const emptyLine = (): Line => ({ accountId: 0, costCenterId: 0, debit: "", credit: "", description: "" });

export function ManualVoucherForm({ accounts, costCenters }: { accounts: AccRow[]; costCenters: CostCenterOption[] }) {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [desc, setDesc] = useState("");
  const [lines, setLines] = useState<Line[]>([emptyLine(), emptyLine()]);
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const td = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const tc = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  const balanced = td > 0 && td === tc;
  const update = (index: number, patch: Partial<Line>) => setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));

  return <div className="card card-border bg-base-100 shadow-sm"><div className="card-body gap-4 p-5">
    <h3 className="flex items-center gap-2 font-extrabold"><FileText className="h-5 w-5 text-primary" /> سند حسابداری دستی</h3>
    <div className="grid gap-3 sm:grid-cols-[200px_1fr]"><JalaliDatePicker name="date" label="تاریخ سند" value={date} onChange={setDate} /><div><label className="field-label">شرح سند</label><input value={desc} onChange={(event) => setDesc(event.target.value)} className="input w-full" placeholder="مثلاً واریز سرمایه اولیه" /></div></div>
    <div className="overflow-x-auto"><table className="table table-sm min-w-[960px]">
      <thead><tr><th>#</th><th>حساب تفصیلی</th><th>مرکز هزینه</th><th>شرح ردیف</th><th>بدهکار</th><th>بستانکار</th><th /></tr></thead>
      <tbody>{lines.map((line, index) => <tr key={index}>
        <td>{faNum(index + 1)}</td>
        <td><LeafSelect accounts={accounts} value={line.accountId} onChange={(value) => { const account = accounts.find((row) => row.id === value); update(index, { accountId: value, costCenterId: account?.type === "expense" ? line.costCenterId : 0 }); }} className="select-sm" /></td>
        <td><select className="select select-sm w-44" disabled={accounts.find((row) => row.id === line.accountId)?.type !== "expense"} value={line.costCenterId} onChange={(event) => update(index, { costCenterId: Number(event.target.value) })}><option value={0}>بدون مرکز</option>{costCenters.map((center) => <option key={center.id} value={center.id}>{center.code} · {center.name}</option>)}</select></td>
        <td><input value={line.description} onChange={(event) => update(index, { description: event.target.value })} className="input input-sm w-full" /></td>
        <td><input type="number" min={0} value={line.debit} onChange={(event) => update(index, { debit: event.target.value, credit: event.target.value ? "" : line.credit })} className="input input-sm w-32" /></td>
        <td><input type="number" min={0} value={line.credit} onChange={(event) => update(index, { credit: event.target.value, debit: event.target.value ? "" : line.debit })} className="input input-sm w-32" /></td>
        <td><button type="button" disabled={lines.length <= 2} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} className="btn btn-square btn-ghost btn-xs text-error"><Trash2 className="h-3.5 w-3.5" /></button></td>
      </tr>)}</tbody>
      <tfoot><tr className="text-sm"><td colSpan={4}><button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} className="btn btn-xs"><Plus className="h-3.5 w-3.5" /> ردیف جدید</button></td><td className="font-bold">{formatPrice(td)}</td><td className="font-bold">{formatPrice(tc)}</td><td /></tr></tfoot>
    </table></div>
    <div className="flex flex-wrap items-center gap-3"><span className={cn("badge gap-1", balanced ? "badge-success" : "badge-warning")}><Scale className="h-3.5 w-3.5" /> {balanced ? "سند تراز است" : `اختلاف: ${formatPrice(Math.abs(td - tc))}`}</span><div className="flex-1" /><button type="button" disabled={pending || !balanced || !desc} onClick={() => start(async () => {
      const result = await saveManualVoucher({ date, description: desc, lines: lines.map((line) => ({ accountId: line.accountId, debit: Number(line.debit) || 0, credit: Number(line.credit) || 0, description: line.description, costCenterId: line.costCenterId || null })) });
      setToast({ msg: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) { setDesc(""); setLines([emptyLine(), emptyLine()]); router.refresh(); }
    })} className="btn btn-primary">{pending && <span className="loading loading-spinner loading-sm" />} ثبت سند</button></div>
  </div><Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} /></div>;
}

export function VoucherEditForm({ voucher, accounts, costCenters }: { voucher: { id: number; date: string; description: string; lines: { accountId: number; debit: number; credit: number; description: string; costCenterId: number | null }[] }; accounts: AccRow[]; costCenters: CostCenterOption[] }) {
  const router = useRouter();
  const [date, setDate] = useState(voucher.date);
  const [description, setDescription] = useState(voucher.description);
  const [lines, setLines] = useState(voucher.lines.map((line) => ({ ...line, costCenterId: line.costCenterId ?? 0, debit: String(line.debit), credit: String(line.credit) })));
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  const updateLine = (index: number, patch: Partial<(typeof lines)[number]>) => setLines((current) => current.map((line, i) => i === index ? { ...line, ...patch } : line));
  const totalDebit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
  return <details className="rounded-2xl border border-base-300 p-4 print:hidden"><summary className="cursor-pointer font-bold">ویرایش سند</summary><form className="mt-4 space-y-4" onSubmit={(event) => {
    event.preventDefault();
    start(async () => {
      const result = await saveEditedVoucher({ id: voucher.id, date, description, lines: lines.map((line) => ({ accountId: Number(line.accountId), debit: Number(line.debit), credit: Number(line.credit), description: line.description, costCenterId: Number(line.costCenterId) || null })) });
      setToast({ msg: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  }}><div className="grid gap-3 md:grid-cols-2"><JalaliDatePicker name="date" label="تاریخ سند" value={date} onChange={setDate} /><label className="form-control"><span className="field-label">شرح سند</span><input className="input" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} required /></label></div>
    <div className="space-y-2">{lines.map((line, index) => <div key={index} className="grid gap-2 rounded-xl bg-base-200/40 p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]">
      <select className="select select-sm" value={line.accountId} onChange={(event) => { const accountId = Number(event.target.value); const account = accounts.find((item) => item.id === accountId); updateLine(index, { accountId, costCenterId: account?.type === "expense" ? line.costCenterId : 0 }); }}>{accounts.filter((account) => account.level === 3 && account.isActive).map((account) => <option key={account.id} value={account.id}>{account.code} · {account.name}</option>)}</select>
      <select className="select select-sm" disabled={accounts.find((account) => account.id === line.accountId)?.type !== "expense"} value={line.costCenterId} onChange={(event) => updateLine(index, { costCenterId: Number(event.target.value) })}><option value={0}>بدون مرکز هزینه</option>{costCenters.map((center) => <option key={center.id} value={center.id}>{center.code} · {center.name}</option>)}</select>
      <input className="input input-sm" type="number" min="0" value={line.debit} placeholder="بدهکار" onChange={(event) => updateLine(index, { debit: event.target.value, credit: event.target.value ? "0" : line.credit })} />
      <input className="input input-sm" type="number" min="0" value={line.credit} placeholder="بستانکار" onChange={(event) => updateLine(index, { credit: event.target.value, debit: event.target.value ? "0" : line.debit })} />
      <input className="input input-sm" value={line.description} placeholder="شرح ردیف" maxLength={300} onChange={(event) => updateLine(index, { description: event.target.value })} />
      <button type="button" className="btn btn-sm btn-ghost text-error" disabled={lines.length <= 2} onClick={() => setLines((current) => current.filter((_, i) => i !== index))} aria-label="حذف ردیف">×</button>
    </div>)}</div>
    <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className="btn btn-sm btn-outline" disabled={lines.length >= 100} onClick={() => setLines((current) => [...current, { accountId: accounts.find((account) => account.level === 3 && account.isActive)?.id ?? 0, costCenterId: 0, debit: "0", credit: "0", description: "" }])}>افزودن ردیف</button><span className={totalDebit === totalCredit ? "text-sm font-bold text-success" : "text-sm font-bold text-error"}>بدهکار {formatPrice(totalDebit)} · بستانکار {formatPrice(totalCredit)}</span><button disabled={pending || totalDebit <= 0 || totalDebit !== totalCredit} className="btn btn-primary">ذخیره سند</button></div>
  </form><Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} /></details>;
}

export function GatewaySettlementForm() {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  return <form className="card card-border bg-base-100 shadow-sm" onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const grossAmount = Number(data.get("grossAmount"));
    const netAmount = Number(data.get("netAmount"));
    const feeAmount = Number(data.get("feeAmount"));
    start(async () => {
      const result = await recordGatewaySettlement({ date, provider: String(data.get("provider") ?? ""), reference: String(data.get("reference") ?? ""), grossAmount, netAmount, feeAmount });
      setToast({ msg: result.message, tone: result.ok ? "success" : "error" });
      if (result.ok) router.refresh();
    });
  }}><div className="card-body gap-3 p-4"><div><h3 className="font-extrabold">ثبت تسویه درگاه</h3><p className="mt-1 text-xs text-base-content/55">سند به‌صورت بدهکار بانک و کارمزد، بستانکار مانده درگاه ثبت می‌شود.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <JalaliDatePicker name="date" label="تاریخ واریز" value={date} onChange={setDate} />
    <label className="form-control"><span className="field-label">درگاه</span><select className="select" name="provider"><option value="zarinpal">زرین‌پال</option><option value="zibal">زیبال</option><option value="saman">سامان</option><option value="mellat">ملت</option><option value="other">سایر</option></select></label>
    <label className="form-control"><span className="field-label">شماره پیگیری / فایل تسویه</span><input className="input" name="reference" required maxLength={100} /></label>
    <label className="form-control"><span className="field-label">ناخالص تسویه (تومان)</span><input className="input" name="grossAmount" type="number" min="1" required /></label>
    <label className="form-control"><span className="field-label">واریزی خالص به بانک</span><input className="input" name="netAmount" type="number" min="0" required /></label>
    <label className="form-control"><span className="field-label">کارمزد درگاه</span><input className="input" name="feeAmount" type="number" min="0" required defaultValue="0" /></label>
  </div><button disabled={pending} className="btn btn-primary self-start">{pending && <span className="loading loading-spinner loading-sm" />}ثبت سند تسویه</button></div><Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} /></form>;
}

export function PrintButton({ label = "چاپ سند" }: { label?: string }) {
  return <button type="button" onClick={() => window.print()} className="btn btn-sm btn-primary"><Printer className="h-4 w-4" />{label}</button>;
}

export function ReverseVoucherButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [toast, setToast] = useState<{ msg: string; tone: "success" | "error" } | null>(null);
  return <><button type="button" disabled={pending} onClick={() => { if (confirm(`برای سند ${id} سند برگشتی ثبت شود؟`)) start(async () => { const result = await reverseVoucher(id); setToast({ msg: result.message, tone: result.ok ? "success" : "error" }); if (result.ok) router.refresh(); }); }} className="btn btn-sm btn-outline btn-warning">ثبت برگشت سند</button><Toast message={toast?.msg ?? null} tone={toast?.tone} onDone={() => setToast(null)} /></>;
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
