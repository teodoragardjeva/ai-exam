import { callN8n, N8nError } from "@/lib/n8n";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { requireStaffApi } from "@/lib/staff";
import { parseChat } from "@/lib/validation";

// Manager assistant: chat with the n8n agent (WF-5, webhook "manager-assistant"), which has
// Postgres chat memory and a read-only SQL tool over tickets and orders. Managers only.
export async function POST(request: Request) {
  const staff = await requireStaffApi("manager");
  if (staff instanceof Response) return staff;

  const limited = rateLimit(`assistant:${staff.id}`, 30, 10 * 60_000);
  if (!limited.ok) return tooManyRequests(limited);

  const parsed = parseChat(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: "invalid_input", fields: parsed.errors }, { status: 400 });

  try {
    const data = await callN8n<{ reply?: unknown }>("manager-assistant", {
      message: parsed.value.message,
      // Memory is per manager and per conversation, so nobody continues someone else's chat.
      session_id: `${staff.id}:${parsed.value.sessionId}`,
    });
    const reply = typeof data.reply === "string" ? data.reply : "";
    if (!reply) return Response.json({ error: "bad_n8n_response" }, { status: 502 });
    return Response.json({ reply });
  } catch (err) {
    console.error("[assistant]", err instanceof N8nError ? err.message : err);
    return Response.json({ error: "assistant_unavailable" }, { status: 502 });
  }
}
