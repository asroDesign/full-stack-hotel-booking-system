export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { createResource, isAdminResource, listResource } from "@/lib/admin-crud";
import { revalidateTag } from "next/cache";

export async function GET(_request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  const { resource } = await params;
  if (!isAdminResource(resource)) return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  const items = await listResource(resource);
  return NextResponse.json({ items });
}

export async function POST(request: Request, { params }: { params: Promise<{ resource: string }> }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const { resource } = await params;
  if (!isAdminResource(resource)) return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  if (resource === "bookings" || resource === "messages") {
    return NextResponse.json({ error: "ایجاد دستی این منبع پشتیبانی نمی‌شود." }, { status: 400 });
  }
  try {
    const body = await request.json();
    const result = await createResource(resource, body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateTag("hotel-public", "max");
    return NextResponse.json({ item: result.item }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/create]", error);
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }
}
