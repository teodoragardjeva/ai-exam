import Link from "next/link";
import { Brand } from "@/components/Brand";
import { LiveRefresh } from "@/components/staff/LiveRefresh";
import { SignOutButton } from "@/components/staff/SignOutButton";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Табло · HomeTech поддръжка" };

// Per-request only: needs the session and live data, never prerendered at build time.
export const dynamic = "force-dynamic";

export default async function DeskLayout({ children }: LayoutProps<"/staff">) {
  const staff = await requireStaffPage();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div aria-hidden className="h-1 bg-gradient-to-r from-brand-navy via-brand-blue to-brand-cyan" />
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex items-center gap-4">
            <Brand href="/staff" size={32} suffix="Табло" />
            {staff.role === "manager" && (
              <Link href="/staff/assistant" className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-brand-blue/10">
                Асистент
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <LiveRefresh />
            <span className="text-zinc-600 dark:text-zinc-400">
              {staff.name} ({staff.role === "manager" ? "мениджър" : "служител"})
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</div>
    </div>
  );
}
