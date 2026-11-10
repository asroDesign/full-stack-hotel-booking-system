export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { Sharp } from "sharp";
import { getCurrentAdmin } from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

/**
 * Image pipeline
 * --------------
 * 1. accepts JPG/PNG/WEBP/GIF/AVIF **and HEIC/HEIF** (converted through libheif)
 * 2. stores two WebP derivatives:
 *      <name>-full.webp   (max 1920px, quality 82)
 *      <name>-thumb.webp  (max 480px, quality 55)
 * 3. the front-end paints the thumb first and swaps to the full file after
 *    decoding (see components/site/SmartImage.tsx)
 * 4. videos are streamed to disk untouched (mp4/webm/mov)
 */
const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
]);

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"]);

const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

const MAX_IMAGE_SIZE = 25 * 1024 * 1024;
const MAX_VIDEO_SIZE = 60 * 1024 * 1024;

function safeBaseName(originalName: string): string {
  const base = originalName.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/-+/g, "-");
  return (base || "image").slice(0, 48).toLowerCase();
}

function extensionOf(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "درخواست غیرمجاز." }, { status: 403 });
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });

  const limited = rateLimit(`admin-upload:${admin.id}`, 40, 10 * 60 * 1000);
  if (!limited.ok) return tooManyRequests(limited.retryAfter, "تعداد آپلودها زیاد است. کمی بعد دوباره تلاش کنید.");
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_SIZE + 1024 * 1024) {
    return NextResponse.json({ error: "حجم درخواست از حد مجاز بیشتر است." }, { status: 413 });
  }

  // Keep cleanup state local to this request; shared module state lets parallel
  // uploads delete each other's temporary or completed files.
  let tempCleanup: string | null = null;
  const createdCleanup: string[] = [];

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "فایلی انتخاب نشده است." }, { status: 400 });
    }

    const ext = extensionOf(file.name);
    const isVideo = Boolean(VIDEO_EXTENSIONS[file.type]);
    const isImage = IMAGE_TYPES.has(file.type) || (!isVideo && IMAGE_EXTENSIONS.has(ext));

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    /* ------------------------------- videos ------------------------------- */
    if (isVideo) {
      if (file.size > MAX_VIDEO_SIZE) {
        return NextResponse.json({ error: "حجم ویدیو باید کمتر از ۶۰ مگابایت باشد." }, { status: 413 });
      }
      const signature = Buffer.from(await file.slice(0, 12).arrayBuffer());
      const validVideo = file.type === "video/webm"
        ? signature.length >= 4 && signature.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
        : signature.length >= 8 && signature.toString("ascii", 4, 8) === "ftyp";
      if (!validVideo) return NextResponse.json({ error: "محتوای فایل با قالب ویدیویی اعلام‌شده سازگار نیست." }, { status: 415 });
      const fileName = `${Date.now()}-${randomBytes(4).toString("hex")}.${VIDEO_EXTENSIONS[file.type]}`;
      const destination = path.join(uploadDir, fileName);
      await pipeline(Readable.fromWeb(file.stream() as never), createWriteStream(destination));
      const info = await stat(destination);
      return NextResponse.json(
        {
          url: `/uploads/${fileName}`,
          thumbUrl: `/uploads/${fileName}`,
          size: info.size,
          type: file.type,
          kind: "video",
        },
        { status: 201, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (!isImage) {
      return NextResponse.json(
        { error: "فقط تصویر (JPG، PNG، WebP، GIF، HEIC) یا ویدیو (mp4/webm/mov) مجاز است." },
        { status: 400 },
      );
    }
    if (file.size > MAX_IMAGE_SIZE) {
      return NextResponse.json({ error: "حجم تصویر باید کمتر از ۲۵ مگابایت باشد." }, { status: 413 });
    }

    /* ------------------------------- images ------------------------------- */
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    sharp.cache(false);
    sharp.concurrency(1);

    const token = `${Date.now()}-${randomBytes(4).toString("hex")}`;
    const base = `${safeBaseName(file.name)}-${token}`;
    const tempPath = path.join(uploadDir, `tmp-${token}.${ext || "bin"}`);
    tempCleanup = tempPath;
    const fullName = `${base}-full.webp`;
    const thumbName = `${base}-thumb.webp`;

    await pipeline(Readable.fromWeb(file.stream() as never), createWriteStream(tempPath));

    let pipelineInput: Sharp | null = null;

    // HEIC/HEIF always goes through libheif (WASM): many sharp builds ship an
    // HEIF container reader without the HEVC decoder, which fails on full decode.
    if (file.type === "image/heic" || file.type === "image/heif" || ext === "heic" || ext === "heif") {
      try {
        const heicModule = (await import("heic-convert")) as unknown as {
          default?: (options: { buffer: Buffer; format: "JPEG" | "PNG"; quality?: number }) => Promise<Buffer | ArrayBuffer>;
        };
        const heicConvert =
          typeof heicModule.default === "function"
            ? heicModule.default
            : (heicModule as unknown as (options: { buffer: Buffer; format: "JPEG"; quality?: number }) => Promise<Buffer | ArrayBuffer>);
        const jpeg = await heicConvert({ buffer: await readFile(tempPath), format: "JPEG", quality: 0.92 });
        const jpegBuffer = Buffer.isBuffer(jpeg) ? jpeg : Buffer.from(new Uint8Array(jpeg));
        pipelineInput = sharp(jpegBuffer, { limitInputPixels: 40_000_000 });
        await pipelineInput.metadata();
      } catch (error) {
        console.error("[upload] HEIC conversion failed", error);
        return NextResponse.json(
          { error: "تبدیل فایل HEIC انجام نشد. لطفاً تصویر را به JPG یا PNG تبدیل کنید." },
          { status: 422 },
        );
      }
    } else {
      pipelineInput = sharp(tempPath, {
        animated: file.type === "image/gif",
        limitInputPixels: 40_000_000,
      });
    }

    const metadata = await pipelineInput.metadata();

    const fullPath = path.join(uploadDir, fullName);
    const thumbPath = path.join(uploadDir, thumbName);
    createdCleanup.push(fullPath, thumbPath);

    await pipelineInput
      .clone()
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toFile(fullPath);

    await pipelineInput
      .clone()
      .rotate()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 55, effort: 3 })
      .toFile(thumbPath);

    const fullInfo = await stat(fullPath);
    const thumbInfo = await stat(thumbPath);
    createdCleanup.length = 0;

    return NextResponse.json(
      {
        url: `/uploads/${fullName}`,
        thumbUrl: `/uploads/${thumbName}`,
        kind: "image",
        type: "image/webp",
        sourceType: file.type || ext,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        size: fullInfo.size,
        thumbSize: thumbInfo.size,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[api/admin/upload]", error);
    // Remove half-written derivatives so no orphan assets remain.
    await Promise.all(createdCleanup.map((target) => rm(target, { force: true }).catch(() => undefined)));
    return NextResponse.json(
      {
        error:
          error instanceof Error && /heif|heic|compression/i.test(error.message)
            ? "تبدیل تصویر HEIC انجام نشد. لطفاً فایل را به JPG تبدیل کنید."
            : "آپلود و پردازش فایل انجام نشد.",
      },
      { status: 500 },
    );
  } finally {
    if (tempCleanup) await rm(tempCleanup, { force: true }).catch(() => undefined);
    tempCleanup = null;
    createdCleanup.length = 0;
  }
}
