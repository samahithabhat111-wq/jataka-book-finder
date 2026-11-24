// One-time copy of the local SQLite file (data/jataka.db) into your Turso cloud database.
// Usage (PowerShell):
//   $env:TURSO_DATABASE_URL="libsql://<db>.turso.io"; $env:TURSO_AUTH_TOKEN="<token>"; npm run migrate-to-turso
// Safe to re-run: existing rows are overwritten, nothing is deleted from Turso.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import { SCHEMA } from "../src/api/schema.server.ts";

const remoteUrl = process.env.TURSO_DATABASE_URL;
if (!remoteUrl) {
  console.error("Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN) first.");
  process.exit(1);
}

const local = createClient({ url: pathToFileURL(resolve(process.env.SQLITE_PATH ?? "data/jataka.db")).href });
const remote = createClient({ url: remoteUrl.replace(/^libsql:/, "https:"), authToken: process.env.TURSO_AUTH_TOKEN });

await remote.batch(SCHEMA, "write");

// Parents before children so foreign keys are satisfied.
for (const table of ["users", "jatakas", "jataka_photos"]) {
  const rs = await local.execute(`SELECT * FROM ${table}`);
  const cols = rs.columns;
  const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
  const stmts = rs.rows.map((r) => ({
    sql,
    args: cols.map((_, i) => (r[i] instanceof ArrayBuffer ? new Uint8Array(r[i]) : r[i])),
  }));
  // Small batches keep photo rows under request size limits.
  for (let i = 0; i < stmts.length; i += 10) await remote.batch(stmts.slice(i, i + 10), "write");
  console.log(`${table}: copied ${stmts.length} row(s)`);
}
console.log("Done.");
