"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MessageStatusBadge } from "@/components/StatusBadge";
import { MESSAGE_STATUS } from "@/lib/constants";
import { formatDateTime, toFa } from "@/lib/format";

export type AdminMessage = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  subject: string;
  message: string;
  status: string;
  replyNote: string | null;
  createdAt: string;
};

export default function MessagesAdmin({ initialItems }: { initialItems: AdminMessage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = items.filter((item) => filter === "all" || item.status === filter);

  async function update(id: number, body: Record<string, unknown>) {
    setBusyId(id);
    setError(null);
    const snapshot = items;
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...body } : item)));
    try {
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setItems(snapshot);
        setError("به‌روزرسانی پیام انجام نشد.");
      } else {
        router.refresh();
      }
    } catch {
      setItems(snapshot);
      setError("خطای شبکه.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("این پیام حذف شود؟")) return;
    const snapshot = items;
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      const response = await fetch(`/api/admin/messages/${id}`, { method: "DELETE" });
      if (!response.ok) {
        setItems(snapshot);
        setError("حذف پیام انجام نشد.");
      } else {
        router.refresh();
      }
    } catch {
      setItems(snapshot);
      setError("خطای شبکه.");
    }
  }

  return (
    <div className="space-y-3">
      {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">{error}</div> : null}
      <div className="flex flex-wrap gap-1.5">
        {[{ key: "all", label: "همه" }, ...Object.entries(MESSAGE_STATUS).map(([key, meta]) => ({ key, label: meta.label }))].map(
          (tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
                filter === tab.key ? "bg-forest-900 text-white" : "bg-white text-forest-800/70 ring-1 ring-cream-200"
              }`}
            >
              {tab.label} (
              {toFa(tab.key === "all" ? items.length : items.filter((item) => item.status === tab.key).length)})
            </button>
          ),
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-cream-300 bg-white/70 px-6 py-14 text-center">
          <span className="text-2xl">✉️</span>
          <p className="text-xs font-bold text-forest-900">پیامی در این دسته وجود ندارد</p>
          <p className="text-[11px] text-forest-800/55">پیام‌های ارسالی از فرم تماس سایت اینجا نمایش داده می‌شوند.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const open = expanded === item.id;
            return (
              <article key={item.id} className="rounded-2xl border border-cream-200 bg-white p-3 shadow-soft">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cream-100 text-xs font-black text-forest-900">
                    {item.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-extrabold text-forest-950">{item.name}</p>
                      <MessageStatusBadge status={item.status} />
                      <span className="rounded-full bg-cream-100 px-2 py-0.5 text-[9px] text-forest-800/60">{item.subject}</span>
                    </div>
                    <p className="text-[10px] text-forest-800/50">
                      <span dir="ltr">{toFa(item.phone)}</span> · {formatDateTime(item.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExpanded(open ? null : item.id);
                      setReplyDraft(item.replyNote ?? "");
                      if (!open && item.status === "new") update(item.id, { status: "read" });
                    }}
                    className="rounded-lg border border-cream-300 px-2.5 py-1.5 text-[10px] font-semibold text-forest-800"
                  >
                    {open ? "بستن" : "مشاهده و پاسخ"}
                  </button>
                </div>

                {open ? (
                  <div className="mt-3 space-y-2 border-t border-cream-100 pt-3">
                    <p className="rounded-xl bg-cream-50 p-3 text-[11px] leading-6 text-forest-800/75">{item.message}</p>
                    {item.email ? <p className="text-[10px] text-forest-800/50">ایمیل مهمان: <span dir="ltr">{item.email}</span></p> : null}
                    <label className="field">
                      <span className="label text-[10px]">یادداشت پاسخ پذیرش</span>
                      <textarea
                        className="input min-h-16 text-[11px]"
                        value={replyDraft}
                        onChange={(event) => setReplyDraft(event.target.value)}
                        placeholder="خلاصه پاسخ تلفنی یا ایمیلی به مهمان…"
                      />
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => update(item.id, { status: "replied", replyNote: replyDraft })}
                        className="btn btn-primary btn-sm"
                      >
                        ثبت پاسخ
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => update(item.id, { status: "read" })}
                        className="btn btn-ghost btn-sm"
                      >
                        علامت‌زدن به‌عنوان خوانده‌شده
                      </button>
                      <button
                        type="button"
                        disabled={busyId === item.id}
                        onClick={() => remove(item.id)}
                        className="btn btn-sm border border-rose-200 bg-rose-50 text-rose-700"
                      >
                        حذف
                      </button>
                      <a href={`tel:${item.phone}`} className="btn btn-ghost btn-sm">
                        ☎ تماس با مهمان
                      </a>
                    </div>
                    {item.replyNote ? (
                      <p className="rounded-lg bg-emerald-50 p-2 text-[10px] leading-5 text-emerald-800">
                        پاسخ ثبت‌شده: {item.replyNote}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
