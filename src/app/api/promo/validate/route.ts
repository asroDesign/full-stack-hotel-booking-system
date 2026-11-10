export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { validatePromo } from "@/lib/promo";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`promo:${clientIp(request)}`, 20, 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  try {
    const body = await request.json();
    const subtotal = Math.max(0, Number(body.subtotal) || 0);
    const nights = Math.max(1, Number(body.nights) || 1);
    if (!body.code) return NextResponse.json({ error: "کد تخفیف را وارد کنید." }, { status: 400 });
    const result = await validatePromo(String(body.code), { subtotal, nights });
    if (!result.ok) return NextResponse.json({ error: result.error ?? "کد تخفیف معتبر نیست." }, { status: 400 });
    return NextResponse.json({
      ok: true,
      code: result.promo?.code,
      label: result.promo?.label,
      kind: result.promo?.kind,
      value: result.promo?.value,
      discount: result.discount,
      payable: Math.max(0, subtotal - result.discount),
      prepaymentPercent: 30,
    });
  } catch (error) {
    console.error("[api/promo/validate]", error);
    return NextResponse.json({ error: "بررسی کد تخفیف انجام نشد." }, { status: 500 });
  }
}
