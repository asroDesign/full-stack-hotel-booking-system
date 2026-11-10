export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { deleteResource, isAdminResource, updateResource } from "@/lib/admin-crud";
import { revalidateTag } from "next/cache";

type Params = Promise<{ resource: string; id: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const { resource, id } = await params;
  if (!isAdminResource(resource)) return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
  try {
    const body = await request.json();
    const result = await updateResource(resource, numericId, body);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    revalidateTag("hotel-public", "max");
    return NextResponse.json({ item: result.item });
  } catch (error) {
    console.error("[api/admin/update]", error);
    return NextResponse.json({ error: "درخواست نامعتبر است." }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: Params }) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const { resource, id } = await params;
  if (!isAdminResource(resource)) return NextResponse.json({ error: "منبع نامعتبر" }, { status: 404 });
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 });
  const result = await deleteResource(resource, numericId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  revalidateTag("hotel-public", "max");
  return NextResponse.json({ ok: true });
}
