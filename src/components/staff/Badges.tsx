import { statusLabel, urgencyLabel } from "@/lib/labels";

const STATUS_STYLES: Record<string, string> = {
  New: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100",
  "Auto-answered": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  "Waiting for approval": "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "Approved & sent": "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  Rejected: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  "Manual review": "bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-200",
  Closed: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}>{statusLabel(status)}</span>;
}

export function UrgencyBadge({ urgency }: { urgency: string | null }) {
  if (!urgency) return <span className="text-zinc-400">—</span>;
  const style =
    urgency === "High"
      ? "bg-red-600 text-white"
      : urgency === "Medium"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${style}`}>{urgencyLabel(urgency)}</span>;
}
