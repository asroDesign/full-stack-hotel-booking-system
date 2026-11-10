import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { mediaFiles } from "@/db/schema";
import { getCurrentAdmin } from "@/lib/auth";
import { allowedMime, isSameOrigin } from "@/lib/security";
import { rateLimit } from "@/lib/rate-limit";
import { CHUNK_SIZE, MAX_IMAGE, MAX_VIDEO } from "@/lib/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 1: initialise an upload. Body: { name, mime, size } (JSON, tiny). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "ابتدا وارد پنل شوید" }, { status: 401 });
  const rl = await rateLimit(`upload:${admin.id}`, 120, 3600);
  if (!rl.ok) return NextResponse.json({ error: "تعداد آپلودها بیش از حد مجاز است" }, { status: 429 });

  const body = (await req.json().catch(() => null)) as { name?: string; mime?: string; size?: number } | null;
  const mime = String(body?.mime ?? "");
  const size = Number(body?.size ?? 0);
  const kind = allowedMime(mime);
  if (!kind) return NextResponse.json({ error: "فقط تصویر (JPG, PNG, WEBP, GIF, HEIC) یا ویدیو (MP4, WEBM) مجاز است" }, { status: 400 });
  if (!size || size < 16) return NextResponse.json({ error: "فایل خالی است" }, { status: 400 });
  if (kind === "image" && size > MAX_IMAGE) return NextResponse.json({ error: "حداکثر حجم تصویر ۲۵ مگابایت است" }, { status: 400 });
  if (kind === "video" && size > MAX_VIDEO) return NextResponse.json({ error: "حداکثر حجم ویدیو ۱۵۰ مگابایت است" }, { status: 400 });

  const id = randomBytes(12).toString("hex");
  await db.insert(mediaFiles).values({
    id,
    mime,
    name: String(body?.name ?? "").slice(0, 200),
    size,
    data: Buffer.alloc(0),
    chunkSize: CHUNK_SIZE,
    complete: false,
  });
  return NextResponse.json({ id, chunkSize: CHUNK_SIZE, url: `/api/files/${id}`, type: kind });
}
