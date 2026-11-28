import Link from "next/link";
import { departmentLabel, statusLabel, urgencyLabel } from "@/lib/labels";
import { DEPARTMENTS, TICKET_STATUSES, URGENCIES } from "@/lib/migrations";
import { requireStaffPage } from "@/lib/staff";
import { cleanFilters, getStats, listTickets } from "@/lib/tickets";
import { StatusBadge, UrgencyBadge } from "@/components/staff/Badges";

export default async function DashboardPage({ searchParams }: PageProps<"/staff">) {
  await requireStaffPage();
  const filters = cleanFilters(await searchParams);
  const [stats, tickets] = await Promise.all([getStats(), listTickets(filters)]);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 md:grid-cols-[auto_1fr_1fr]">
        <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
          <p className="text-sm text-zinc-500">Отворени запитвания</p>
          <p className="text-4xl font-semibold">{stats.open}</p>
        </div>
        <StatList title="Отворени по отдел" rows={stats.byDepartment} label={departmentLabel} />
        <StatList title="Отворени по спешност" rows={stats.byUrgency} label={urgencyLabel} highlight="High" />
      </section>

      <form className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
        <Select name="status" label="Статус" options={TICKET_STATUSES} optionLabel={statusLabel} value={filters.status} />
        <Select name="department" label="Отдел" options={DEPARTMENTS} optionLabel={departmentLabel} value={filters.department} />
        <Select name="urgency" label="Спешност" options={URGENCIES} optionLabel={urgencyLabel} value={filters.urgency} />
        <button type="submit" className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white">
          Филтрирай
        </button>
        <Link href="/staff" className="h-10 content-center text-sm underline">
          Изчисти
        </Link>
      </form>

      <section className="overflow-x-auto rounded-2xl bg-white shadow-sm dark:bg-zinc-900">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-800">
            <tr>
              <th className="px-4 py-3">№</th>
              <th className="px-4 py-3">Създадено</th>
              <th className="px-4 py-3">Клиент</th>
              <th className="px-4 py-3">Отдел</th>
              <th className="px-4 py-3">Спешност</th>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Резюме</th>
            </tr>
          </thead>
          <tbody>
            {tickets.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-500">
                  Няма запитвания.
                </td>
              </tr>
            )}
            {tickets.map((t) => {
              const urgent = t.urgency === "High";
              return (
                <tr
                  key={t.ticket_number}
                  className={`border-b border-zinc-100 last:border-0 dark:border-zinc-800 ${urgent ? "bg-red-50 dark:bg-red-950/40" : ""}`}
                >
                  <td className="px-4 py-3 font-mono">
                    <Link href={`/staff/tickets/${t.ticket_number}`} className="text-blue-600 underline">
                      {t.ticket_number}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatDate(t.created_at)}</td>
                  <td className="px-4 py-3">
                    {t.customer_name}
                    <span className="block text-xs text-zinc-500">{t.order_number}</span>
                  </td>
                  <td className="px-4 py-3">{departmentLabel(t.department)}</td>
                  <td className="px-4 py-3">
                    <UrgencyBadge urgency={t.urgency} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {t.ai_summary ?? t.message}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function StatList({
  title,
  rows,
  label,
  highlight,
}: {
  title: string;
  rows: { key: string; count: number }[];
  label: (value: string) => string;
  highlight?: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <p className="mb-2 text-sm text-zinc-500">{title}</p>
      {rows.length === 0 && <p className="text-sm text-zinc-500">—</p>}
      <ul className="flex flex-col gap-1 text-sm">
        {rows.map((r) => (
          <li key={r.key} className={`flex justify-between gap-4 ${r.key === highlight ? "font-semibold text-red-600" : ""}`}>
            <span>{label(r.key)}</span>
            <span className="font-mono">{r.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Select({
  name,
  label,
  options,
  optionLabel,
  value,
}: {
  name: string;
  label: string;
  options: readonly string[];
  optionLabel: (value: string) => string;
  value?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-zinc-500">{label}</span>
      <select name={name} defaultValue={value ?? ""} className="h-10 rounded-lg border border-zinc-300 bg-white px-2 dark:border-zinc-700 dark:bg-zinc-900">
        <option value="">Всички</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {optionLabel(o)}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("bg-BG", { timeZone: "Europe/Sofia", dateStyle: "short", timeStyle: "short" });
}
