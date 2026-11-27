// Runs once when the Next.js server starts, before it accepts requests.
// Applies DB migrations and makes sure n8n's restricted role exists.

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (!process.env.DATABASE_URL) {
    console.warn("[startup] DATABASE_URL is not set, skipping migrations");
    return;
  }

  const { getPool } = await import("@/lib/db");
  const { runMigrations, ensureN8nRole } = await import("@/lib/migrate");
  const { migrations } = await import("@/lib/migrations");

  const pool = getPool();
  const applied = await runMigrations(pool, migrations);
  console.log(
    applied.length ? `[startup] applied migrations: ${applied.join(", ")}` : "[startup] schema up to date",
  );

  const n8nPassword = process.env.N8N_DB_PASSWORD;
  if (n8nPassword) {
    await ensureN8nRole(pool, n8nPassword);
    console.log("[startup] n8n database role ready");
  }
}
