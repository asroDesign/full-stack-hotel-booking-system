import { NextResponse } from "next/server";
import { authPartner, logPartner } from "@/lib/partner-api";
import { listRooms } from "@/lib/partner-booking";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authPartner(req);
  if (a instanceof NextResponse) return a;
  const data = await listRooms();
  await logPartner(a.partner.id, req, 200, `${data.length} rooms`);
  return NextResponse.json({ ok: true, rooms: data });
}
