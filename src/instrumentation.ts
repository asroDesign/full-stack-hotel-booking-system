/**
 * Runs once when the Next.js server starts (not during `next build`).
 * Applies pending database migrations before any request is served.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.DATABASE_URL) {
    console.warn("[migrate] DATABASE_URL is not set – skipping migrations");
    return;
  }
  if (process.env.SKIP_DB_MIGRATIONS === "true") return;
  const { runMigrations } = await import("./db/migrate");
  try {
    await runMigrations();
  } catch (e) {
    console.error("[migrate] FAILED – the server will not start with an outdated schema.", e);
    throw e;
  }
  // background jobs: scheduled campaigns, birthday codes, post-stay review invites
  if (process.env.DISABLE_JOBS !== "true") {
    const { runDueJobs } = await import("./lib/jobs");
    const tick = () => void runDueJobs().catch((err) => console.error("[jobs]", err));
    setTimeout(tick, 60_000).unref?.();
    setInterval(tick, 10 * 60_000).unref?.();
  }
}
