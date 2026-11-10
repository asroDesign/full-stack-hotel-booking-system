#!/usr/bin/env node
/**
 * Idempotently creates performance indexes used by the app.
 * Safe to run on every deploy: every statement uses IF NOT EXISTS and no data is touched.
 * Usage: node scripts/apply-indexes.mjs
 */
import "dotenv/config";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const STATEMENTS = [
  `CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status)`,
  `CREATE INDEX IF NOT EXISTS bookings_room_dates_idx ON bookings (room_id, check_in, check_out)`,
  `CREATE INDEX IF NOT EXISTS bookings_created_idx ON bookings (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS daily_prices_room_date_idx ON room_daily_prices (room_id, date)`,
  `CREATE INDEX IF NOT EXISTS journal_lines_entry_idx ON journal_lines (entry_id)`,
  `CREATE INDEX IF NOT EXISTS journal_lines_account_idx ON journal_lines (account_id)`,
  `CREATE INDEX IF NOT EXISTS sms_logs_created_idx ON sms_logs (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS messages_status_created_idx ON messages (status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at)`,
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
try {
  for (const statement of STATEMENTS) {
    await pool.query(statement);
  }
  console.log(`[indexes] ${STATEMENTS.length} index statements verified (no data changed).`);
} catch (error) {
  console.error("[indexes] failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
