import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { mediaChunks, mediaFiles } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin, magicMatches } from "@/lib/security";
import { optimizeStoredImage } from "@/lib/image-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function guard(req: Request, id: string) {
  if (!isSameOrigin(req)) return { error: NextResponse.json({ error: "درخواست نامعتبر" }, { status: 403 }) };
  const admin = await getCurrentAdmin();
  if (!admin) return { error: NextResponse.json({ error: "ابتدا وارد پنل شوید" }, { status: 401 }) };
  if (!/^[a-f0-9]{24}$/.test(id)) return { error: NextResponse.json({ error: "شناسه نامعتبر" }, { status: 400 }) };
  const [file] = await db
    .select({ id: mediaFiles.id, mime: mediaFiles.mime, size: mediaFiles.size, chunkSize: mediaFiles.chunkSize, complete: mediaFiles.complete })
    .from(mediaFiles)
    .where(eq(mediaFiles.id, id));
  if (!file) return { error: NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 }) };
  if (file.complete) return { error: NextResponse.json({ error: "آپلود قبلاً کامل شده" }, { status: 409 }) };
  return { file };
}

/** Step 2: upload one chunk (raw body, ≤ CHUNK_SIZE). ?i=<index> */
export async function PUT(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const { file } = g;
  const idx = Number(new URL(req.url).searchParams.get("i"));
  const total = Math.ceil(file.size / file.chunkSize);
  if (!Number.isInteger(idx) || idx < 0 || idx >= total) return NextResponse.json({ error: "شماره قطعه نامعتبر" }, { status: 400 });

  const buf = Buffer.from(await req.arrayBuffer());
  const expected = idx === total - 1 ? file.size - idx * file.chunkSize : file.chunkSize;
  if (buf.length !== expected) return NextResponse.json({ error: "اندازه قطعه نادرست است" }, { status: 400 });
  if (idx === 0 && !magicMatches(file.mime, buf.subarray(0, 16))) {
    await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
    return NextResponse.json({ error: "محتوای فایل با نوع آن مطابقت ندارد" }, { status: 400 });
  }
  await db
    .insert(mediaChunks)
    .values({ fileId: id, idx, data: buf })
    .onConflictDoUpdate({ target: [mediaChunks.fileId, mediaChunks.idx], set: { data: buf } });
  return NextResponse.json({ ok: true });
}

/** Step 3: finalise. */
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  const { file } = g;
  const total = Math.ceil(file.size / file.chunkSize);
  const [{ n, bytes }] = await db
    .select({ n: sql<number>`count(*)::int`, bytes: sql<number>`coalesce(sum(octet_length(${mediaChunks.data})),0)::bigint` })
    .from(mediaChunks)
    .where(eq(mediaChunks.fileId, id));
  if (Number(n) !== total || Number(bytes) !== file.size) {
    return NextResponse.json({ error: "همه قطعات فایل دریافت نشده است" }, { status: 400 });
  }
  await db.update(mediaFiles).set({ complete: true }).where(and(eq(mediaFiles.id, id)));

  // images → WebP (full + small preview). Videos are stored as uploaded.
  let optimized = false;
  if (file.mime.startsWith("image/")) {
    try {
      optimized = await optimizeStoredImage(id);
    } catch (e) {
      console.error("[upload] image optimisation failed", e);
      if (file.mime === "image/heic" || file.mime === "image/heif") {
        await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
        return NextResponse.json({ error: "تبدیل تصویر HEIC ناموفق بود. لطفاً تصویر را با فرمت JPG ارسال کنید." }, { status: 422 });
      }
    }
    if (!optimized && (file.mime === "image/heic" || file.mime === "image/heif")) {
      await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
      return NextResponse.json({ error: "پشتیبانی از HEIC روی این سرور فعال نیست. لطفاً تصویر را با فرمت JPG ارسال کنید." }, { status: 422 });
    }
  }
  return NextResponse.json({ ok: true, url: `/api/files/${id}`, optimized });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const g = await guard(req, id);
  if ("error" in g) return g.error;
  await db.delete(mediaFiles).where(eq(mediaFiles.id, id));
  return NextResponse.json({ ok: true });
}
