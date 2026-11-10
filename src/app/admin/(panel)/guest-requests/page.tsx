import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { MessagesSquare } from "lucide-react";
import { db } from "@/db";
import { guestRequestMessages, guestRequests, reservations } from "@/db/schema";
import { PageHeader, EmptyBox } from "@/components/admin/ui";
import { GuestRequestReply } from "@/components/admin/club";
import { cn, relativeTime } from "@/lib/utils";

const CATEGORY: Record<string, string> = { housekeeping: "خانه‌داری و نظافت", room_service: "سرویس اتاق / غذا", maintenance: "تعمیرات و تاسیسات", reception: "پذیرش", transfer: "ترانسفر و تاکسی", extend: "تمدید اقامت", other: "سایر" };
const ST: Record<string, [string, string]> = { open: ["جدید", "badge-error"], in_progress: ["در حال انجام", "badge-warning"], done: ["انجام شد", "badge-success"] };

export default async function GuestRequestsPage() {
  const reqs = await db.select().from(guestRequests).orderBy(desc(guestRequests.unreadStaff), desc(guestRequests.updatedAt)).limit(200);
  const [msgs, res] = reqs.length
    ? await Promise.all([
        db.select().from(guestRequestMessages).where(inArray(guestRequestMessages.requestId, reqs.map((r) => r.id))),
        db.select().from(reservations).where(inArray(reservations.id, Array.from(new Set(reqs.map((r) => r.reservationId))))),
      ])
    : [[], []];
  return (
    <div className="space-y-5">
      <PageHeader title="ارتباط با مهمانان ساکن" desc="درخواست‌هایی که مهمانان از «پرتال مهمانان» (/stay) ثبت کرده‌اند" />
      {reqs.length === 0 ? <EmptyBox title="درخواستی ثبت نشده است" icon={<MessagesSquare className="h-6 w-6" />} /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reqs.map((q) => {
            const r = res.find((x) => x.id === q.reservationId);
            return (
              <div key={q.id} className={cn("card card-border bg-base-100 shadow-sm", q.unreadStaff && q.status !== "done" && "ring-2 ring-error/40")}>
                <div className="card-body gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><b>{CATEGORY[q.category] ?? q.category}</b><span className={cn("badge badge-sm", ST[q.status]?.[1])}>{ST[q.status]?.[0]}</span></div>
                    <span className="text-xs text-base-content/50">{relativeTime(q.updatedAt)}</span>
                  </div>
                  {r && <Link href={`/admin/reservations/${r.id}`} className="text-xs text-primary hover:underline">{r.guestName} · {r.itemName}</Link>}
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {msgs.filter((m) => m.requestId === q.id).sort((a, b) => +a.createdAt - +b.createdAt).map((m) => (
                      <div key={m.id} className={cn("chat", m.sender === "guest" ? "chat-start" : "chat-end")}>
                        <div className={cn("chat-bubble text-sm", m.sender === "staff" && "chat-bubble-primary")}>{m.body}</div>
                        <div className="chat-footer text-[10px] opacity-60">{m.sender === "guest" ? "مهمان" : "پذیرش"} · {relativeTime(m.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                  <GuestRequestReply id={q.id} status={q.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
