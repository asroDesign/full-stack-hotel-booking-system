export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscribers } from "@/db/schema";
import { clientIp, rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin, sanitizeText } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const limited = rateLimit(`subscribe:${clientIp(request)}`, 5, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter);

  try {
    const body = await request.json();
    const email = sanitizeText(body.email, 160).toLowerCase();
    const source = sanitizeText(body.source, 40) || "website";
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: "ایمیل معتبر وارد کنید." }, { status: 400 });

    await db
      .insert(subscribers)
      .values({ email, source, active: true })
      .onConflictDoUpdate({ target: subscribers.email, set: { active: true, source } });

    return NextResponse.json({ ok: true, message: "عضویت شما در خبرنامه ثبت شد." }, { status: 201 });
  } catch (error) {
    console.error("[api/subscribe]", error);
    return NextResponse.json({ error: "ثبت عضویت انجام نشد." }, { status: 500 });
  }
}
