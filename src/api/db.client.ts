import { createClient, type Client, type ResultSet } from "@libsql/client/web";
import { SCHEMA } from "./schema.server";

type Arg = string | number | null | Uint8Array;

let client: Client | undefined;
let ready: Promise<void> | undefined;

function getClient(): Client {
  if (!client) {
    const url = import.meta.env.VITE_TURSO_DATABASE_URL as string | undefined;
    if (!url) throw new Error("Database is not configured (VITE_TURSO_DATABASE_URL).");
    // libsql:// is websocket based; the HTTP transport is more reliable inside a WebView.
    client = createClient({
      url: url.replace(/^libsql:/, "https:"),
      authToken: import.meta.env.VITE_TURSO_AUTH_TOKEN as string | undefined,
    });
  }
  return client;
}

async function db(): Promise<Client> {
  const c = getClient();
  ready ??= c.batch(SCHEMA, "write").then(
    () => undefined,
    (e) => {
      ready = undefined;
      throw e;
    },
  );
  await ready;
  return c;
}

function rowsOf<T>(rs: ResultSet): T[] {
  return rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, r[i]]))) as T[];
}

export async function queryAll<T = Record<string, unknown>>(sql: string, args: Arg[] = []): Promise<T[]> {
  return rowsOf<T>(await (await db()).execute({ sql, args }));
}

export async function queryOne<T = Record<string, unknown>>(sql: string, args: Arg[] = []): Promise<T | null> {
  return (await queryAll<T>(sql, args))[0] ?? null;
}

export async function run(sql: string, args: Arg[] = []) {
  return (await db()).execute({ sql, args });
}
