export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins } from "@/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { ensureSeeded } from "@/db/seed";
import { clientIp, rateLimit, resetRateLimit, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/security";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  }
  const ip = clientIp(request);
  const limited = rateLimit(`login:${ip}`, 8, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter, "تلاش‌های ناموفق زیاد بوده است. ۱۰ دقیقه بعد دوباره تلاش کنید.");

  try {
    await ensureSeeded();
    const body = await request.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ error: "ایمیل و رمز عبور را وارد کنید." }, { status: 400 });
    }
    if (password.length > 1024) {
      return NextResponse.json({ error: "ایمیل یا رمز عبور نادرست است." }, { status: 401 });
    }

    const rows = await db.select().from(admins).where(eq(admins.email, email)).limit(1);
    const admin = rows[0];
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      return NextResponse.json({ error: "ایمیل یا رمز عبور نادرست است." }, { status: 401 });
    }

    resetRateLimit(`login:${ip}`);
    await createSession(admin.id);
    return NextResponse.json({ ok: true, admin: { id: admin.id, name: admin.name, email: admin.email } });
  } catch (error) {
    console.error("[api/admin/login] error", error);
    return NextResponse.json({ error: "ورود انجام نشد. دوباره تلاش کنید." }, { status: 500 });
  }
}
