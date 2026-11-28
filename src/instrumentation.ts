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
  const { runMigrations, ensureN8nRole, ensureWorkflowRoles, ensureDemoOrders } = await import("@/lib/migrate");
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

  const roles = await ensureWorkflowRoles(pool, {
    app: process.env.N8N_APP_DB_PASSWORD,
    readonly: process.env.N8N_READONLY_DB_PASSWORD,
  });
  console.log(`[startup] workflow roles ready: ${roles.join(", ") || "none (passwords not set)"}`);

  const demoEmail = process.env.DEMO_ORDER_EMAIL;
  if (demoEmail) {
    await ensureDemoOrders(pool, demoEmail, process.env.DEMO_ORDER_NAME || "Тест Клиент");
    console.log("[startup] demo orders HT-10501, HT-10502 ready");
  }
}
