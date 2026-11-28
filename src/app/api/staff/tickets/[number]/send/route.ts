import { callN8n, N8nError } from "@/lib/n8n";
import { requireStaffApi } from "@/lib/staff";
import { parseReply } from "@/lib/validation";

// Staff edits the AI draft in the dashboard and sends it to the customer.
// n8n WF-4 (webhook "send-reply") emails it and sets the ticket to "Approved & sent".
export async function POST(request: Request, ctx: RouteContext<"/api/staff/tickets/[number]/send">) {
  const staff = await requireStaffApi();
  if (staff instanceof Response) return staff;

  const { number } = await ctx.params;
  const parsed = parseReply(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: "invalid_input", fields: parsed.errors }, { status: 400 });

  try {
    const result = await callN8n<{ ok: boolean; error?: string }>("send-reply", {
      ticket_number: number.toUpperCase(),
      reply: parsed.value.reply,
      staff_email: staff.email,
    });
    if (!result.ok) return Response.json({ error: result.error ?? "not_sent" }, { status: result.error === "not_found" ? 404 : 502 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[send-reply]", err instanceof N8nError ? err.message : err);
    return Response.json({ error: "send_failed" }, { status: 502 });
  }
}
