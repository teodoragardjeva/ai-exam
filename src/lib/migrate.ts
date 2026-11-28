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

// Role used by n8n workflows (Postgres / PGVector / Chat Memory credentials).
export const N8N_APP_ROLE = "n8n_app";
// Read-only role for the manager assistant's database tool.
export const N8N_READONLY_ROLE = "n8n_readonly";

// Least privilege for the workflow roles. Re-applied on every start, so a new table only
// needs a line here. Missing roles are skipped (e.g. when their password isn't set).
export const GRANTS: { role: string; sql: string[] }[] = [
  {
    role: N8N_APP_ROLE,
    sql: [
      "GRANT USAGE ON SCHEMA public TO n8n_app",
      "GRANT SELECT ON orders TO n8n_app",
      "GRANT SELECT, INSERT, UPDATE ON tickets TO n8n_app",
      "GRANT USAGE, SELECT ON SEQUENCE tickets_id_seq, ticket_number_seq TO n8n_app",
      "GRANT SELECT, INSERT, UPDATE, DELETE ON kb_documents TO n8n_app",
      "GRANT INSERT ON security_log, error_log TO n8n_app",
      "GRANT USAGE ON SEQUENCE security_log_id_seq, error_log_id_seq TO n8n_app",
      "GRANT SELECT, INSERT, DELETE ON n8n_chat_histories TO n8n_app",
      "GRANT USAGE, SELECT ON SEQUENCE n8n_chat_histories_id_seq TO n8n_app",
    ],
  },
  {
    role: N8N_READONLY_ROLE,
    sql: [
      "GRANT USAGE ON SCHEMA public TO n8n_readonly",
      "GRANT SELECT ON tickets, orders TO n8n_readonly",
    ],
  },
];

// Creates a login role or resets its password to the current env value. Safe on every start.
async function upsertLoginRole(client: PoolClient, role: string, password: string): Promise<void> {
  const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
  const verb = exists.rowCount ? "ALTER" : "CREATE";
  // format(%I, %L) quotes the name and password safely; DDL can't take bind parameters.
  const stmt = await client.query<{ sql: string }>(
    `SELECT format('${verb} ROLE %I WITH LOGIN PASSWORD %L', $1::text, $2::text) AS sql`,
    [role, password],
  );
  await client.query(stmt.rows[0].sql);
}

// Login roles for the workflows, with the grants above. Runs after the migrations.
export async function ensureWorkflowRoles(
  pool: Pool,
  passwords: { app?: string; readonly?: string },
): Promise<string[]> {
  const client = await pool.connect();
  const ready: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await inTransaction(client, async () => {
      if (passwords.app) await upsertLoginRole(client, N8N_APP_ROLE, passwords.app);
      if (passwords.readonly) await upsertLoginRole(client, N8N_READONLY_ROLE, passwords.readonly);
      for (const { role, sql } of GRANTS) {
        const exists = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [role]);
        if (!exists.rowCount) continue;
        for (const stmt of sql) await client.query(stmt);
        ready.push(role);
      }
    });
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => {});
    client.release();
  }
  return ready;
}

// Two extra demo orders with your own email, so reply emails reach you (Appendix B asks for this).
// Copies of the scenario 1 (R2) and scenario 2 (R3) orders. Set DEMO_ORDER_EMAIL to enable.
export async function ensureDemoOrders(pool: Pool, email: string, name: string): Promise<void> {
  await pool.query(
    `INSERT INTO orders (order_number, customer_name, customer_email, product, purchase_date, amount_eur, delivery_status)
     VALUES ('HT-10501', $1, $2, 'HT Plug Mini (2 бр.)', CURRENT_DATE - 5, 39.80, 'Доставена'),
            ('HT-10502', $1, $2, 'HT Cam Outdoor', CURRENT_DATE - 12, 149.00, 'Доставена')
     ON CONFLICT (order_number) DO UPDATE SET customer_name = EXCLUDED.customer_name, customer_email = EXCLUDED.customer_email`,
    [name, email],
  );
}

// Restricted login role for n8n's own data: owns only its own schema, no rights on the app's tables.
// Safe to run on every start: it also resets the password to the current env value.
export async function ensureN8nRole(pool: Pool, password: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await inTransaction(client, async () => {
      await upsertLoginRole(client, N8N_ROLE, password);
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
