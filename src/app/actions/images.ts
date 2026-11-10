"use server";

import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { optimizeStoredImage, SMALL_SUFFIX } from "@/lib/image-engine";

/** Images that still need optimisation: not WebP yet, or missing the small preview variant. */
async function pendingIds(limit: number) {
  const r = await db.execute<{ id: string }>(sql`
    select f.id from media_files f
    where f.complete and f.mime like 'image/%' and f.id !~ ${SMALL_SUFFIX + "$"}
      and (f.mime <> 'image/webp' or not exists (select 1 from media_files s where s.id = f.id || ${SMALL_SUFFIX}))
    order by f.created_at
    limit ${limit}`);
  return r.rows.map((x) => x.id);
}

export async function imageStats() {
  await requireAdmin();
  const r = await db.execute<{ total: number; pending: number }>(sql`
    select count(*)::int as total,
      count(*) filter (where f.mime <> 'image/webp' or not exists (select 1 from media_files s where s.id = f.id || ${SMALL_SUFFIX}))::int as pending
    from media_files f where f.complete and f.mime like 'image/%' and f.id !~ ${SMALL_SUFFIX + "$"}`);
  return r.rows[0] ?? { total: 0, pending: 0 };
}

/** Optimise a small batch (called repeatedly by the admin UI until nothing is left). */
export async function optimizeImagesBatch(): Promise<{ done: number; failed: number; remaining: number }> {
  await requireAdmin();
  const ids = await pendingIds(4);
  let done = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      if (await optimizeStoredImage(id)) done++;
      else failed++;
    } catch (e) {
      console.error("[image-engine] backfill failed for", id, e);
      failed++;
    }
  }
  const { pending } = await imageStats();
  // when sharp is unavailable nothing changes → stop the loop
  return { done, failed, remaining: done === 0 && failed > 0 ? 0 : pending };
}
