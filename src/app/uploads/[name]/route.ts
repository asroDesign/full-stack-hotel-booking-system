export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse } from "next/server";

const MIME: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  gif: "image/gif",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safeName = path.basename(decodeURIComponent(name));
  if (!/^[a-zA-Z0-9._-]+$/.test(safeName)) {
    return NextResponse.json({ error: "نام فایل نامعتبر است." }, { status: 400 });
  }
  const extension = safeName.split(".").pop()?.toLowerCase() ?? "";
  const contentType = MIME[extension];
  if (!contentType) {
    return NextResponse.json({ error: "نوع فایل پشتیبانی نمی‌شود." }, { status: 415 });
  }
  const filePath = path.join(process.cwd(), "public", "uploads", safeName);
  try {
    const info = await stat(filePath);
    // Stream the file; reading a large video into a Buffer would balloon RAM.
    const stream = Readable.toWeb(createReadStream(filePath)) as ReadableStream;
    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
      },
    });
  } catch {
    return NextResponse.json({ error: "فایل یافت نشد." }, { status: 404 });
  }
}
