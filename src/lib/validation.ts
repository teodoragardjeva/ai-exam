export type ContactInput = { name: string; email: string; message: string };
export type ChatInput = { message: string; sessionId: string };

type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function parseContact(body: unknown): Result<ContactInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const value = { name: text(b.name), email: text(b.email), message: text(b.message) };
  const errors: string[] = [];

  if (!value.name || value.name.length > 100) errors.push("name");
  if (!EMAIL_RE.test(value.email) || value.email.length > 254) errors.push("email");
  if (!value.message || value.message.length > 5000) errors.push("message");

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

export function parseChat(body: unknown): Result<ChatInput> {
  const b = (body ?? {}) as Record<string, unknown>;
  const value = { message: text(b.message), sessionId: text(b.sessionId) };
  const errors: string[] = [];

  if (!value.message || value.message.length > 2000) errors.push("message");
  if (!/^[A-Za-z0-9-]{8,64}$/.test(value.sessionId)) errors.push("sessionId");

  return errors.length ? { ok: false, errors } : { ok: true, value };
}
