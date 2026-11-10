import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { bookedRoomRanges, bookedSlots } from "@/lib/availability";
import { roomPriceMap } from "@/lib/pricing";
import { addDaysISO, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const roomId = Number(url.searchParams.get("roomId"));
  const serviceId = Number(url.searchParams.get("serviceId"));
  const date = url.searchParams.get("date") ?? "";
  if (roomId) {
    const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
    if (!room) return NextResponse.json({ error: "not found" }, { status: 404 });
    const today = todayISO();
    const [ranges, prices] = await Promise.all([bookedRoomRanges(roomId), roomPriceMap(room, today, addDaysISO(today, 180))]);
    return NextResponse.json({
      ranges,
      prices: Object.fromEntries(prices.map((p) => [p.date, { p: p.price, k: p.kind === "normal" ? undefined : p.kind }])),
    });
  }
  if (serviceId && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const slots = await bookedSlots(serviceId, date);
    return NextResponse.json({ slots });
  }
  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
