import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LogOut, KeyRound } from "lucide-react";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getSettings } from "@/lib/data";
import { currentStay, stayLogout, stayThreads } from "@/app/actions/guest";
import { StayLoginForm, StayPortal } from "@/components/site/guest-ui";
import { faNum, formatJalali } from "@/lib/utils";

export const metadata = { title: "پرتال مهمانان", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function StayPage() {
  const s = await getSettings();
  if (s.stayPortalEnabled !== "1") notFound();
  const r = await currentStay();
  if (!r) {
    return (
      <div className="mx-auto max-w-md px-4 pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
        <div className="tpl-card rounded-box bg-base-100 p-6 shadow-xl ring-1 ring-base-300">
          <KeyRound className="h-10 w-10 text-primary" />
          <h1 className="mt-3 text-2xl font-black text-brand-900">پرتال مهمانان ساکن</h1>
          <p className="mb-5 mt-1 text-sm leading-7 text-base-content/60">در طول اقامت، درخواست‌های خود (نظافت، سفارش غذا، تعمیرات، تاکسی، تمدید اقامت…) را مستقیم برای پذیرش {s.hotelName} ارسال کنید و پاسخ را همین‌جا ببینید.</p>
          <StayLoginForm />
        </div>
      </div>
    );
  }
  const [room] = r.roomId ? await db.select().from(rooms).where(eq(rooms.id, r.roomId)) : [];
  const threads = await stayThreads();
  return (
    <div className="mx-auto max-w-4xl px-4 pb-10 pt-32 in-data-[tpl=boutique]:pt-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-brand-900">خوش آمدید، {r.guestName}</h1>
          <p className="text-sm text-base-content/60">{formatJalali(r.checkIn)} تا {formatJalali(r.checkOut)} · کد رزرو <span dir="ltr" className="font-mono">{r.reservationCode}</span></p>
        </div>
        <form action={stayLogout}><button className="btn btn-sm btn-ghost"><LogOut className="h-4 w-4" /> خروج</button></form>
      </div>
      <StayPortal
        guest={r.guestName}
        room={room ? `${faNum(room.roomNumber)} · ${room.name}` : r.itemName}
        wifi={{ name: s.wifiName, password: s.wifiPassword }}
        reception={{ ext: s.receptionExt, phone: s.phone }}
        threads={threads.map((t) => ({ id: t.id, category: t.category, status: t.status, updatedAt: t.updatedAt.toISOString(), messages: t.messages.map((m) => ({ id: m.id, sender: m.sender, body: m.body, createdAt: m.createdAt.toISOString() })) }))}
      />
    </div>
  );
}
