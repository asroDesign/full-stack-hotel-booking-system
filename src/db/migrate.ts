import path from "node:path";
import fs from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { readMigrationFiles } from "drizzle-orm/migrator";
import type { PoolClient } from "pg";
import { getPool } from "./index";

const LOCK_ID = 727_274_001;

/**
 * Applies pending SQL migrations from ./drizzle (generated with `drizzle-kit generate`).
 * A safe repair path handles a package table created before its migration was recorded.
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
    try {
      await migrate(drizzle(client), { migrationsFolder: folder });
    } catch (error) {
      if (!isExistingStayPackagesTableError(error)) throw error;
      await recoverStayPackagesMigration(client, folder);
      await migrate(drizzle(client), { migrationsFolder: folder });
      console.warn("[migrate] recovered the stay_packages migration after finding its table already present");
    }
    console.log(`[migrate] database schema is up to date (${Date.now() - started}ms)`);
  } finally {
    await client.query("select pg_advisory_unlock($1)", [LOCK_ID]).catch(() => {});
    client.release();
  }
}

function isExistingStayPackagesTableError(error: unknown): boolean {
  let current: unknown = error;
  let code = "";
  let message = "";
  let query = "";
  for (let depth = 0; depth < 5 && current && typeof current === "object"; depth++) {
    const item = current as { code?: unknown; message?: unknown; query?: unknown; cause?: unknown };
    if (typeof item.code === "string") code = item.code;
    if (typeof item.message === "string") message = item.message;
    if (typeof item.query === "string") query = item.query;
    if (!item.cause) break;
    current = item.cause;
  }
  return code === "42P07" && message.includes('relation "stay_packages" already exists') && /CREATE\s+TABLE[\s\S]*["']stay_packages["']/i.test(query);
}

async function recoverStayPackagesMigration(client: PoolClient, folder: string) {
  const migration = readMigrationFiles({ migrationsFolder: folder }).find((item) =>
    item.sql.some((statement) => /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+["']stay_packages["']/i.test(statement)),
  );
  if (!migration) throw new Error("The duplicate stay_packages table was detected, but its migration entry could not be found.");

  await client.query("BEGIN");
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "public"."stay_packages" (
        "id" serial PRIMARY KEY NOT NULL,
        "slug" text NOT NULL,
        "title" text NOT NULL,
        "description" text DEFAULT '' NOT NULL,
        "image" text DEFAULT '' NOT NULL,
        "features" jsonb DEFAULT '[]'::jsonb NOT NULL,
        "pricing_mode" text DEFAULT 'contact' NOT NULL,
        "price" integer DEFAULT 0 NOT NULL,
        "is_active" boolean DEFAULT true NOT NULL,
        "sort_order" integer DEFAULT 0 NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "stay_packages_slug_unique" UNIQUE("slug")
      )
    `);
    await client.query(`ALTER TABLE "public"."reservations" ADD COLUMN IF NOT EXISTS "stay_package_id" integer`);
    await client.query(`ALTER TABLE "public"."reservations" ADD COLUMN IF NOT EXISTS "stay_package_name" text DEFAULT '' NOT NULL`);
    await client.query(`ALTER TABLE "public"."reservations" ADD COLUMN IF NOT EXISTS "stay_package_price" integer DEFAULT 0 NOT NULL`);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'stay_packages_slug_unique'
            AND conrelid = 'public.stay_packages'::regclass
        ) THEN
          ALTER TABLE "public"."stay_packages" ADD CONSTRAINT "stay_packages_slug_unique" UNIQUE("slug");
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'reservations_stay_package_id_stay_packages_id_fk'
            AND conrelid = 'public.reservations'::regclass
        ) THEN
          ALTER TABLE "public"."reservations"
            ADD CONSTRAINT "reservations_stay_package_id_stay_packages_id_fk"
            FOREIGN KEY ("stay_package_id") REFERENCES "public"."stay_packages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);
    await client.query(
      `INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [migration.hash, migration.folderMillis],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
