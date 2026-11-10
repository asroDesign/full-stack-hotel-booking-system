import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms, services } from "@/db/schema";
import { quoteRoom } from "@/lib/pricing";
import { evaluatePromo } from "@/lib/promotions";
import { clientIp } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { diffDays, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Server-side promo preview (the reservation action re-validates everything again). */
export async function GET(req: Request) {
  const rl = await rateLimit(`promo:${await clientIp()}`, 40, 600);
  if (!rl.ok) return NextResponse.json({ ok: false, error: "تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره امتحان کنید." }, { status: 429 });
  const sp = new URL(req.url).searchParams;
  const kind = sp.get("kind") === "service" ? "service" : "room";
  const itemId = Number(sp.get("itemId"));
  const checkIn = sp.get("checkIn") ?? "";
  const checkOut = sp.get("checkOut") ?? "";
  const guests = Math.min(30, Math.max(1, Number(sp.get("guests")) || 1));
  const options = (sp.get("options") ?? "").split(",").filter(Boolean).slice(0, 20);
  const slot = sp.get("timeSlot") ?? "";
  if (!itemId || !ISO.test(checkIn)) return NextResponse.json({ ok: false, error: "ابتدا مورد رزرو و تاریخ را انتخاب کنید." });

  let subtotal = 0;
  let nights = 1;
  let roomId: number | null = null;
  if (kind === "room") {
    if (!ISO.test(checkOut) || checkOut <= checkIn) return NextResponse.json({ ok: false, error: "ابتدا تاریخ ورود و خروج را انتخاب کنید." });
    nights = diffDays(checkIn, checkOut);
    if (nights > 30) return NextResponse.json({ ok: false, error: "بازه اقامت نامعتبر است." });
    const [room] = await db.select().from(rooms).where(eq(rooms.id, itemId));
    if (!room || !room.isActive) return NextResponse.json({ ok: false, error: "اتاق یافت نشد." });
    subtotal = (await quoteRoom(room, checkIn, checkOut, guests, options)).total;
    roomId = room.id;
  } else {
    const [svc] = await db.select().from(services).where(eq(services.id, itemId));
    if (!svc || !svc.isActive || !svc.isBookable) return NextResponse.json({ ok: false, error: "خدمت یافت نشد." });
    subtotal = (svc.slotPrices[slot] ?? svc.price) + Math.max(0, guests - svc.includedGuests) * svc.extraGuestPrice;
  }
  const r = await evaluatePromo(sp.get("code"), { kind, roomId, checkIn, nights, subtotal });
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error });
  return NextResponse.json({
    ok: true,
    code: r.promo.code,
    title: r.promo.title || r.promo.code,
    discount: r.discount,
    total: subtotal - r.discount,
    message: `${formatPrice(r.discount)} تومان تخفیف اعمال شد.`,
  });
}
