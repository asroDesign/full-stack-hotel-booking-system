import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/**
 * The database client is created lazily on first use.
 * This keeps `next build` working in environments where DATABASE_URL is not
 * available at build time (Next.js imports every route while collecting page
 * data). A clear error is still thrown at runtime if it is missing.
 */

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __atalarDb?: NodePgDatabase;
};

export function getPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) return globalForDb.__arenaNextJsPostgresqlPool;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    // keep the connection pool small: each connection costs memory on both
    // the Node process and the PostgreSQL server
    max: Number(process.env.PG_POOL_MAX ?? 5),
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  globalForDb.__arenaNextJsPostgresqlPool = pool;
  return pool;
}

function getDb(): NodePgDatabase {
  if (!globalForDb.__atalarDb) {
    globalForDb.__atalarDb = drizzle(getPool());
  }
  return globalForDb.__atalarDb;
}

export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop) {
    const real = getDb();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
  has(_target, prop) {
    return Reflect.has(getDb(), prop);
  },
});
