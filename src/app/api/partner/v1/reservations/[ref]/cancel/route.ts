import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { reservations } from "@/db/schema";
import { apiError, authPartner, logPartner } from "@/lib/partner-api";
import { findPartnerReservation, serializeReservation } from "@/lib/partner-booking";
import { syncReservationVouchers } from "@/lib/accounting";
import { linkReservationCustomer } from "@/lib/crm";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const a = await authPartner(req);
  if (a instanceof NextResponse) return a;
  if (!a.partner.canCancel) {
    await logPartner(a.partner.id, req, 403, "cancel not allowed");
    return apiError(403, "forbidden", "Cancellation is not allowed for this partner");
  }
  const { ref } = await ctx.params;
  const r = await findPartnerReservation(a.partner, decodeURIComponent(ref).slice(0, 80));
  if (!r) {
    await logPartner(a.partner.id, req, 404, "not found");
    return apiError(404, "not_found", "Reservation not found");
  }
  if (r.checkedInAt) {
    await logPartner(a.partner.id, req, 409, "already checked in");
    return apiError(409, "checked_in", "Guest has already checked in");
  }
  if (r.status === "cancelled") return NextResponse.json({ ok: true, reservation: serializeReservation(r) });
  const [u] = await db
    .update(reservations)
    .set({ status: "cancelled", reservationCode: null, confirmedAt: null, adminNote: `${r.adminNote}\nلغو توسط ${a.partner.name}`.trim() })
    .where(eq(reservations.id, r.id))
    .returning();
  await syncReservationVouchers(u);
  await linkReservationCustomer(u).catch(() => null);
  await logPartner(a.partner.id, req, 200, `cancelled ${u.trackingCode}`);
  return NextResponse.json({ ok: true, reservation: serializeReservation(u) });
}
