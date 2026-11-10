export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { smsLogs } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { sendPatternSms, smsConfigured, smsProvider } from "@/lib/sms";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const logs = await db.select().from(smsLogs).orderBy(desc(smsLogs.createdAt)).limit(100);
  return NextResponse.json({
    provider: smsProvider(),
    configured: smsConfigured(),
    logs,
  });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  try {
    const body = await request.json();
    const receptor = String(body.receptor ?? "");
    if (!/^09\d{9}$/.test(receptor)) {
      return NextResponse.json({ error: "شماره موبایل معتبر وارد کنید." }, { status: 400 });
    }
    const result = await sendPatternSms({
      receptor,
      patternKey: "guest_status",
      context: "manual-test",
      params: [
        { name: "name", value: String(body.name ?? "مهمان") },
        { name: "status", value: "پیام آزمایشی" },
        { name: "code", value: "TEST" },
      ],
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/admin/sms]", error);
    return NextResponse.json({ error: "ارسال پیام آزمایشی انجام نشد." }, { status: 500 });
  }
}
