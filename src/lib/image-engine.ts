import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { mediaChunks, mediaFiles } from "@/db/schema";
import { CHUNK_SIZE } from "./media";

/**
 * Image engine
 * ------------
 * Every uploaded image (JPEG, PNG, WEBP, GIF, AVIF, HEIC/HEIF) is converted to WebP and stored in two variants:
 *   • full : max 2560px on the long side, quality 82          → /api/files/<id>
 *   • small: 480px wide, quality 42 (≈ 15–40 KB)              → /api/files/<id>?v=sm
 * The website first shows the small variant (blurred) and swaps in the full one when it is loaded.
 *
 * Conversions run one at a time (in-process queue) so several large HEIC uploads cannot exhaust RAM.
 */

export const FULL_MAX = 2560;
export const SMALL_WIDTH = 480;
export const SMALL_SUFFIX = "sm";

type Sharp = typeof import("sharp");
let sharpMod: Sharp | null | undefined;

async function loadSharp(): Promise<Sharp | null> {
  if (sharpMod !== undefined) return sharpMod;
  try {
    const m = (await import("sharp")).default as unknown as Sharp;
    // keep memory usage predictable on small servers
    m.cache(false);
    m.concurrency(1);
    sharpMod = m;
  } catch (e) {
    console.warn("[image-engine] sharp is not available – images are stored without conversion.", e);
    sharpMod = null;
  }
  return sharpMod;
}

let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

export function isHeic(mime: string) {
  return mime === "image/heic" || mime === "image/heif";
}

async function decodeHeic(input: Buffer): Promise<Buffer> {
  const mod = await import("heic-convert");
  const convert = (mod.default ?? (mod as unknown as typeof mod.default)) as typeof mod.default;
  const out = await convert({ buffer: input, format: "JPEG", quality: 0.92 });
  return Buffer.from(new Uint8Array(out));
}

export type ProcessedImage = { full: Buffer; small: Buffer; width: number; height: number; mime: "image/webp" };

/** Convert any supported image buffer to the two WebP variants. Returns null when conversion is impossible. */
export function processImage(input: Buffer, mime: string): Promise<ProcessedImage | null> {
  return enqueue(async () => {
    const sharp = await loadSharp();
    if (!sharp) return null;
    let src = input;
    if (isHeic(mime)) src = await decodeHeic(input);
    const animated = mime === "image/gif";
    const base = () => sharp(src, { animated, limitInputPixels: 80_000_000, failOn: "none" }).rotate();
    const meta = await sharp(src, { animated, failOn: "none" }).metadata();
    const full = await base()
      .resize({ width: FULL_MAX, height: FULL_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    const small = await sharp(src, { animated: false, failOn: "none" })
      .rotate()
      .resize({ width: SMALL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 42, effort: 4 })
      .toBuffer();
    return {
      full: full.data,
      small,
      width: full.info.width || meta.width || 0,
      height: full.info.height || meta.pageHeight || meta.height || 0,
      mime: "image/webp",
    };
  });
}

/** Read an uploaded (chunked or legacy single-row) file into memory. Only used for images (≤ 25 MB). */
export async function readMediaBuffer(id: string): Promise<{ buf: Buffer; mime: string; name: string } | null> {
  const [f] = await db
    .select({ mime: mediaFiles.mime, name: mediaFiles.name, chunkSize: mediaFiles.chunkSize })
    .from(mediaFiles)
    .where(eq(mediaFiles.id, id));
  if (!f) return null;
  if (f.chunkSize > 0) {
    const rows = await db.execute<{ data: Buffer }>(sql`select data from media_chunks where file_id = ${id} order by idx`);
    return { buf: Buffer.concat(rows.rows.map((r) => r.data)), mime: f.mime, name: f.name };
  }
  const r = await db.execute<{ data: Buffer }>(sql`select data from media_files where id = ${id}`);
  return r.rows[0] ? { buf: r.rows[0].data, mime: f.mime, name: f.name } : null;
}

/** (Re)write a file as chunked storage. */
export async function writeChunked(id: string, mime: string, name: string, buf: Buffer) {
  await db.transaction(async (tx) => {
    await tx
      .insert(mediaFiles)
      .values({ id, mime, name, size: buf.length, data: Buffer.alloc(0), chunkSize: CHUNK_SIZE, complete: false })
      .onConflictDoUpdate({ target: mediaFiles.id, set: { mime, name, size: buf.length, data: Buffer.alloc(0), chunkSize: CHUNK_SIZE, complete: false } });
    await tx.delete(mediaChunks).where(eq(mediaChunks.fileId, id));
    for (let i = 0, idx = 0; i < buf.length; i += CHUNK_SIZE, idx++) {
      await tx.insert(mediaChunks).values({ fileId: id, idx, data: buf.subarray(i, i + CHUNK_SIZE) });
    }
    await tx.update(mediaFiles).set({ complete: true }).where(eq(mediaFiles.id, id));
  });
}

const webpName = (name: string) => (name.replace(/\.[^.]+$/, "") || "image") + ".webp";

/**
 * Convert a stored image in place to WebP and create its small variant.
 * Returns true when converted, false when left untouched (e.g. sharp unavailable).
 */
export async function optimizeStoredImage(id: string): Promise<boolean> {
  const file = await readMediaBuffer(id);
  if (!file || !file.mime.startsWith("image/")) return false;
  const out = await processImage(file.buf, file.mime);
  if (!out) return false;
  await writeChunked(id, out.mime, webpName(file.name), out.full);
  await writeChunked(`${id}${SMALL_SUFFIX}`, out.mime, webpName(file.name).replace(/\.webp$/, "-sm.webp"), out.small);
  return true;
}

export async function hasSmallVariant(id: string) {
  const [r] = await db.select({ id: mediaFiles.id }).from(mediaFiles).where(eq(mediaFiles.id, `${id}${SMALL_SUFFIX}`));
  return !!r;
}
