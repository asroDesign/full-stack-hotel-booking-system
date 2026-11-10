import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms } from "@/db/schema";
import { quoteRoom } from "@/lib/pricing";
import { diffDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const roomId = Number(sp.get("roomId"));
  const checkIn = sp.get("checkIn") ?? "";
  const checkOut = sp.get("checkOut") ?? "";
  const guests = Math.min(20, Math.max(1, Number(sp.get("guests")) || 1));
  const options = (sp.get("options") ?? "").split(",").filter(Boolean).slice(0, 20);
  if (!roomId || !ISO.test(checkIn) || !ISO.test(checkOut)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const n = diffDays(checkIn, checkOut);
  if (n < 1 || n > 30) return NextResponse.json({ error: "invalid range" }, { status: 400 });
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || !room.isActive) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(await quoteRoom(room, checkIn, checkOut, guests, options));
}
