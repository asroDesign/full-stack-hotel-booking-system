export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { conciergeRequests } from "@/db/schema";
import { normalizePhone } from "@/lib/format";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin, sanitizeText } from "@/lib/security";

const SERVICES = ["airport_transfer", "tour", "spa", "table", "celebration", "other"];

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`concierge:${clientIp(request)}`, 4, 15 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  try {
    const body = await request.json();
    const guestName = sanitizeText(body.guestName, 120);
    const phone = normalizePhone(String(body.phone ?? ""));
    const details = sanitizeText(body.details, 2000);
    const serviceType = SERVICES.includes(String(body.serviceType)) ? String(body.serviceType) : "other";
    const preferredDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.preferredDate ?? "")) ? String(body.preferredDate) : null;
    const bookingCode = sanitizeText(body.bookingCode, 40);

    if (guestName.length < 3) return NextResponse.json({ error: "نام خود را کامل وارد کنید." }, { status: 400 });
    if (!/^09\d{9}$/.test(phone)) return NextResponse.json({ error: "شماره موبایل معتبر وارد کنید." }, { status: 400 });
    if (details.length < 10) return NextResponse.json({ error: "توضیح درخواست را کامل‌تر بنویسید." }, { status: 400 });

    await db.insert(conciergeRequests).values({
      guestName,
      phone,
      details,
      serviceType,
      preferredDate,
      bookingCode,
      status: "new",
    });

    return NextResponse.json({ ok: true, message: "درخواست کانسیرژ ثبت شد؛ همکاران ما با شما تماس می‌گیرند." }, { status: 201 });
  } catch (error) {
    console.error("[api/concierge]", error);
    return NextResponse.json({ error: "ثبت درخواست انجام نشد." }, { status: 500 });
  }
}
