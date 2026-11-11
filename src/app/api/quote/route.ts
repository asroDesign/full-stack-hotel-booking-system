import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms, stayPackages } from "@/db/schema";
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
  const rawPackageId = sp.get("stayPackageId") ?? "";
  const stayPackageId = rawPackageId ? Number(rawPackageId) : 0;
  if (!roomId || !ISO.test(checkIn) || !ISO.test(checkOut)) return NextResponse.json({ error: "bad request" }, { status: 400 });
  if (!Number.isSafeInteger(stayPackageId) || stayPackageId < 0 || stayPackageId > 2_147_483_647) return NextResponse.json({ error: "invalid package" }, { status: 400 });
  const n = diffDays(checkIn, checkOut);
  if (n < 1 || n > 30) return NextResponse.json({ error: "invalid range" }, { status: 400 });
  const [room] = await db.select().from(rooms).where(eq(rooms.id, roomId));
  if (!room || !room.isActive) return NextResponse.json({ error: "not found" }, { status: 404 });
  const quote = await quoteRoom(room, checkIn, checkOut, guests, options);
  if (!stayPackageId) return NextResponse.json({ ...quote, stayPackageName: "", stayPackagePrice: 0 });
  const [stayPackage] = await db.select().from(stayPackages).where(and(eq(stayPackages.id, stayPackageId), eq(stayPackages.isActive, true)));
  if (!stayPackage) return NextResponse.json({ error: "package not found" }, { status: 404 });
  const stayPackagePrice = stayPackage.pricingMode === "fixed" ? stayPackage.price : 0;
  return NextResponse.json({ ...quote, total: quote.total + stayPackagePrice, stayPackageName: stayPackage.title, stayPackagePrice });
}
