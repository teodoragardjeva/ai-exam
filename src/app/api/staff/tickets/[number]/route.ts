import { requireStaffApi } from "@/lib/staff";
import { updateTicketStatus } from "@/lib/tickets";
import { parseStatusChange } from "@/lib/validation";

// Staff changes a ticket's status (e.g. Closed). Logged in + approved staff only.
export async function PATCH(request: Request, ctx: RouteContext<"/api/staff/tickets/[number]">) {
  const staff = await requireStaffApi();
  if (staff instanceof Response) return staff;

  const { number } = await ctx.params;
  const parsed = parseStatusChange(await request.json().catch(() => null));
  if (!parsed.ok) return Response.json({ error: "invalid_input", fields: parsed.errors }, { status: 400 });

  const updated = await updateTicketStatus(number.toUpperCase(), parsed.value.status, parsed.value.reason, staff.email);
  if (!updated) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ ok: true });
}
