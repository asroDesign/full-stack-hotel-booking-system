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

async function readBodyLimited(req: Request, max: number): Promise<Buffer | null> {
  if (Number(req.headers.get("content-length") ?? 0) > max) return null;
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > max) { await reader.cancel(); return null; }
    parts.push(value);
  }
  return Buffer.concat(parts);
}

/** Step 1: initialise an upload. Body: { name, mime, size } (JSON, tiny). */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "ابتدا وارد پنل شوید" }, { status: 401 });
  const rl = await rateLimit(`upload:${admin.id}`, 120, 3600);
  if (!rl.ok) return NextResponse.json({ error: "تعداد آپلودها بیش از حد مجاز است" }, { status: 429 });

  const raw = await readBodyLimited(req, 2048);
  if (!raw) return NextResponse.json({ error: "درخواست بیش از حد بزرگ است" }, { status: 413 });
  const body = (() => { try { return JSON.parse(raw.toString("utf8")) as { name?: string; mime?: string; size?: number }; } catch { return null; } })();
  const mime = String(body?.mime ?? "");
  const size = Number(body?.size ?? 0);
  const kind = allowedMime(mime);
  if (!kind) return NextResponse.json({ error: "فقط تصویر (JPG, PNG, WEBP, GIF, HEIC) یا ویدیو (MP4, WEBM) مجاز است" }, { status: 400 });
  if (!Number.isSafeInteger(size) || size < 16) return NextResponse.json({ error: "اندازه فایل معتبر نیست" }, { status: 400 });
  if (kind === "image" && size > MAX_IMAGE) return NextResponse.json({ error: "حداکثر حجم تصویر ۲۵ مگابایت است" }, { status: 400 });
  if (kind === "video" && size > MAX_VIDEO) return NextResponse.json({ error: "حداکثر حجم ویدیو ۱۵۰ مگابایت است" }, { status: 400 });

  const id = randomBytes(12).toString("hex");
  await db.insert(mediaFiles).values({
    id,
    mime,
    name: String(body?.name ?? "").replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200),
    size,
    data: Buffer.alloc(0),
    chunkSize: CHUNK_SIZE,
    complete: false,
  });
  return NextResponse.json({ id, chunkSize: CHUNK_SIZE, url: `/api/files/${id}`, type: kind });
}
