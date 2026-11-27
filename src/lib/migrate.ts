import type { Pool, PoolClient } from "pg";
import type { Migration } from "@/lib/migrations";

// Arbitrary constant so two app containers never migrate at the same time.
const MIGRATION_LOCK_ID = 727_001;

export const N8N_ROLE = "n8n";
export const N8N_SCHEMA = "n8n";

export async function runMigrations(pool: Pool, migrations: Migration[]): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    const { rows } = await client.query<{ id: string }>("SELECT id FROM schema_migrations");
    const done = new Set(rows.map((r) => r.id));

    for (const migration of migrations) {
      if (done.has(migration.id)) continue;
      await inTransaction(client, async () => {
        await client.query(migration.sql);
        await client.query("INSERT INTO schema_migrations (id) VALUES ($1)", [migration.id]);
      });
      applied.push(migration.id);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
  return applied;
}

// Restricted login role for n8n: owns only its own schema, no rights on the app's tables.
// Grant read access to specific app tables in a later migration if a workflow needs it.
// Safe to run on every start: it also resets the password to the current env value.
export async function ensureN8nRole(pool: Pool, password: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await inTransaction(client, async () => {
      const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [N8N_ROLE]);
      const verb = exists.rowCount ? "ALTER" : "CREATE";
      // format(%I, %L) quotes the name and password safely; DDL can't take bind parameters.
      const stmt = await client.query<{ sql: string }>(
        `SELECT format('${verb} ROLE %I WITH LOGIN PASSWORD %L', $1::text, $2::text) AS sql`,
        [N8N_ROLE, password],
      );
      await client.query(stmt.rows[0].sql);
      const schema = await client.query<{ sql: string }>(
        "SELECT format('CREATE SCHEMA IF NOT EXISTS %I AUTHORIZATION %I', $1::text, $2::text) AS sql",
        [N8N_SCHEMA, N8N_ROLE],
      );
      await client.query(schema.rows[0].sql);
      // n8n runs "CREATE SCHEMA IF NOT EXISTS" on every start, which Postgres only allows
      // with CREATE on the database, even when the schema exists. Without this grant
      // n8n hangs at "Initializing n8n process" with no error in its own log.
      const grant = await client.query<{ sql: string }>(
        "SELECT format('GRANT CREATE ON DATABASE %I TO %I', current_database(), $1::text) AS sql",
        [N8N_ROLE],
      );
      await client.query(grant.rows[0].sql);
    });
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
}

async function inTransaction(client: PoolClient, fn: () => Promise<void>): Promise<void> {
  await client.query("BEGIN");
  try {
    await fn();
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}
