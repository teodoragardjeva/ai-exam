import { callN8n, N8nError } from "@/lib/n8n";
import { parseChat } from "@/lib/validation";

// Forwards a chat message to the private n8n workflow (Webhook path "chat")
// and returns its reply. The workflow must respond with JSON: { "reply": "..." }.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = parseChat(body);
  if (!parsed.ok) {
    return Response.json({ error: "invalid_input", fields: parsed.errors }, { status: 400 });
  }

  try {
    const data = await callN8n<{ reply?: unknown }>("chat", parsed.value);
    const reply = typeof data.reply === "string" ? data.reply : "";
    if (!reply) {
      return Response.json({ error: "bad_n8n_response" }, { status: 502 });
    }
    return Response.json({ reply });
  } catch (err) {
    console.error("[chat]", err instanceof N8nError ? err.message : err);
    return Response.json({ error: "chat_unavailable" }, { status: 502 });
  }
}
