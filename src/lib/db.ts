import { Pool } from "pg";
import { requireEnv } from "@/lib/env";

// One pool per server process. Kept on globalThis so dev hot reload doesn't leak pools.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export function getPool(): Pool {
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = new Pool({
      connectionString: requireEnv("DATABASE_URL"),
      max: 10,
    });
  }
  return globalForDb.pgPool;
}
