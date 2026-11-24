const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')";

export const SCHEMA: string[] = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    full_name TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'astrologer')),
    created_at TEXT NOT NULL DEFAULT (${NOW})
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS jatakas (
    id TEXT PRIMARY KEY,
    jataka_number TEXT NOT NULL UNIQUE,
    client_name TEXT,
    date_of_birth TEXT NOT NULL,
    time_of_birth TEXT NOT NULL,
    father_name TEXT,
    mother_name TEXT,
    phone TEXT,
    place TEXT,
    status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'ready', 'collected')),
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (${NOW}),
    updated_at TEXT NOT NULL DEFAULT (${NOW})
  )`,
  "CREATE INDEX IF NOT EXISTS sessions_expires_idx ON sessions (expires_at)",
  // Photos live in the database (not on disk) so they work on serverless hosting and are
  // visible to every signed-in user. Kept separate so list/search queries stay light.
  `CREATE TABLE IF NOT EXISTS jataka_photos (
    jataka_id TEXT PRIMARY KEY REFERENCES jatakas(id) ON DELETE CASCADE,
    mime TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (${NOW})
  )`,
  "CREATE INDEX IF NOT EXISTS jatakas_created_at_idx ON jatakas (created_at DESC)",
  "CREATE INDEX IF NOT EXISTS jatakas_dob_idx ON jatakas (date_of_birth)",
  "CREATE INDEX IF NOT EXISTS jatakas_status_idx ON jatakas (status)",
  "CREATE INDEX IF NOT EXISTS jatakas_phone_idx ON jatakas (phone)",
  "CREATE INDEX IF NOT EXISTS jatakas_name_idx ON jatakas (client_name COLLATE NOCASE)",
];
