/**
 * Database access layer.
 *
 * Production: set DATABASE_URL (postgres://...) and the app uses a pooled
 * `pg` connection. Development (default): uses PGlite — the real PostgreSQL
 * engine compiled to WebAssembly — persisted under data/pgdata. SQL written
 * for this layer is standard PostgreSQL and runs unchanged on either engine.
 */
import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { NodeFS } from "@electric-sql/pglite/nodefs";
import { Pool, type PoolClient } from "pg";

export interface Queryable {
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }>;
}

type Driver = "pg" | "pglite";

const globalForDb = globalThis as unknown as {
  __vompPool?: Pool;
  __vompPglite?: Promise<PGlite>;
  __vompMigrated?: Promise<void>;
};

function usePg(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

function pool(): Pool {
  if (!globalForDb.__vompPool) {
    globalForDb.__vompPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: process.env.DATABASE_SSL_STRICT !== "false" }
          : undefined,
      application_name: "vomp-admin",
    });
  }
  return globalForDb.__vompPool;
}

async function pglite(): Promise<PGlite> {
  if (!globalForDb.__vompPglite) {
    const dir = path.join(process.cwd(), "data", "pgdata");
    fs.mkdirSync(dir, { recursive: true });
    globalForDb.__vompPglite = PGlite.create({ fs: new NodeFS(dir) });
  }
  return globalForDb.__vompPglite;
}

function pgliteQueryable(db: PGlite): Queryable {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await db.query<T>(text, params);
      return { rows: res.rows, rowCount: res.rows.length };
    },
  };
}

function pgQueryable(client: Pool | PoolClient): Queryable {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await client.query(text, params);
      return { rows: res.rows as T[], rowCount: res.rowCount ?? res.rows.length };
    },
  };
}

export function driver(): Driver {
  return usePg() ? "pg" : "pglite";
}

/** Low-level query that never triggers migrations (used by the seed itself). */
export async function rawQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  if (usePg()) {
    const res = await pool().query(text, params);
    return res.rows as T[];
  }
  const db = await pglite();
  const res = await db.query<T>(text, params);
  return res.rows;
}

export async function rawOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await rawQuery<T>(text, params);
  return rows[0] ?? null;
}

export async function rawExecute(
  text: string,
  params: unknown[] = []
): Promise<number> {
  if (usePg()) {
    const res = await pool().query(text, params);
    return res.rowCount ?? 0;
  }
  const db = await pglite();
  const res = await db.query(text, params);
  return res.affectedRows ?? res.rows.length;
}

/** Execute a parameterised query. Never interpolate user input into SQL. */
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  await ensureDatabase();
  return rawQuery<T>(text, params);
}

/** Return the first row or null. */
export async function one<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Run a statement and return affected row count. */
export async function execute(
  text: string,
  params: unknown[] = []
): Promise<number> {
  await ensureDatabase();
  return rawExecute(text, params);
}

/** Run a set of statements inside a serializable transaction. */
export async function transaction<T>(
  fn: (tx: Queryable) => Promise<T>
): Promise<T> {
  await ensureDatabase();
  if (usePg()) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      const result = await fn(pgQueryable(client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  const db = await pglite();
  return db.transaction(async (tx) => fn(pgliteQueryable(tx as unknown as PGlite)));
}

/** Apply the schema once per process. */
export async function ensureDatabase(): Promise<void> {
  if (!globalForDb.__vompMigrated) {
    globalForDb.__vompMigrated = migrate();
  }
  return globalForDb.__vompMigrated;
}

function schemaSql(): string {
  const candidates = [
    path.join(process.cwd(), "src", "lib", "db", "schema.sql"),
    path.join(process.cwd(), "dist", "lib", "db", "schema.sql"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return fs.readFileSync(candidate, "utf-8");
  }
  throw new Error("Database schema file not found");
}

async function migrate(): Promise<void> {
  const sql = schemaSql();
  if (usePg()) {
    const client = await pool().connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `SELECT pg_advisory_xact_lock(hashtext('vomp_schema_migration'))`
      );
      await client.query(sql);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } else {
    const db = await pglite();
    await db.exec(sql);
  }

  // Reference + bootstrap data. Kept idempotent so restarts are safe.
  const { seedCore } = await import("./seed");
  await seedCore();
}

/** Close the active connection. Used by CLI scripts so Node can exit cleanly. */
export async function closeDatabase(): Promise<void> {
  if (globalForDb.__vompPool) {
    await globalForDb.__vompPool.end().catch(() => undefined);
    globalForDb.__vompPool = undefined;
  }
  if (globalForDb.__vompPglite) {
    const db = await globalForDb.__vompPglite.catch(() => null);
    await db?.close().catch(() => undefined);
    globalForDb.__vompPglite = undefined;
  }
  globalForDb.__vompMigrated = undefined;
}

export async function healthCheck(): Promise<{
  ok: boolean;
  driver: Driver;
  latencyMs: number;
  error?: string;
}> {
  const started = Date.now();
  try {
    await query("SELECT 1");
    return { ok: true, driver: driver(), latencyMs: Date.now() - started };
  } catch (error) {
    return {
      ok: false,
      driver: driver(),
      latencyMs: Date.now() - started,
      error: error instanceof Error ? error.message : "unknown error",
    };
  }
}
