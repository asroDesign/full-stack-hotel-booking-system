import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsPostgresqlDb?: NodePgDatabase;
};

/**
 * The database client is created lazily on first use.
 *
 * This is important because Next.js imports route/page modules while
 * collecting page data during `next build`. Throwing at module scope for a
 * missing DATABASE_URL (or any other configuration problem) makes the whole
 * build fail with "Failed to collect page data for /api/...". By deferring
 * connection setup until a query actually runs, builds stay safe while the
 * runtime still fails loudly when the database is misconfigured.
 */
function getPool(): Pool {
  if (globalForDb.__arenaNextJsPostgresqlPool) return globalForDb.__arenaNextJsPostgresqlPool;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const created = new Pool({
    connectionString: databaseUrl,
    // Bounded pool: prevents connection storms and keeps server memory flat.
    max: Number(process.env.PG_POOL_MAX ?? 5),
    min: 0,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    keepAlive: false,
    application_name: "atalar-hotel",
  });
  created.on("error", (error) => {
    // Idle client errors must not crash the process or leak listeners.
    console.error("[db] idle client error:", error.message);
  });
  // Keep a single pool across hot reloads / lambda reuse.
  globalForDb.__arenaNextJsPostgresqlPool = created;
  return created;
}

function getDb(): NodePgDatabase {
  if (globalForDb.__arenaNextJsPostgresqlDb) return globalForDb.__arenaNextJsPostgresqlDb;
  const created = drizzle(getPool());
  globalForDb.__arenaNextJsPostgresqlDb = created;
  return created;
}

function createLazyProxy<T extends object>(resolve: () => T): T {
  return new Proxy({} as T, {
    get(_target, property) {
      const instance = resolve();
      const value = Reflect.get(instance as object, property);
      return typeof value === "function" ? value.bind(instance) : value;
    },
    set(_target, property, value) {
      const instance = resolve() as Record<PropertyKey, unknown>;
      instance[property] = value;
      return true;
    },
    has(_target, property) {
      return property in resolve();
    },
    ownKeys() {
      return Reflect.ownKeys(resolve() as object);
    },
    getOwnPropertyDescriptor(_target, property) {
      return Reflect.getOwnPropertyDescriptor(resolve() as object, property);
    },
  });
}

export const pool: Pool = createLazyProxy(getPool);
export const db: NodePgDatabase = createLazyProxy(getDb);
