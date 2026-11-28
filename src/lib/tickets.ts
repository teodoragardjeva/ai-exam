import { getPool } from "@/lib/db";
import { DEPARTMENTS, TICKET_STATUSES, URGENCIES } from "@/lib/migrations";
import type { TicketStatus } from "@/lib/validation";

export type Ticket = {
  ticket_number: string;
  created_at: string;
  updated_at: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  message: string;
  photo_path: string | null;
  photo_description: string | null;
  language: string | null;
  department: string | null;
  sentiment: string | null;
  sentiment_score: string | null;
  sentiment_confidence: string | null;
  urgency: string | null;
  ai_summary: string | null;
  ai_draft_reply: string | null;
  answer_found_in_kb: boolean | null;
  final_reply: string | null;
  refund_requested: boolean;
  refund_amount: string | null;
  policy_rule: string | null;
  status: TicketStatus;
  status_reason: string | null;
  handled_by: string | null;
};

export type TicketFilters = { status?: string; department?: string; urgency?: string };

// "Open" = still needs someone: everything except finished statuses.
export const OPEN_STATUSES: TicketStatus[] = ["New", "Waiting for approval", "Manual review"];

export function cleanFilters(input: Record<string, string | string[] | undefined>): TicketFilters {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const pick = <T extends readonly string[]>(v: string | undefined, allowed: T) =>
    v && (allowed as readonly string[]).includes(v) ? v : undefined;
  return {
    status: pick(one(input.status), TICKET_STATUSES),
    department: pick(one(input.department), DEPARTMENTS),
    urgency: pick(one(input.urgency), URGENCIES),
  };
}

export async function listTickets(filters: TicketFilters, limit = 200): Promise<Ticket[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  for (const [column, value] of Object.entries(filters)) {
    if (!value) continue;
    params.push(value);
    where.push(`${column} = $${params.length}`);
  }
  params.push(limit);
  const { rows } = await getPool().query<Ticket>(
    `SELECT * FROM tickets ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
     ORDER BY (urgency = 'High' AND status = ANY($${params.length + 1})) DESC, created_at DESC
     LIMIT $${params.length}`,
    [...params, OPEN_STATUSES],
  );
  return rows;
}

export type Stats = {
  open: number;
  byDepartment: { key: string; count: number }[];
  byUrgency: { key: string; count: number }[];
};

export async function getStats(): Promise<Stats> {
  const pool = getPool();
  const [dep, urg] = await Promise.all([
    pool.query<{ key: string; count: string }>(
      `SELECT coalesce(department, 'Неопределен') AS key, count(*) AS count FROM tickets
       WHERE status = ANY($1) GROUP BY 1 ORDER BY 2 DESC`,
      [OPEN_STATUSES],
    ),
    pool.query<{ key: string; count: string }>(
      `SELECT coalesce(urgency, 'Неопределена') AS key, count(*) AS count FROM tickets
       WHERE status = ANY($1) GROUP BY 1`,
      [OPEN_STATUSES],
    ),
  ]);
  const byDepartment = dep.rows.map((r) => ({ key: r.key, count: Number(r.count) }));
  const rank = (key: string) => {
    const i = ["High", "Medium", "Low"].indexOf(key);
    return i < 0 ? 99 : i;
  };
  const byUrgency = urg.rows
    .map((r) => ({ key: r.key, count: Number(r.count) }))
    .sort((a, b) => rank(a.key) - rank(b.key));
  return { open: byDepartment.reduce((s, r) => s + r.count, 0), byDepartment, byUrgency };
}

export async function getTicket(ticketNumber: string): Promise<Ticket | null> {
  const { rows } = await getPool().query<Ticket>("SELECT * FROM tickets WHERE ticket_number = $1", [ticketNumber]);
  return rows[0] ?? null;
}

export async function updateTicketStatus(
  ticketNumber: string,
  status: TicketStatus,
  reason: string | null,
  handledBy: string,
): Promise<boolean> {
  const { rowCount } = await getPool().query(
    `UPDATE tickets SET status = $2, status_reason = coalesce($3, status_reason), handled_by = $4
     WHERE ticket_number = $1`,
    [ticketNumber, status, reason, handledBy],
  );
  return (rowCount ?? 0) > 0;
}
