import { NextResponse } from "next/server";
import { apiError, authPartner, logPartner } from "@/lib/partner-api";
import { findPartnerReservation, serializeReservation } from "@/lib/partner-booking";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const a = await authPartner(req);
  if (a instanceof NextResponse) return a;
  const { ref } = await ctx.params;
  const r = await findPartnerReservation(a.partner, decodeURIComponent(ref).slice(0, 80));
  if (!r) {
    await logPartner(a.partner.id, req, 404, "not found");
    return apiError(404, "not_found", "Reservation not found");
  }
  await logPartner(a.partner.id, req, 200);
  return NextResponse.json({ ok: true, reservation: serializeReservation(r) });
}
