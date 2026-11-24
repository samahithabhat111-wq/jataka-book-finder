// Creates (or updates the password of) a user. Works for the local SQLite file and for Turso.
// Usage: npm run create-user -- <username> <password> ["Full Name"]
// For Turso set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN first.
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { hashPassword } from "../src/api/password.server.ts";
import { SCHEMA } from "../src/api/schema.server.ts";

const [username, password, fullName = ""] = process.argv.slice(2);
if (!username || !password) {
  console.error('Usage: npm run create-user -- <username> <password> ["Full Name"]');
  process.exit(1);
}
if (password.length < 6) {
  console.error("Password must be at least 6 characters");
  process.exit(1);
}

let url = process.env.TURSO_DATABASE_URL;
if (!url) {
  const file = resolve(process.env.SQLITE_PATH ?? "data/jataka.db");
  mkdirSync(dirname(file), { recursive: true });
  url = pathToFileURL(file).href;
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
await db.batch(SCHEMA, "write");

const hash = await hashPassword(password);
const existing = await db.execute({ sql: "SELECT id FROM users WHERE username = ?", args: [username] });
if (existing.rows.length) {
  await db.execute({ sql: "UPDATE users SET password_hash = ? WHERE username = ?", args: [hash, username] });
  console.log(`Updated password for "${username}"`);
} else {
  await db.execute({
    sql: "INSERT INTO users (id, username, full_name, password_hash, role) VALUES (?, ?, ?, ?, 'admin')",
    args: [randomUUID(), username, fullName || username, hash],
  });
  console.log(`Created user "${username}"`);
}
db.close();
