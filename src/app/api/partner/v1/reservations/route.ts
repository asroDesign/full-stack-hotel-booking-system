import { NextResponse } from "next/server";
import { apiError, authPartner, logPartner } from "@/lib/partner-api";
import { createPartnerReservation } from "@/lib/partner-booking";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await authPartner(req);
  if (a instanceof NextResponse) return a;
  let input: Record<string, unknown>;
  try {
    input = JSON.parse(a.body || "{}");
  } catch {
    await logPartner(a.partner.id, req, 400, "invalid json");
    return apiError(400, "invalid_json", "Body must be valid JSON");
  }
  const r = await createPartnerReservation(a.partner, input);
  const b = r.body as { ok: boolean; error?: { message: string }; reservation?: { trackingCode: string } };
  await logPartner(a.partner.id, req, r.status, b.ok ? `created ${b.reservation?.trackingCode ?? ""}` : (b.error?.message ?? ""));
  return NextResponse.json(r.body, { status: r.status });
}
