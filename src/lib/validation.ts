import { TICKET_STATUSES } from "@/lib/migrations";

export type TicketInput = { name: string; email: string; orderNumber: string; message: string };
export type TrackInput = { ticketNumber: string; email: string };
export type ChatInput = { message: string; sessionId: string };

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ORDER_RE = /^HT-\d{5}$/;
const TICKET_RE = /^T-\d{6}$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseTicket(body: unknown): Result<TicketInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const value = {
    name: text(b.name),
    email: text(b.email).toLowerCase(),
    orderNumber: text(b.orderNumber).toUpperCase(),
    message: text(b.message),
  };
  const errors: string[] = [];

  if (!value.name || value.name.length > 100) errors.push("name");
  if (!EMAIL_RE.test(value.email) || value.email.length > 254) errors.push("email");
  if (!ORDER_RE.test(value.orderNumber)) errors.push("orderNumber");
  if (value.message.length < 5 || value.message.length > 4000) errors.push("message");

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export function parseTrack(body: unknown): Result<TrackInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const value = { ticketNumber: text(b.ticketNumber).toUpperCase(), email: text(b.email).toLowerCase() };
  const errors: string[] = [];
  if (!TICKET_RE.test(value.ticketNumber)) errors.push("ticketNumber");
  if (!EMAIL_RE.test(value.email)) errors.push("email");
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export type TicketStatus = (typeof TICKET_STATUSES)[number];

export function parseStatusChange(body: unknown): Result<{ status: TicketStatus; reason: string | null }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const status = text(b.status) as TicketStatus;
  const reason = text(b.reason).slice(0, 500) || null;
  if (!TICKET_STATUSES.includes(status)) return { ok: false, errors: ["status"] };
  return { ok: true, value: { status, reason } };
}

export function parseChat(body: unknown): Result<ChatInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const value = { message: text(b.message), sessionId: text(b.sessionId) };
  const errors: string[] = [];

  if (!value.message || value.message.length > 2000) errors.push("message");
  if (!/^[A-Za-z0-9-]{8,64}$/.test(value.sessionId)) errors.push("sessionId");

  return errors.length ? { ok: false, errors } : { ok: true, value };
}
