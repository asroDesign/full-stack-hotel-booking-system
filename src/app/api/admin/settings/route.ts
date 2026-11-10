export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { updateSettings } from "@/lib/admin-crud";
import { getSettings } from "@/lib/data";
import { redactPaymentCredentials } from "@/lib/payment-settings";
import { revalidateTag } from "next/cache";

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  return NextResponse.json({ settings: redactPaymentCredentials(await getSettings()) });
}

export async function PUT(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  try {
    const body = await request.json();
    const updated = await updateSettings(body);
    if (!updated) return NextResponse.json({ error: "تنظیمات یافت نشد." }, { status: 404 });
    revalidateTag("hotel-public", "max");
    return NextResponse.json({ settings: redactPaymentCredentials(updated) });
  } catch (error) {
    console.error("[api/admin/settings]", error);
    return NextResponse.json({ error: "ذخیره تنظیمات انجام نشد." }, { status: 400 });
  }
}
