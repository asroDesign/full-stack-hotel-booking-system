export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { bulkSetPrices, getDailyPricesForRooms } from "@/lib/pricing";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const from = (searchParams.get("from") ?? "").slice(0, 10);
  const to = (searchParams.get("to") ?? "").slice(0, 10);
  const roomIds = (searchParams.get("roomIds") ?? "")
    .split(",")
    .map(Number)
    .filter(Boolean);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "بازه تاریخ معتبر نیست." }, { status: 400 });
  }
  const prices = await getDailyPricesForRooms(roomIds, from, to);
  return NextResponse.json({ prices });
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  try {
    const body = await request.json();
    const roomIds = Array.isArray(body.roomIds) ? body.roomIds.map(Number).filter(Boolean) : [];
    const dates = Array.isArray(body.dates)
      ? body.dates.filter((date: unknown) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))
      : [];
    if (roomIds.length === 0) return NextResponse.json({ error: "حداقل یک اتاق انتخاب کنید." }, { status: 400 });
    if (dates.length === 0) return NextResponse.json({ error: "حداقل یک روز انتخاب کنید." }, { status: 400 });
    if (dates.length > 400) return NextResponse.json({ error: "حداکثر ۴۰۰ روز در هر عملیات." }, { status: 400 });

    const price = body.price === undefined || body.price === null || body.price === "" ? null : Number(body.price);
    const percent = body.percent === undefined || body.percent === null || body.percent === "" ? null : Number(body.percent);
    if (price === null && percent === null) {
      return NextResponse.json({ error: "قیمت یا درصد تغییر را وارد کنید." }, { status: 400 });
    }
    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      return NextResponse.json({ error: "قیمت معتبر نیست." }, { status: 400 });
    }
    if (percent !== null && (!Number.isFinite(percent) || Math.abs(percent) > 300)) {
      return NextResponse.json({ error: "درصد تغییر باید بین ۳۰۰- و ۳۰۰ باشد." }, { status: 400 });
    }

    const result = await bulkSetPrices({
      roomIds,
      dates,
      price,
      percent,
      label: typeof body.label === "string" ? body.label.slice(0, 20) : "custom",
      note: typeof body.note === "string" ? body.note.slice(0, 120) : "",
    });
    return NextResponse.json({ ok: true, updated: result.updated });
  } catch (error) {
    console.error("[api/admin/pricing]", error);
    return NextResponse.json({ error: "ذخیره قیمت‌ها انجام نشد." }, { status: 500 });
  }
}
