export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin, sanitizeText } from "@/lib/security";

const TYPES = ["asset", "liability", "equity", "revenue", "expense"];
const LEVELS = ["general", "subsidiary", "detail"];

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  try {
    const body = await request.json();
    const code = sanitizeText(body.code, 20).replace(/[^0-9]/g, "");
    const name = sanitizeText(body.name, 120);
    const type = TYPES.includes(String(body.type)) ? String(body.type) : "asset";
    const level = LEVELS.includes(String(body.level)) ? String(body.level) : "detail";
    const parentCode = sanitizeText(body.parentCode, 20).replace(/[^0-9]/g, "") || null;
    if (!code || !name) return NextResponse.json({ error: "کد و نام حساب الزامی است." }, { status: 400 });
    const created = await db
      .insert(accounts)
      .values({ code, name, type, level, parentCode })
      .returning();
    return NextResponse.json({ account: created[0] }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/accounting/accounts]", error);
    return NextResponse.json({ error: "ثبت حساب انجام نشد. کد حساب تکراری است؟" }, { status: 400 });
  }
}
