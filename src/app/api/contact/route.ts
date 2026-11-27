import { getPool } from "@/lib/db";
import { clientIp, verifyTurnstile } from "@/lib/turnstile";
import { parseContact } from "@/lib/validation";

// Example form endpoint: Turnstile check, validation, insert into Postgres.
// Rename or replace it once the exam topic is known.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const captcha = await verifyTurnstile(body?.turnstileToken, clientIp(request.headers));
  if (!captcha.ok) {
    return Response.json({ error: "captcha_failed", reason: captcha.reason }, { status: 403 });
  }

  const parsed = parseContact(body);
  if (!parsed.ok) {
    return Response.json({ error: "invalid_input", fields: parsed.errors }, { status: 400 });
  }

  const { name, email, message } = parsed.value;
  await getPool().query(
    "INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)",
    [name, email, message],
  );
  return Response.json({ ok: true }, { status: 201 });
}
