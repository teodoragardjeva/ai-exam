import { connection } from "next/server";
import { getPool } from "@/lib/db";

// Used by the Docker healthcheck and for quick checks: GET /api/health
export async function GET() {
  await connection();
  try {
    await getPool().query("SELECT 1");
    return Response.json({ status: "ok", db: "ok" });
  } catch {
    return Response.json({ status: "error", db: "unreachable" }, { status: 503 });
  }
}
