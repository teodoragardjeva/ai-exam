"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { statusLabel } from "@/lib/labels";
import { STAFF_SETTABLE_STATUSES } from "@/lib/validation";

export function StatusForm({ ticketNumber, current }: { ticketNumber: string; current: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const res = await fetch(`/api/staff/tickets/${ticketNumber}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: data.get("status"), reason: data.get("reason") }),
    }).catch(() => null);
    setPending(false);
    if (!res?.ok) {
      setError("Статусът не беше сменен. Опитайте отново.");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 text-sm">
      <select name="status" defaultValue={current} className="h-10 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900">
        {/* The current status stays visible even if only a workflow may set it (e.g. "Approved & sent"). */}
        {(STAFF_SETTABLE_STATUSES as string[]).includes(current) ? null : (
          <option value={current} disabled>
            {statusLabel(current)}
          </option>
        )}
        {STAFF_SETTABLE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>
      <input name="reason" maxLength={500} placeholder="Причина (по желание)" className="h-10 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900" />
      {error && <p role="alert" className="text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="h-10 rounded-lg bg-accent hover:bg-accent-dark font-semibold text-white disabled:opacity-50">
        {pending ? "Запазване…" : "Запази статуса"}
      </button>
    </form>
  );
}
