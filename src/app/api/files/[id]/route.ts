import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { SMALL_SUFFIX } from "@/lib/image-engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LEGACY_SLICE = 512 * 1024;

const baseHeaders = (mime: string) => ({
  "Content-Type": mime,
  "Accept-Ranges": "bytes",
  "Cache-Control": "public, max-age=31536000, immutable",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
  "Content-Disposition": "inline",
});

/**
 * Streams the requested byte range chunk-by-chunk, so memory usage stays at
 * ~1 chunk per request regardless of the file size (previously the whole file
 * was loaded into RAM, which caused big memory spikes with videos).
 */
function streamRange(
  start: number,
  end: number,
  readSlice: (from: number, to: number) => Promise<Buffer>,
  sliceSize: number,
) {
  let pos = start;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (pos > end) {
        controller.close();
        return;
      }
      const to = Math.min(end, pos + sliceSize - 1);
      try {
        const buf = await readSlice(pos, to);
        controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
        pos = to + 1;
      } catch (e) {
        controller.error(e);
      }
    },
  });
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await ctx.params;
  if (!/^[a-zA-Z0-9]{8,64}$/.test(rawId)) return new Response("Not found", { status: 404 });

  // ?v=sm → small preview variant (falls back to the original for files uploaded before the image engine)
  const wantSmall = new URL(req.url).searchParams.get("v") === "sm";
  type Meta = { mime: string; size: number; chunk_size: number; complete: boolean; len: number };
  const load = (fid: string) =>
    db.execute<Meta>(sql`select mime, size, chunk_size, complete, octet_length(data)::int as len from media_files where id = ${fid}`);
  let id = rawId;
  let m: Meta | undefined;
  if (wantSmall) {
    m = (await load(`${rawId}${SMALL_SUFFIX}`)).rows[0];
    if (m?.complete) id = `${rawId}${SMALL_SUFFIX}`;
    else m = undefined;
  }
  if (!m) m = (await load(rawId)).rows[0];

  if (!m) {
    const [file] = await db.select().from(uploads).where(eq(uploads.id, id));
    if (!file) return new Response("Not found", { status: 404 });
    return new Response(new Uint8Array(Buffer.from(file.data, "base64")), { headers: baseHeaders(file.mime) });
  }
  if (!m.complete) return new Response("Not found", { status: 404 });

  const chunked = Number(m.chunk_size) > 0;
  const size = chunked ? Number(m.size) : Number(m.len);
  const chunkSize = Number(m.chunk_size);

  const readSlice = chunked
    ? async (from: number, to: number) => {
        // the slice never crosses a chunk boundary (sliceSize === chunkSize and aligned below)
        const idx = Math.floor(from / chunkSize);
        const offset = from - idx * chunkSize;
        const len = to - from + 1;
        const r = await db.execute<{ part: Buffer }>(
          sql`select substring(data from ${offset + 1} for ${len}) as part from media_chunks where file_id = ${id} and idx = ${idx}`,
        );
        return r.rows[0]?.part ?? Buffer.alloc(0);
      }
    : async (from: number, to: number) => {
        const r = await db.execute<{ part: Buffer }>(
          sql`select substring(data from ${from + 1} for ${to - from + 1}) as part from media_files where id = ${id}`,
        );
        return r.rows[0]?.part ?? Buffer.alloc(0);
      };

  // for chunked files read until the end of the current chunk each time
  const makeStream = (start: number, end: number) => {
    if (!chunked) return streamRange(start, end, readSlice, LEGACY_SLICE);
    let pos = start;
    return new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (pos > end) return controller.close();
        const chunkEnd = (Math.floor(pos / chunkSize) + 1) * chunkSize - 1;
        const to = Math.min(end, chunkEnd);
        try {
          const buf = await readSlice(pos, to);
          controller.enqueue(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
          pos = to + 1;
        } catch (e) {
          controller.error(e);
        }
      },
    });
  };

  const range = req.headers.get("range");
  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    let start = match?.[1] ? Number(match[1]) : 0;
    let end = match?.[2] ? Number(match[2]) : size - 1;
    if (!match?.[1] && match?.[2]) {
      start = Math.max(0, size - Number(match[2]));
      end = size - 1;
    }
    end = Math.min(end, size - 1);
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    return new Response(makeStream(start, end), {
      status: 206,
      headers: { ...baseHeaders(m.mime), "Content-Length": String(end - start + 1), "Content-Range": `bytes ${start}-${end}/${size}` },
    });
  }
  return new Response(makeStream(0, size - 1), { headers: { ...baseHeaders(m.mime), "Content-Length": String(size) } });
}
