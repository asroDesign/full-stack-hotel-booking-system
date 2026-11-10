export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { reviews } from "@/db/schema";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin, sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`review:${clientIp(request)}`, 3, 30 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter, "تعداد ثبت نظر زیاد بوده است؛ کمی بعد تلاش کنید.");

  try {
    const body = await request.json();
    const guestName = sanitizeText(body.guestName, 120);
    const city = sanitizeText(body.city, 80);
    const title = sanitizeText(body.title, 140);
    const comment = sanitizeText(body.comment, 2500);
    const rating = Math.min(5, Math.max(1, Math.round(Number(body.rating) || 5)));
    const roomId = Number(body.roomId) || null;

    if (guestName.length < 3) return NextResponse.json({ error: "نام خود را کامل وارد کنید." }, { status: 400 });
    if (comment.length < 15) return NextResponse.json({ error: "متن نظر باید حداقل ۱۵ کاراکتر باشد." }, { status: 400 });

    await db.insert(reviews).values({
      guestName,
      city,
      title,
      comment,
      rating,
      roomId,
      status: "pending",
      featured: false,
    });
    return NextResponse.json({ ok: true, message: "نظر شما ثبت شد و پس از تأیید پذیرش منتشر می‌شود." }, { status: 201 });
  } catch (error) {
    console.error("[api/reviews]", error);
    return NextResponse.json({ error: "ثبت نظر انجام نشد." }, { status: 500 });
  }
}
