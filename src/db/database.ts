import { neon } from '@neondatabase/serverless';

export type SqlValue = string | number | boolean | null;

export interface SqlResult {
  rows: Record<string, unknown>[];
  rowsAffected: number;
}

export interface SqlClient {
  execute(statement: { sql: string; args: SqlValue[] }): Promise<SqlResult>;
  executeMultiple(statements: string): Promise<void>;
  close(): void;
}

function toPostgresPlaceholders(statement: string): string {
  let parameterIndex = 0;
  return statement.replace(/\?/g, () => `$${++parameterIndex}`);
}

function splitStatements(statements: string): string[] {
  return statements
    .split(';')
    .map((statement) => statement.trim())
    .filter(Boolean);
}

let db: SqlClient | null = null;

export function getDatabase(): SqlClient {
  if (db) return db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Connect a Postgres database before starting NyxScribe.');
  }

  const sql = neon(connectionString);
  db = {
    async execute({ sql: statement, args }): Promise<SqlResult> {
      const result = await sql.query(toPostgresPlaceholders(statement), args, { fullResults: true });
      return {
        rows: result.rows as Record<string, unknown>[],
        rowsAffected: result.rowCount,
      };
    },
    async executeMultiple(statements): Promise<void> {
      for (const statement of splitStatements(statements)) {
        await sql.query(statement);
      }
    },
    close(): void {
      db = null;
    },
  };

  return db;
}

export function closeDatabase(): void {
  db?.close();
}
