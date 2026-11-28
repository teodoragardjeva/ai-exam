import Link from "next/link";
import { LiveRefresh } from "@/components/staff/LiveRefresh";
import { SignOutButton } from "@/components/staff/SignOutButton";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Табло · HomeTech поддръжка" };

export default async function DeskLayout({ children }: LayoutProps<"/staff">) {
  const staff = await requireStaffPage();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/staff" className="font-semibold">
            HomeTech · Поддръжка
          </Link>
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
