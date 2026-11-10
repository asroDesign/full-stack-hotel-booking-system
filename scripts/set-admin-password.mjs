#!/usr/bin/env node
/**
 * Reset/create the admin password without touching any other data.
 * Usage: node scripts/set-admin-password.mjs --email owner@example.com --password 'NewStrongPass'
 */
import "dotenv/config";
import crypto from "node:crypto";
import { Pool } from "pg";

const args = process.argv.slice(2);
const getArg = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const email = (getArg("email") ?? "").trim().toLowerCase();
const password = getArg("password") ?? "";
const name = getArg("name") ?? "مدیر هتل";

if (!email || password.length < 8) {
  console.error("Usage: node scripts/set-admin-password.mjs --email <email> --password <min 8 chars> [--name <display name>]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = `${salt}:${crypto.scryptSync(password, salt, 64).toString("hex")}`;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  const result = await pool.query(
    `insert into admins (name, email, password_hash, role) values ($1, $2, $3, 'admin')
     on conflict (email) do update set password_hash = excluded.password_hash, name = excluded.name
     returning id, email`,
    [name, email, hash],
  );
  console.log(`[admin] password updated for ${result.rows[0].email} (id: ${result.rows[0].id})`);
} catch (error) {
  console.error("[admin] failed:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
