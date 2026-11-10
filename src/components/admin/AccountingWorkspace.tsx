"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatJalali, formatMoney, toFa, todayISO } from "@/lib/format";
import { ACCOUNT_LEVEL_LABELS, ACCOUNT_TYPE_LABELS } from "@/lib/accounting-constants";

type Account = { id: number; code: string; name: string; type: string; level: string; parentCode: string | null };
type JournalLine = { id: number; accountCode: string; accountName: string; debit: number; credit: number; description: string };
type JournalEntry = {
  id: number;
  number: number;
  date: string;
  description: string;
  reference: string;
  source: string;
  lines: JournalLine[];
};
type TrialRow = {
  accountId: number;
  code: string;
  name: string;
  type: string;
  level: string;
  debit: number;
  credit: number;
  balance: number;
  balanceLabel: string;
};
type ProfitLoss = {
  revenue: TrialRow[];
  expenses: TrialRow[];
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
};

const TABS = [
  { key: "journal", label: "دفتر روزنامه" },
  { key: "trial", label: "تراز آزمایشی" },
  { key: "pl", label: "سود و زیان" },
  { key: "accounts", label: "حساب‌ها (کل/معین/تفصیلی)" },
];

export default function AccountingWorkspace({
  accounts,
  entries,
  trial,
  profitLoss,
}: {
  accounts: Account[];
  entries: JournalEntry[];
  trial: TrialRow[];
  profitLoss: ProfitLoss;
}) {
  const router = useRouter();
  const [tab, setTab] = useState("journal");
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState([
    { accountId: "", debit: "", credit: "", description: "" },
    { accountId: "", debit: "", credit: "", description: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [newAccount, setNewAccount] = useState({ code: "", name: "", type: "expense", level: "detail", parentCode: "" });
  const [expanded, setExpanded] = useState<number | null>(null);

  const totals = useMemo(() => {
    const debit = lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const credit = lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    return { debit, credit, balanced: debit === credit && debit > 0 };
  }, [lines]);

  const detailAccounts = accounts.filter((account) => account.level === "detail");

  async function submitEntry(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (!totals.balanced) {
      setMessage({ type: "error", text: "جمع بدهکار و بستانکار باید برابر و بزرگ‌تر از صفر باشد." });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/accounting/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          description,
          reference,
          lines: lines
            .filter((line) => line.accountId && (line.debit || line.credit))
            .map((line) => ({
              accountId: Number(line.accountId),
              debit: Number(line.debit) || 0,
              credit: Number(line.credit) || 0,
              description: line.description,
            })),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: data.error ?? "ثبت سند انجام نشد." });
        return;
      }
      setMessage({ type: "ok", text: `سند شماره ${toFa(data.entry.number)} ثبت شد.` });
      setDescription("");
      setReference("");
      setLines([
        { accountId: "", debit: "", credit: "", description: "" },
        { accountId: "", debit: "", credit: "", description: "" },
      ]);
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "خطای شبکه." });
    } finally {
      setSaving(false);
    }
  }

  async function submitAccount(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch("/api/admin/accounting/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAccount),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage({ type: "error", text: data.error ?? "ثبت حساب انجام نشد." });
      return;
    }
    setMessage({ type: "ok", text: "حساب جدید ثبت شد." });
    setNewAccount({ code: "", name: "", type: "expense", level: "detail", parentCode: "" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div className={`alert ${message.type === "ok" ? "alert-success" : "alert-error"} py-2 text-[11px]`}>
          {message.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" className="tabs tabs-box w-fit max-w-full overflow-x-auto rounded-2xl border border-cream-200 bg-white p-1.5 shadow-soft">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`tab whitespace-nowrap rounded-xl px-3 py-2 text-[11px] font-semibold ${
                tab === item.key ? "tab-active bg-forest-900 text-white" : "text-forest-800/70"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { type: "journal", label: "خروجی دفتر روزنامه" },
            { type: "trial", label: "خروجی تراز آزمایشی" },
            { type: "pl", label: "خروجی سود و زیان" },
          ].map((item) => (
            <a
              key={item.type}
              href={`/api/admin/accounting/export?type=${item.type}`}
              className="rounded-lg border border-cream-300 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-forest-800 hover:bg-cream-50"
            >
              ⬇ {item.label}
            </a>
          ))}
        </div>
      </div>

      {tab === "journal" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr] xl:items-start">
          <form onSubmit={submitEntry} className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
            <h2 className="text-xs font-extrabold text-forest-950">ثبت سند دستی (هزینه / درآمد)</h2>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="field">
                <span className="label text-[10px]">تاریخ</span>
                <input type="date" className="input h-9 py-1 text-xs" value={date} onChange={(event) => setDate(event.target.value)} />
                <span className="hint">{formatJalali(date)}</span>
              </label>
              <label className="field">
                <span className="label text-[10px]">شرح سند</span>
                <input className="input h-9 py-1 text-xs" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="مثلاً خرید مواد غذایی" />
              </label>
            </div>
            <label className="field mt-2">
              <span className="label text-[10px]">مرجع (اختیاری)</span>
              <input className="input h-9 py-1 text-xs" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="شماره فاکتور" />
            </label>

            <div className="mt-3 space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="rounded-xl border border-cream-200 bg-cream-50/60 p-2">
                  <select
                    className="input h-8 py-0.5 text-[11px]"
                    value={line.accountId}
                    onChange={(event) =>
                      setLines((current) => current.map((item, i) => (i === index ? { ...item, accountId: event.target.value } : item)))
                    }
                  >
                    <option value="">انتخاب حساب…</option>
                    {detailAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} — {account.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                    <input
                      className="input h-8 py-0.5 text-[11px]"
                      placeholder="بدهکار"
                      value={line.debit}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, debit: event.target.value, credit: event.target.value ? "" : item.credit } : item,
                          ),
                        )
                      }
                    />
                    <input
                      className="input h-8 py-0.5 text-[11px]"
                      placeholder="بستانکار"
                      value={line.credit}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, credit: event.target.value, debit: event.target.value ? "" : item.debit } : item,
                          ),
                        )
                      }
                    />
                  </div>
                  {lines.length > 2 ? (
                    <button
                      type="button"
                      onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                      className="mt-1 text-[9px] font-bold text-rose-600"
                    >
                      حذف ردیف
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLines((current) => [...current, { accountId: "", debit: "", credit: "", description: "" }])}
                className="btn btn-ghost btn-sm w-full"
              >
                ＋ افزودن ردیف
              </button>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px]">
              <div className={`rounded-lg px-2 py-1.5 ${totals.balanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                بدهکار: {formatMoney(totals.debit)}
              </div>
              <div className={`rounded-lg px-2 py-1.5 ${totals.balanced ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                بستانکار: {formatMoney(totals.credit)}
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary btn-sm mt-2 w-full">
              {saving ? <span className="loading loading-spinner loading-xs" /> : null}
              ثبت سند
            </button>
          </form>

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
            <h2 className="mb-2 text-xs font-extrabold text-forest-950">دفتر روزنامه ({toFa(entries.length)} سند)</h2>
            {entries.length === 0 ? (
              <p className="rounded-xl border border-dashed border-cream-300 py-8 text-center text-[11px] text-forest-800/50">
                هنوز سندی ثبت نشده است.
              </p>
            ) : (
              <div className="max-h-[65vh] space-y-1.5 overflow-y-auto pl-1">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-cream-200">
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 px-2.5 py-2 text-start"
                    >
                      <span className="text-[10px] font-bold text-forest-950">
                        سند {toFa(entry.number)} · {entry.description}
                      </span>
                      <span className="text-[9px] text-forest-800/45">
                        {formatJalali(entry.date)} · {entry.source === "booking" ? "سیستمی" : "دستی"}
                      </span>
                    </button>
                    {expanded === entry.id ? (
                      <div className="overflow-x-auto">
                      <table className="table table-xs">
                        <thead>
                          <tr>
                            <th>حساب</th>
                            <th>بدهکار</th>
                            <th>بستانکار</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line) => (
                            <tr key={line.id}>
                              <td className="text-[10px]">
                                {line.accountCode} — {line.accountName}
                              </td>
                              <td className="text-[10px]">{line.debit ? formatMoney(line.debit) : "—"}</td>
                              <td className="text-[10px]">{line.credit ? formatMoney(line.credit) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {tab === "trial" ? (
        <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
          <h2 className="mb-2 text-xs font-extrabold text-forest-950">تراز آزمایشی</h2>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr className="text-[10px]">
                  <th>کد</th>
                  <th>نام حساب</th>
                  <th>نوع</th>
                  <th>سطح</th>
                  <th>بدهکار</th>
                  <th>بستانکار</th>
                  <th>مانده</th>
                </tr>
              </thead>
              <tbody>
                {trial
                  .filter((row) => row.debit || row.credit)
                  .map((row) => (
                    <tr key={row.accountId} className="text-[10px]">
                      <td className="font-mono">{row.code}</td>
                      <td>{row.name}</td>
                      <td>{ACCOUNT_TYPE_LABELS[row.type] ?? row.type}</td>
                      <td>{ACCOUNT_LEVEL_LABELS[row.level] ?? row.level}</td>
                      <td>{formatMoney(row.debit)}</td>
                      <td>{formatMoney(row.credit)}</td>
                      <td className={row.balance >= 0 ? "text-forest-900" : "text-rose-600"}>
                        {formatMoney(Math.abs(row.balance))} {row.balanceLabel}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="text-[10px] font-black">
                  <td colSpan={4}>جمع کل</td>
                  <td>{formatMoney(trial.reduce((sum, row) => sum + row.debit, 0))}</td>
                  <td>{formatMoney(trial.reduce((sum, row) => sum + row.credit, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      ) : null}

      {tab === "pl" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
            <h2 className="mb-2 text-xs font-extrabold text-forest-950">صورت سود و زیان</h2>
            <table className="table table-sm">
              <tbody>
                <tr className="text-[11px] font-bold">
                  <td>جمع درآمدها</td>
                  <td className="text-emerald-700">{formatMoney(profitLoss.totalRevenue)}</td>
                </tr>
                {profitLoss.revenue
                  .filter((row) => row.credit - row.debit !== 0)
                  .map((row) => (
                    <tr key={`rev-${row.accountId}`} className="text-[10px]">
                      <td className="pr-3 text-forest-800/60">{row.name}</td>
                      <td>{formatMoney(row.credit - row.debit)}</td>
                    </tr>
                  ))}
                <tr className="text-[11px] font-bold">
                  <td>جمع هزینه‌ها</td>
                  <td className="text-rose-600">{formatMoney(profitLoss.totalExpenses)}</td>
                </tr>
                {profitLoss.expenses
                  .filter((row) => row.debit - row.credit !== 0)
                  .map((row) => (
                    <tr key={`exp-${row.accountId}`} className="text-[10px]">
                      <td className="pr-3 text-forest-800/60">{row.name}</td>
                      <td>{formatMoney(row.debit - row.credit)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
          <section className="flex flex-col justify-between gap-3 rounded-2xl border border-forest-200 bg-forest-950 p-5 text-white shadow-soft">
            <div>
              <p className="text-[10px] text-cream-200/60">سود / زیان خالص دوره</p>
              <p className={`mt-1 text-2xl font-black ${profitLoss.netProfit >= 0 ? "text-gold-300" : "text-rose-300"}`}>
                {formatMoney(profitLoss.netProfit)}
              </p>
              <p className="mt-2 text-[10px] leading-5 text-cream-200/60">
                {profitLoss.netProfit >= 0 ? "وضعیت سودده" : "وضعیت زیان‌ده"} — بر اساس اسناد ثبت‌شده در دفتر روزنامه.
              </p>
            </div>
            <div className="rounded-xl bg-white/5 p-3 text-[10px] leading-5 text-cream-200/70">
              اسناد رزروهای تأییدشده به صورت خودکار در دفتر روزنامه ثبت می‌شوند؛ هزینه‌ها و درآمدهای دیگر را می‌توانید
              دستی ثبت کنید.
            </div>
          </section>
        </div>
      ) : null}

      {tab === "accounts" ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr] xl:items-start">
          <form onSubmit={submitAccount} className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
            <h2 className="text-xs font-extrabold text-forest-950">افزودن حساب</h2>
            <div className="mt-2 grid gap-2">
              <label className="field">
                <span className="label text-[10px]">کد حساب</span>
                <input className="input h-9 py-1 text-xs" value={newAccount.code} onChange={(event) => setNewAccount({ ...newAccount, code: event.target.value })} placeholder="50107" />
              </label>
              <label className="field">
                <span className="label text-[10px]">نام حساب</span>
                <input className="input h-9 py-1 text-xs" value={newAccount.name} onChange={(event) => setNewAccount({ ...newAccount, name: event.target.value })} placeholder="هزینه تبلیغات دیجیتال" />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="field">
                  <span className="label text-[10px]">نوع</span>
                  <select className="input h-9 py-1 text-xs" value={newAccount.type} onChange={(event) => setNewAccount({ ...newAccount, type: event.target.value })}>
                    {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span className="label text-[10px]">سطح</span>
                  <select className="input h-9 py-1 text-xs" value={newAccount.level} onChange={(event) => setNewAccount({ ...newAccount, level: event.target.value })}>
                    {Object.entries(ACCOUNT_LEVEL_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span className="label text-[10px]">کد حساب والد (اختیاری)</span>
                <input className="input h-9 py-1 text-xs" value={newAccount.parentCode} onChange={(event) => setNewAccount({ ...newAccount, parentCode: event.target.value })} placeholder="501" />
              </label>
              <button type="submit" className="btn btn-primary btn-sm">ثبت حساب</button>
            </div>
          </form>

          <section className="rounded-2xl border border-cream-200 bg-white p-4 shadow-soft">
            <h2 className="mb-2 text-xs font-extrabold text-forest-950">ساختار حساب‌ها</h2>
            <div className="max-h-[60vh] overflow-x-auto overflow-y-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-[10px]">
                    <th>کد</th>
                    <th>نام</th>
                    <th>نوع</th>
                    <th>سطح</th>
                    <th>والد</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="text-[10px]">
                      <td className="font-mono">{account.code}</td>
                      <td style={{ paddingInlineStart: account.level === "detail" ? 18 : account.level === "subsidiary" ? 9 : 0 }}>
                        {account.name}
                      </td>
                      <td>{ACCOUNT_TYPE_LABELS[account.type] ?? account.type}</td>
                      <td>{ACCOUNT_LEVEL_LABELS[account.level] ?? account.level}</td>
                      <td className="font-mono text-forest-800/50">{account.parentCode ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
