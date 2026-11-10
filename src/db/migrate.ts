import path from "node:path";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { getPool } from "./index";

const LOCK_ID = 727_274_001;

/**
 * Applies pending SQL migrations from ./drizzle (generated with `drizzle-kit generate`).
 * - Runs automatically on server start (see src/instrumentation.ts).
 * - Migrations are additive and idempotent; data is never reset.
 * - A PostgreSQL advisory lock makes it safe with several Node processes (PM2 cluster, replicas).
 */
export async function runMigrations() {
  const folder = path.join(process.cwd(), "drizzle");
  if (!fs.existsSync(path.join(folder, "meta", "_journal.json"))) {
    console.warn(`[migrate] migrations folder not found at ${folder} – skipping`);
    return;
  }
  const client = await getPool().connect();
  try {
    await client.query("select pg_advisory_lock($1)", [LOCK_ID]);
    const started = Date.now();
    await migrate(drizzle(client), { migrationsFolder: folder });
    console.log(`[migrate] database schema is up to date (${Date.now() - started}ms)`);
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
}
