import { NextResponse } from "next/server";
import { apiError, authPartner, logPartner } from "@/lib/partner-api";
import { partnerAvailability } from "@/lib/partner-booking";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await authPartner(req);
  if (a instanceof NextResponse) return a;
  const sp = new URL(req.url).searchParams;
  const r = await partnerAvailability(a.partner, sp.get("checkIn") ?? "", sp.get("checkOut") ?? "", Math.max(1, Number(sp.get("guests")) || 1));
  if ("error" in r) {
    await logPartner(a.partner.id, req, 422, r.error ?? "");
    return apiError(422, "validation", r.error ?? "invalid request");
  }
  await logPartner(a.partner.id, req, 200);
  return NextResponse.json({ ok: true, ...r });
}
