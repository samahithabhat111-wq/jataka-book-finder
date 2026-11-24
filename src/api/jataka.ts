import { z } from "zod";
import { queryAll, queryOne, run } from "./db.client";
import { hashPassword, verifyPassword } from "./password.client";
import { cacheClear, cacheGet, cacheSet } from "@/lib/offline-cache";

// Runs entirely inside the app: talks straight to the cloud (Turso) database, keeps a local
// read cache so previously viewed records still open without internet.

export type Role = "admin" | "astrologer";
export type SessionUser = { id: string; username: string; full_name: string | null; role: Role };

// Errors we raise on purpose (validation, permissions). Anything else is treated as a connectivity problem.
class AppError extends Error {}

const SESSION_KEY = "jms_session";
const USER_KEY = "jms_user";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const OFFLINE_MSG = "You're offline. Connect to the internet to make changes.";

// Ready first, then Preparing, then Collected.
const STATUS_RANK = "CASE status WHEN 'ready' THEN 0 WHEN 'preparing' THEN 1 ELSE 2 END";
const SUMMARY_COLS =
  "id, jataka_number, client_name, date_of_birth, time_of_birth, father_name, mother_name, phone, place, status, created_at";
const PAGE_SIZE_DEFAULT = 10;

const statusEnum = z.enum(["preparing", "ready", "collected"]);
const optionalText = z
  .string()
  .trim()
  .max(200)
  .nullish()
  .transform((v) => v || null);

const jatakaInput = z.object({
  jataka_number: z.string().trim().min(1, "Jataka Number is required").max(50),
  client_name: optionalText,
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of Birth is required"),
  time_of_birth: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Time of Birth is required"),
  father_name: optionalText,
  mother_name: optionalText,
  phone: optionalText,
  place: optionalText,
  status: statusEnum,
});

const MAX_PHOTO_BYTES = 2_500_000;
const photoInput = z
  .union([z.object({ mime: z.enum(["image/jpeg", "image/png", "image/webp"]), data: z.string().max(3_500_000) }), z.null()])
  .optional();

const pageInput = {
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(PAGE_SIZE_DEFAULT),
};

const likeEscape = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export type JatakaSummary = {
  id: string;
  jataka_number: string;
  client_name: string | null;
  date_of_birth: string;
  time_of_birth: string;
  father_name: string | null;
  mother_name: string | null;
  phone: string | null;
  place: string | null;
  status: "preparing" | "ready" | "collected";
  created_at: string;
};

function parse<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw new AppError(r.error.issues[0]?.message ?? "Invalid input");
  return r.data;
}

const sha256 = async (v: string) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(v))))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// Network first; when the network is unavailable fall back to the last result stored on the phone.
async function cachedRead<T>(key: string, load: () => Promise<T>): Promise<T> {
  try {
    const value = await load();
    void cacheSet(key, value);
    return value;
  } catch (e) {
    if (e instanceof AppError) throw e;
    const hit = await cacheGet<T>(key);
    if (hit !== undefined) return hit;
    throw e;
  }
}

async function write<T>(op: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new AppError(OFFLINE_MSG);
  try {
    return await op();
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(navigator.onLine === false ? OFFLINE_MSG : `Could not reach the server. ${e instanceof Error ? e.message : ""}`.trim());
  }
}

function isUniqueNumberError(e: unknown) {
  return e instanceof Error && /UNIQUE constraint failed: jatakas\.jataka_number/.test(e.message);
}

// Accepts DD/MM/YYYY, DD-MM-YYYY or DD.MM.YYYY and returns ISO, otherwise null.
function toIsoDate(term: string): string | null {
  const m = term.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

type Where = { sql: string; args: string[] };

function quickWhere(term: string): Where {
  const iso = toIsoDate(term) ?? (/^\d{4}-\d{2}-\d{2}$/.test(term) ? term : null);
  if (iso) return { sql: "date_of_birth = ?", args: [iso] };
  const like = likeEscape(term);
  const cols = ["jataka_number", "client_name", "father_name", "mother_name", "phone", "place", "date_of_birth", "time_of_birth"];
  return { sql: cols.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(" OR "), args: cols.map(() => like) };
}

async function pagedRows(where: Where | null, order: string, page: number, pageSize: number) {
  const w = where ? `WHERE ${where.sql}` : "";
  const args = where?.args ?? [];
  const [count, rows] = await Promise.all([
    queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM jatakas ${w}`, args),
    queryAll<JatakaSummary>(`SELECT ${SUMMARY_COLS} FROM jatakas ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, [
      ...args,
      pageSize,
      (page - 1) * pageSize,
    ]),
  ]);
  return { rows, total: Number(count?.n ?? 0), page, pageSize };
}

// ---------- Session ----------

function storedUser(): SessionUser | null {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
  } catch {
    return null;
  }
}

async function fetchSessionUser(): Promise<SessionUser | null> {
  const token = localStorage.getItem(SESSION_KEY);
  if (!token) return null;
  return queryOne<SessionUser>(
    `SELECT u.id, u.username, u.full_name, u.role FROM sessions s
     JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`,
    [await sha256(token), Date.now()],
  );
}

async function requireUser(): Promise<SessionUser> {
  const user = await fetchSessionUser();
  if (!user) throw new AppError("Not signed in");
  return user;
}

async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new AppError("Only an admin can do this.");
  return user;
}

export const getMe = async (): Promise<SessionUser | null> => {
  if (!localStorage.getItem(SESSION_KEY)) return null;
  try {
    const user = await fetchSessionUser();
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(USER_KEY);
    }
    return user;
  } catch {
    // Offline: trust the last verified user so the cached records stay reachable.
    return storedUser();
  }
};

export const signIn = async ({ data }: { data: { username: string; password: string } }): Promise<SessionUser> => {
  const d = parse(
    z.object({
      username: z.string().trim().min(1, "Enter your username").max(100),
      password: z.string().min(1, "Enter your password").max(200),
    }),
    data,
  );
  const row = await write(() =>
    queryOne<SessionUser & { password_hash: string }>(
      "SELECT id, username, full_name, role, password_hash FROM users WHERE username = ?",
      [d.username],
    ),
  );
  if (!row || !(await verifyPassword(d.password, row.password_hash))) throw new AppError("Invalid username or password");
  const token = randomToken();
  await write(async () => {
    await run("DELETE FROM sessions WHERE expires_at < ?", [Date.now()]);
    await run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
      await sha256(token),
      row.id,
      Date.now() + SESSION_TTL_MS,
    ]);
  });
  const user: SessionUser = { id: row.id, username: row.username, full_name: row.full_name, role: row.role };
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
};

export const signOut = async () => {
  const token = localStorage.getItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_KEY);
  await cacheClear();
  if (token) {
    try {
      await run("DELETE FROM sessions WHERE token_hash = ?", [await sha256(token)]);
    } catch {
      // Offline sign out still clears this device.
    }
  }
  return { ok: true };
};

export const changeOwnPassword = ({ data }: { data: { current: string; next: string } }) =>
  write(async () => {
    const d = parse(z.object({ current: z.string().min(1), next: z.string().min(6, "Password must be at least 6 characters").max(200) }), data);
    const user = await requireUser();
    const row = await queryOne<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
    if (!row || !(await verifyPassword(d.current, row.password_hash))) throw new AppError("Current password is incorrect");
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(d.next), user.id]);
    return { ok: true };
  });

// ---------- Users (admin only) ----------

export const listUsers = async () => {
  await requireAdmin();
  return cachedRead("listUsers", () =>
    queryAll<{ id: string; username: string; full_name: string | null; role: Role; created_at: string }>(
      "SELECT id, username, full_name, role, created_at FROM users ORDER BY created_at",
    ),
  );
};

export const createUser = ({ data }: { data: { username: string; full_name: string; password: string; role?: Role } }) =>
  write(async () => {
    const d = parse(
      z.object({
        username: z.string().trim().min(3, "Username must be at least 3 characters").max(50).regex(/^[\w.-]+$/, "Use letters, numbers, . _ - only"),
        full_name: z.string().trim().max(100),
        password: z.string().min(6, "Password must be at least 6 characters").max(200),
        role: z.enum(["admin", "astrologer"]).default("astrologer"),
      }),
      data,
    );
    await requireAdmin();
    if (await queryOne("SELECT 1 FROM users WHERE username = ?", [d.username])) throw new AppError("This username is already taken");
    await run("INSERT INTO users (id, username, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?)", [
      crypto.randomUUID(),
      d.username,
      d.full_name || d.username,
      await hashPassword(d.password),
      d.role,
    ]);
    return { ok: true };
  });

export const resetUserPassword = ({ data }: { data: { id: string; password: string } }) =>
  write(async () => {
    const d = parse(z.object({ id: z.string(), password: z.string().min(6, "Password must be at least 6 characters").max(200) }), data);
    await requireAdmin();
    await run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(d.password), d.id]);
    await run("DELETE FROM sessions WHERE user_id = ?", [d.id]);
    return { ok: true };
  });

export const deleteUser = ({ data }: { data: { id: string } }) =>
  write(async () => {
    const d = parse(z.object({ id: z.string() }), data);
    const me = await requireAdmin();
    if (me.id === d.id) throw new AppError("You cannot delete your own account");
    await run("DELETE FROM users WHERE id = ?", [d.id]);
    return { ok: true };
  });

// ---------- Dashboard & reports ----------

export const getDashboard = async () => {
  await requireUser();
  return cachedRead("dashboard", async () => {
    const rows = await queryAll<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM jatakas GROUP BY status");
    const by = Object.fromEntries(rows.map((r) => [r.status, Number(r.n)]));
    return {
      counts: {
        preparing: by.preparing ?? 0,
        ready: by.ready ?? 0,
        collected: by.collected ?? 0,
        total: rows.reduce((s, r) => s + Number(r.n), 0),
      },
    };
  });
};

export const getReports = async () => {
  await requireUser();
  return cachedRead("reports", async () => {
    const [monthly, byPlace, totals] = await Promise.all([
      queryAll<{ month: string; n: number }>(
        `SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS n FROM jatakas
         WHERE created_at >= strftime('%Y-%m-01', 'now', '-11 months') GROUP BY month ORDER BY month`,
      ),
      queryAll<{ place: string; n: number }>(
        `SELECT place, COUNT(*) AS n FROM jatakas WHERE place IS NOT NULL AND place <> ''
         GROUP BY place COLLATE NOCASE ORDER BY n DESC LIMIT 8`,
      ),
      queryOne<{ total: number; today: number; month: number }>(
        `SELECT COUNT(*) AS total,
                SUM(CASE WHEN substr(created_at, 1, 10) = date('now') THEN 1 ELSE 0 END) AS today,
                SUM(CASE WHEN substr(created_at, 1, 7) = strftime('%Y-%m', 'now') THEN 1 ELSE 0 END) AS month
         FROM jatakas`,
      ),
    ]);
    return {
      monthly: monthly.map((m) => ({ month: m.month, n: Number(m.n) })),
      byPlace: byPlace.map((p) => ({ place: p.place, n: Number(p.n) })),
      total: Number(totals?.total ?? 0),
      today: Number(totals?.today ?? 0),
      month: Number(totals?.month ?? 0),
    };
  });
};

// ---------- Search & lists ----------

export const quickSearch = async ({ data }: { data: { q: string } }) => {
  const d = parse(z.object({ q: z.string().trim().max(100) }), data);
  await requireUser();
  if (!d.q) return { rows: [] as JatakaSummary[], total: 0 };
  return cachedRead(`quick:${d.q}`, async () => {
    const w = quickWhere(d.q);
    const [rows, count] = await Promise.all([
      queryAll<JatakaSummary>(
        `SELECT ${SUMMARY_COLS} FROM jatakas WHERE ${w.sql}
         ORDER BY (jataka_number = ?) DESC, ${STATUS_RANK}, created_at DESC LIMIT 5`,
        [...w.args, d.q],
      ),
      queryOne<{ n: number }>(`SELECT COUNT(*) AS n FROM jatakas WHERE ${w.sql}`, w.args),
    ]);
    return { rows, total: Number(count?.n ?? 0) };
  });
};

export const searchJatakas = async ({ data }: { data: { q: string; page?: number; pageSize?: number } }) => {
  const d = parse(z.object({ q: z.string().trim().max(100), ...pageInput }), data);
  await requireUser();
  if (!d.q) return { rows: [] as JatakaSummary[], total: 0, page: 1, pageSize: d.pageSize };
  return cachedRead(`search:${JSON.stringify(d)}`, () =>
    pagedRows(quickWhere(d.q), `${STATUS_RANK}, created_at DESC`, d.page, d.pageSize),
  );
};

export const listJatakas = async ({ data }: { data: { status?: string; sort?: "status" | "recent"; page?: number; pageSize?: number } }) => {
  const d = parse(z.object({ status: z.string().optional(), sort: z.enum(["status", "recent"]).default("status"), ...pageInput }), data);
  await requireUser();
  return cachedRead(`list:${JSON.stringify(d)}`, () => {
    const where: Where | null = statusEnum.safeParse(d.status).success ? { sql: "status = ?", args: [d.status as string] } : null;
    const order = d.sort === "recent" ? "created_at DESC" : `${STATUS_RANK}, created_at DESC`;
    return pagedRows(where, order, d.page, d.pageSize);
  });
};

export const advancedSearch = async ({
  data,
}: {
  data: {
    jataka_number: string;
    client_name: string;
    date_of_birth: string;
    time_of_birth: string;
    father_name: string;
    mother_name: string;
    phone: string;
    place: string;
    status: string;
    page?: number;
    pageSize?: number;
  };
}) => {
  const d = parse(
    z.object({
      jataka_number: z.string().trim().max(50),
      client_name: z.string().trim().max(200),
      date_of_birth: z.string().trim(),
      time_of_birth: z.string().trim(),
      father_name: z.string().trim().max(200),
      mother_name: z.string().trim().max(200),
      phone: z.string().trim().max(50),
      place: z.string().trim().max(200),
      status: z.string(),
      ...pageInput,
    }),
    data,
  );
  await requireUser();
  return cachedRead(`adv:${JSON.stringify(d)}`, () => {
    const clauses: string[] = [];
    const args: string[] = [];
    for (const col of ["jataka_number", "client_name", "father_name", "mother_name", "phone", "place"] as const) {
      if (d[col]) {
        clauses.push(`${col} LIKE ? ESCAPE '\\'`);
        args.push(likeEscape(d[col]));
      }
    }
    if (d.date_of_birth) {
      clauses.push("date_of_birth = ?");
      args.push(d.date_of_birth);
    }
    if (d.time_of_birth) {
      clauses.push("substr(time_of_birth, 1, 5) = ?");
      args.push(d.time_of_birth.slice(0, 5));
    }
    if (statusEnum.safeParse(d.status).success) {
      clauses.push("status = ?");
      args.push(d.status);
    }
    const where = clauses.length ? { sql: clauses.join(" AND "), args } : null;
    return pagedRows(where, `${STATUS_RANK}, created_at DESC`, d.page, d.pageSize);
  });
};

// ---------- Jataka records ----------

export const getJataka = async ({ data }: { data: { id: string } }) => {
  const d = parse(z.object({ id: z.string() }), data);
  await requireUser();
  return cachedRead(`jataka:${d.id}`, () =>
    queryOne<JatakaSummary & { has_photo: number }>(
      "SELECT *, EXISTS(SELECT 1 FROM jataka_photos p WHERE p.jataka_id = jatakas.id) AS has_photo FROM jatakas WHERE id = ?",
      [d.id],
    ),
  );
};

export const getPhoto = async ({ data }: { data: { id: string } }) => {
  const d = parse(z.object({ id: z.string() }), data);
  await requireUser();
  return cachedRead(`photo:${d.id}`, async () => {
    const row = await queryOne<{ mime: string; data: ArrayBuffer }>("SELECT mime, data FROM jataka_photos WHERE jataka_id = ?", [d.id]);
    if (!row) return null;
    return { url: `data:${row.mime};base64,${bytesToBase64(row.data)}` };
  });
};

// undefined = leave as is, null = remove, object = replace.
async function savePhoto(jatakaId: string, photo: z.infer<typeof photoInput>) {
  if (photo === undefined) return;
  if (photo === null) {
    await run("DELETE FROM jataka_photos WHERE jataka_id = ?", [jatakaId]);
    return;
  }
  const bytes = base64ToBytes(photo.data);
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) throw new AppError("Photo is too large. Please choose a smaller image.");
  await run("INSERT OR REPLACE INTO jataka_photos (jataka_id, mime, data) VALUES (?, ?, ?)", [jatakaId, photo.mime, bytes]);
}

export const findDuplicates = async ({
  data,
}: {
  data: { exclude_id?: string; client_name: string; date_of_birth: string; time_of_birth: string; phone: string };
}) => {
  const d = parse(
    z.object({
      exclude_id: z.string().optional(),
      client_name: z.string().trim(),
      date_of_birth: z.string().trim(),
      time_of_birth: z.string().trim(),
      phone: z.string().trim(),
    }),
    data,
  );
  await requireUser();
  const clauses: string[] = [];
  const args: string[] = [];
  if (d.client_name && d.date_of_birth && d.time_of_birth) {
    clauses.push("(client_name = ? COLLATE NOCASE AND date_of_birth = ? AND substr(time_of_birth, 1, 5) = ?)");
    args.push(d.client_name, d.date_of_birth, d.time_of_birth.slice(0, 5));
  }
  if (d.phone) {
    clauses.push("phone = ?");
    args.push(d.phone);
  }
  if (!clauses.length) return [];
  const exclude = d.exclude_id ? " AND id <> ?" : "";
  if (d.exclude_id) args.push(d.exclude_id);
  return queryAll<{ id: string; jataka_number: string; client_name: string | null; date_of_birth: string; phone: string | null }>(
    `SELECT id, jataka_number, client_name, date_of_birth, phone FROM jatakas WHERE (${clauses.join(" OR ")})${exclude} LIMIT 10`,
    args,
  );
};

export const createJataka = ({ data }: { data: z.input<typeof jatakaInput> & { photo?: z.input<typeof photoInput> } }) =>
  write(async () => {
    const d = parse(jatakaInput.extend({ photo: photoInput }), data);
    const user = await requireAdmin();
    const id = crypto.randomUUID();
    try {
      await run(
        `INSERT INTO jatakas (id, jataka_number, client_name, date_of_birth, time_of_birth, father_name, mother_name, phone, place, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, d.jataka_number, d.client_name, d.date_of_birth, d.time_of_birth, d.father_name, d.mother_name, d.phone, d.place, d.status, user.id],
      );
    } catch (e) {
      if (isUniqueNumberError(e)) throw new AppError("This Jataka Number already exists.");
      throw e;
    }
    try {
      await savePhoto(id, d.photo);
    } catch (e) {
      await run("DELETE FROM jatakas WHERE id = ?", [id]);
      throw e;
    }
    return { id };
  });

export const updateJataka = ({ data }: { data: { id: string; values: z.input<typeof jatakaInput> & { photo?: z.input<typeof photoInput> } } }) =>
  write(async () => {
    const d = parse(z.object({ id: z.string(), values: jatakaInput.extend({ photo: photoInput }) }), data);
    await requireAdmin();
    const v = d.values;
    try {
      await run(
        `UPDATE jatakas SET jataka_number = ?, client_name = ?, date_of_birth = ?, time_of_birth = ?, father_name = ?,
           mother_name = ?, phone = ?, place = ?, status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
         WHERE id = ?`,
        [v.jataka_number, v.client_name, v.date_of_birth, v.time_of_birth, v.father_name, v.mother_name, v.phone, v.place, v.status, d.id],
      );
    } catch (e) {
      if (isUniqueNumberError(e)) throw new AppError("This Jataka Number already exists.");
      throw e;
    }
    await savePhoto(d.id, v.photo);
    return { ok: true };
  });

export const deleteJataka = ({ data }: { data: { id: string } }) =>
  write(async () => {
    const d = parse(z.object({ id: z.string() }), data);
    await requireAdmin();
    await run("DELETE FROM jataka_photos WHERE jataka_id = ?", [d.id]);
    await run("DELETE FROM jatakas WHERE id = ?", [d.id]);
    return { ok: true };
  });
