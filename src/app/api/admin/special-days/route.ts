export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin, sanitizeText } from "@/lib/security";
import { applySpecialDaysToRooms, deleteSpecialDay, listSpecialDays, upsertSpecialDay } from "@/lib/pricing";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "").slice(0, 10);
  const to = (searchParams.get("to") ?? "").slice(0, 10);
  return NextResponse.json({ days: await listSpecialDays(from || undefined, to || undefined) });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  try {
    const body = await request.json();
    const date = String(body.date ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "تاریخ معتبر نیست." }, { status: 400 });
    const kind = body.kind === "peak" ? "peak" : "holiday";
    const percent = Math.max(-90, Math.min(300, Math.round(Number(body.percent) || 0)));
    const day = await upsertSpecialDay({
      date,
      kind,
      percent,
      title: sanitizeText(body.title, 120) || (kind === "peak" ? "روز پیک" : "تعطیلات"),
    });
    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/special-days POST]", error);
    return NextResponse.json({ error: "ثبت روز ویژه انجام نشد." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  try {
    const body = await request.json();
    const from = String(body.from ?? "").slice(0, 10);
    const to = String(body.to ?? "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return NextResponse.json({ error: "بازه تاریخ معتبر نیست." }, { status: 400 });
    }
    const roomIds = Array.isArray(body.roomIds) ? body.roomIds.map(Number).filter(Boolean) : undefined;
    const percent = body.percent === undefined || body.percent === null ? undefined : Number(body.percent);
    const result = await applySpecialDaysToRooms({ from, to, roomIds, percent });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[api/admin/special-days PUT]", error);
    return NextResponse.json({ error: "اعمال قیمت روزهای ویژه انجام نشد." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isFinite(id)) return NextResponse.json({ error: "شناسه معتبر نیست." }, { status: 400 });
  await deleteSpecialDay(id);
  return NextResponse.json({ ok: true });
}
