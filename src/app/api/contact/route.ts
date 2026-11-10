export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { messages } from "@/db/schema";
import { normalizePhone } from "@/lib/format";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin, sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`contact:${clientIp(request)}`, 4, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter, "پیام‌های زیاد ارسال شده است. کمی بعد تلاش کنید.");

  try {
    const body = await request.json();
    const name = sanitizeText(body.name, 120);
    const phone = normalizePhone(String(body.phone ?? ""));
    const email = sanitizeText(body.email, 160);
    const subject = sanitizeText(body.subject, 120) || "پیام عمومی";
    const message = sanitizeText(body.message, 4000);

    if (name.length < 3) return NextResponse.json({ error: "نام و نام خانوادگی را کامل وارد کنید." }, { status: 400 });
    if (phone.length < 10) return NextResponse.json({ error: "شماره تماس معتبر وارد کنید." }, { status: 400 });
    if (message.length < 10) return NextResponse.json({ error: "متن پیام باید حداقل ۱۰ کاراکتر باشد." }, { status: 400 });
    if (email && !/^\S+@\S+\.\S+$/.test(email))
      return NextResponse.json({ error: "قالب ایمیل صحیح نیست." }, { status: 400 });

    const inserted = await db
      .insert(messages)
      .values({ name, phone, email: email || null, subject, message, status: "new" })
      .returning();

    return NextResponse.json({ ok: true, id: inserted[0]?.id }, { status: 201 });
  } catch (error) {
    console.error("[api/contact] error", error);
    return NextResponse.json({ error: "ارسال پیام انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}
