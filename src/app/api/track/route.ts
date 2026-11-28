import { statusLabel } from "@/lib/labels";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { trackTicket } from "@/lib/tickets";
import { clientIp } from "@/lib/turnstile";
import { parseTrack } from "@/lib/validation";

// Public ticket lookup, checked on the server: ticket number + the same email.
// Wrong number and wrong email give the same answer, so nobody can probe other tickets.
export async function POST(request: Request) {
  const ip = clientIp(request.headers) ?? "unknown";
  const limited = rateLimit(`track:${ip}`, 10, 10 * 60_000);
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = parseTrack(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: "invalid_input", fields: parsed.errors }, { status: 400 });

  const ticket = await trackTicket(parsed.value.ticketNumber, parsed.value.email);
  if (!ticket) return Response.json({ error: "not_found" }, { status: 404 });

  return Response.json({ ...ticket, statusLabel: statusLabel(ticket.status) });
}
