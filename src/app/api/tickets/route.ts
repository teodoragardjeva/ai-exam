import { callN8n, N8nError } from "@/lib/n8n";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { clientIp, verifyTurnstile } from "@/lib/turnstile";
import { parseTicket } from "@/lib/validation";

// Contract with n8n WF-2 (webhook "ticket-intake"). n8n checks the order (R1),
// saves the ticket and answers right away; the AI triage continues in the background.
type IntakeResponse =
  | { ok: true; ticket_number: string; status: string }
  | { ok: false; error: "order_mismatch" | "invalid_input" };

export async function POST(request: Request) {
  const ip = clientIp(request.headers) ?? "unknown";
  // 5 tickets per 10 minutes per IP by default; TICKETS_RATE_LIMIT overrides it (e.g. for test runs).
  const max = Number(process.env.TICKETS_RATE_LIMIT) || 5;
  const limited = rateLimit(`tickets:${ip}`, max, 10 * 60_000);
  if (!limited.ok) return tooManyRequests(limited);

  const body = await request.json().catch(() => null);

  const captcha = await verifyTurnstile(body?.turnstileToken, ip);
  if (!captcha.ok) {
    return Response.json({ error: "captcha_failed" }, { status: 403 });
  }

  const parsed = parseTicket(body);
  if (!parsed.ok) {
    return Response.json({ error: "invalid_input", fields: parsed.errors }, { status: 400 });
  }

  const { name, email, orderNumber, message } = parsed.value;
  try {
    const result = await callN8n<IntakeResponse>("ticket-intake", {
      name,
      email,
      order_number: orderNumber,
      message,
    });
    if (result.ok) {
      return Response.json({ ticketNumber: result.ticket_number }, { status: 201 });
    }
    if (result.error === "order_mismatch") {
      // R1: same message for "no such order" and "email doesn't match", so nobody can probe orders.
      return Response.json({ error: "order_mismatch", fields: ["orderNumber", "email"] }, { status: 422 });
    }
    return Response.json({ error: "invalid_input" }, { status: 400 });
  } catch (err) {
    console.error("[tickets]", err instanceof N8nError ? err.message : err);
    return Response.json({ error: "service_unavailable" }, { status: 503 });
  }
}
