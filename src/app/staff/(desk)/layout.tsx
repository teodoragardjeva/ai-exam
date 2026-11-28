import { Brand } from "@/components/Brand";
import { AssistantLink } from "@/components/staff/AssistantLink";
import { LiveRefresh } from "@/components/staff/LiveRefresh";
import { SignOutButton } from "@/components/staff/SignOutButton";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Табло · HomeTech поддръжка" };

// Per-request only: needs the session and live data, never prerendered at build time.
export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: LayoutProps<"/staff">) {
  const staff = await requireStaffPage();
  const initials = staff.name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="relative overflow-hidden bg-gradient-to-r from-accent-dark via-accent to-[#0e9aa7] text-white shadow-md shadow-accent/20">
        <div aria-hidden className="absolute -top-16 right-1/3 size-48 rounded-full bg-mint/30 blur-3xl" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex items-center gap-4">
            <Brand href="/staff" size={30} suffix="Табло" tone="light" />
            {staff.role === "manager" && <AssistantLink />}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <LiveRefresh />
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="flex size-8 items-center justify-center rounded-full bg-white/20 text-xs font-bold ring-1 ring-white/30"
              >
                {initials}
              </span>
              <span className="leading-tight">
                <span className="block font-medium">{staff.name}</span>
                <span className="block text-xs text-teal-50/80">{staff.role === "manager" ? "мениджър" : "служител"}</span>
              </span>
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
