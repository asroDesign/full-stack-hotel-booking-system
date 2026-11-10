#!/usr/bin/env node
/**
 * Safe, versioned database migration runner.
 *
 * Usage:
 *   node scripts/db-migrate.mjs               # apply pending migrations
 *   node scripts/db-migrate.mjs --baseline    # existing DB created with
 *                                             # `drizzle-kit push`: mark the
 *                                             # current migration files as
 *                                             # already applied WITHOUT running
 *                                             # them (nothing is dropped).
 *
 * Never run `drizzle-kit push --force` against production.
 */
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const migrationsFolder = path.resolve(process.cwd(), "migrations");
const baseline = process.argv.includes("--baseline");
const pool = new Pool({ connectionString, max: 1 });
const db = drizzle(pool);

try {
  if (baseline) {
    await pool.query("CREATE SCHEMA IF NOT EXISTS drizzle");
    await pool.query(
      'CREATE TABLE IF NOT EXISTS drizzle."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)',
    );
    const journal = JSON.parse(await fs.readFile(path.join(migrationsFolder, "meta", "_journal.json"), "utf8"));
    let recorded = 0;
    for (const entry of journal.entries ?? []) {
      const sqlText = await fs.readFile(path.join(migrationsFolder, `${entry.tag}.sql`), "utf8");
      const hash = crypto.createHash("sha256").update(sqlText).digest("hex");
      const existing = await pool.query('select 1 from drizzle."__drizzle_migrations" where hash = $1', [hash]);
      if (existing.rowCount === 0) {
        await pool.query('insert into drizzle."__drizzle_migrations" (hash, created_at) values ($1, $2)', [
          hash,
          entry.when ?? Date.now(),
        ]);
        recorded += 1;
      }
    }
    console.log(`[migrate] baseline recorded for ${recorded} migration file(s). No SQL was executed.`);
  }

  await migrate(db, { migrationsFolder });
  console.log("[migrate] database schema is up to date.");
} catch (error) {
  console.error("[migrate] failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
