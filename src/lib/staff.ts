import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, STAFF_ROLES, type StaffRole, type StaffUser } from "@/lib/auth";

// The server-side gate for every staff page and API (our equivalent of Supabase RLS):
// no session → no access; logged in but not approved → no access, sees nothing.
export async function getStaff(): Promise<StaffUser | null> {
  // Read the request headers first: that marks the page as per-request, so the build never
  // tries to prerender it (and never touches the database, which doesn't exist at build time).
  const requestHeaders = await headers();
  const session = await getAuth().api.getSession({ headers: requestHeaders });
  if (!session) return null;
  const user = session.user as typeof session.user & { role?: string; approved?: boolean };
  const role = STAFF_ROLES.includes(user.role as StaffRole) ? (user.role as StaffRole) : "agent";
  return { id: user.id, email: user.email, name: user.name, role, approved: user.approved === true };
}

export function canAccess(staff: StaffUser | null, role?: StaffRole): staff is StaffUser {
  if (!staff || !staff.approved) return false;
  return role === "manager" ? staff.role === "manager" : true;
}

// For pages: redirect to login, or show "no access" for unapproved accounts.
export async function requireStaffPage(role?: StaffRole): Promise<StaffUser> {
  const staff = await getStaff();
  if (!staff) redirect("/staff/login");
  if (!canAccess(staff, role)) redirect("/staff/no-access");
  return staff;
}

// For route handlers: returns the staff user or a 401/403 response.
export async function requireStaffApi(role?: StaffRole): Promise<StaffUser | Response> {
  const staff = await getStaff();
  if (!staff) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!canAccess(staff, role)) return Response.json({ error: "forbidden" }, { status: 403 });
  return staff;
}
