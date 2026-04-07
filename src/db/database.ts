import { createClient, Client } from '@libsql/client';

// For Turso cloud: set LIBSQL_URL (e.g. libsql://your-db.turso.io) and LIBSQL_AUTH_TOKEN
// For local dev: LIBSQL_URL defaults to a local SQLite file
const DB_URL = process.env.LIBSQL_URL ?? 'file:./nyxscribe.db';
const DB_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN;

let db: Client | null = null;

export function getDatabase(): Client {
  if (!db) {
    db = createClient({ url: DB_URL, authToken: DB_AUTH_TOKEN });
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
