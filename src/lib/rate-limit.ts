import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Fixed-window rate limiter stored in PostgreSQL so it works across
 * multiple Node processes (PM2 cluster, several containers, ...).
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ ok: boolean; retryAfter: number; count: number }> {
  const res = await db.execute<{ count: number; retry: number }>(sql`
    insert into rate_limits (key, count, reset_at)
    values (${key}, 1, localtimestamp + make_interval(secs => ${windowSec}))
    on conflict (key) do update set
      count = case when rate_limits.reset_at < localtimestamp then 1 else rate_limits.count + 1 end,
      reset_at = case when rate_limits.reset_at < localtimestamp
        then localtimestamp + make_interval(secs => ${windowSec}) else rate_limits.reset_at end
    returning count, greatest(0, extract(epoch from (reset_at - localtimestamp)))::int as retry
  `);
  if (Math.random() < 0.02) {
    db.execute(sql`delete from rate_limits where reset_at < localtimestamp - interval '1 hour'`).catch(() => {});
  }
  const row = res.rows[0];
  const count = Number(row?.count ?? 1);
  return { ok: count <= limit, retryAfter: Number(row?.retry ?? windowSec), count };
}

export async function resetRateLimit(key: string) {
  await db.execute(sql`delete from rate_limits where key = ${key}`);
}

export function retryMessage(sec: number) {
  const m = Math.ceil(sec / 60);
  return m > 1 ? `تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ${m} دقیقه دیگر دوباره تلاش کنید.` : "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید.";
}
