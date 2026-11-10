"use client";

import { useOptimistic, useState, useTransition } from "react";
import { Mail, MailOpen, Trash2, Phone, Inbox, Reply } from "lucide-react";
import type { Message } from "@/db/schema";
import { deleteMessage, setMessageRead } from "@/app/actions/admin";
import { EmptyBox, Toast } from "./ui";
import { cn, faNum, formatDateTime, relativeTime } from "@/lib/utils";

type A = { type: "read"; id: number; v: boolean } | { type: "delete"; id: number };

export function MessagesInbox({ initial }: { initial: Message[] }) {
  const [toast, setToast] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(initial[0]?.id ?? null);
  const [, start] = useTransition();
  const [items, apply] = useOptimistic(initial, (s: Message[], a: A) =>
    a.type === "delete" ? s.filter((m) => m.id !== a.id) : s.map((m) => (m.id === a.id ? { ...m, isRead: a.v } : m)),
  );
  const current = items.find((m) => m.id === selected) ?? null;

  if (items.length === 0) return <EmptyBox title="صندوق پیام خالی است" desc="پیام‌های فرم تماس اینجا نمایش داده می‌شوند." icon={<Inbox className="h-6 w-6" />} />;

  const open = (m: Message) => {
    setSelected(m.id);
    if (!m.isRead) start(async () => { apply({ type: "read", id: m.id, v: true }); await setMessageRead(m.id, true); });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      <ul className="card card-border bg-base-100 shadow-sm max-h-[70vh] divide-y divide-slate-100 overflow-y-auto block">
        {items.map((m) => (
          <li key={m.id}>
            <button onClick={() => open(m)} className={cn("flex w-full items-start gap-3 p-4 text-right transition", selected === m.id ? "bg-brand-50" : "hover:bg-slate-50")}>
              <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", m.isRead ? "bg-transparent" : "bg-gold-500")} />
              <div className="min-w-0 flex-1">
                <div className="flex justify-between gap-2">
                  <span className={cn("truncate text-sm", m.isRead ? "text-slate-600" : "font-extrabold text-slate-900")}>{m.name}</span>
                  <span className="shrink-0 text-[11px] text-slate-400">{relativeTime(m.createdAt)}</span>
                </div>
                <div className="truncate text-xs font-medium text-slate-600">{m.subject}</div>
                <div className="truncate text-xs text-slate-400">{m.body}</div>
              </div>
            </button>
          </li>
        ))}
      </ul>
      {current ? (
        <div className="card card-border bg-base-100 shadow-sm p-6 block">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">{current.subject || "بدون موضوع"}</h2>
              <div className="mt-1 text-sm text-slate-500">{current.name} · {formatDateTime(current.createdAt)}</div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => start(async () => { apply({ type: "read", id: current.id, v: !current.isRead }); await setMessageRead(current.id, !current.isRead); setToast(current.isRead ? "علامت خوانده‌نشده" : "خوانده شد"); })} className="btn px-3 btn-sm text-xs">
                {current.isRead ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />} {current.isRead ? "خوانده‌نشده" : "خوانده شد"}
              </button>
              <button onClick={() => { if (confirm("پیام حذف شود؟")) start(async () => { apply({ type: "delete", id: current.id }); setSelected(null); await deleteMessage(current.id); setToast("پیام حذف شد"); }); }} className="btn px-3 btn-sm text-xs text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" /> حذف
              </button>
            </div>
          </div>
          <p className="whitespace-pre-line py-6 leading-8 text-slate-700">{current.body}</p>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {current.phone && <a href={`tel:${current.phone}`} className="btn btn-primary"><Phone className="h-4 w-4" /><span dir="ltr">{faNum(current.phone)}</span></a>}
            {current.email && <a href={`mailto:${current.email}?subject=${encodeURIComponent("پاسخ: " + current.subject)}`} className="btn"><Reply className="h-4 w-4" /> پاسخ با ایمیل</a>}
          </div>
        </div>
      ) : (
        <div className="card card-border bg-base-100 shadow-sm grid place-items-center p-10 text-sm text-slate-400">پیامی را انتخاب کنید</div>
      )}
      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
