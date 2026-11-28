"use client";

import { useState } from "react";

type Result = { ticketNumber: string; statusLabel: string; createdAt: string; reply: string | null };
type State = { kind: "idle" | "loading" } | { kind: "found"; ticket: Result } | { kind: "error"; message: string };

const ERRORS: Record<string, string> = {
  not_found: "Не намерихме запитване с този номер и имейл.",
  invalid_input: "Проверете номера (формат T-001234) и имейла.",
  rate_limited: "Твърде много опити. Опитайте отново след няколко минути.",
};

export function TrackForm() {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setState({ kind: "loading" });
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (res?.ok && body) setState({ kind: "found", ticket: body });
    else setState({ kind: "error", message: ERRORS[body?.error] ?? "Няма връзка със сървъра. Опитайте отново." });
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-brand-navy">Номер на запитване</span>
          <input name="ticketNumber" required placeholder="T-001234" autoCapitalize="characters" className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-brand-navy">Имейл, от който сте писали</span>
          <input name="email" type="email" required autoComplete="email" inputMode="email" className="field" />
        </label>
        <button type="submit" disabled={state.kind === "loading"} className="btn-primary mt-2">
          {state.kind === "loading" ? "Търсене…" : "Провери статуса"}
        </button>
      </form>

      {state.kind === "error" && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {state.message}
        </p>
      )}

      {state.kind === "found" && (
        <section role="status" className="flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-5">
          <p>
            <span className="font-mono font-semibold">{state.ticket.ticketNumber}</span> ·{" "}
            {new Date(state.ticket.createdAt).toLocaleString("bg-BG", { timeZone: "Europe/Sofia", dateStyle: "short", timeStyle: "short" })}
          </p>
          <p>
            Статус: <strong className="rounded-full bg-accent px-2.5 py-0.5 text-sm text-white">{state.ticket.statusLabel}</strong>
          </p>
          {state.ticket.reply ? (
            <div>
              <p className="mb-1 text-sm text-slate-500">Нашият отговор:</p>
              <p className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3">{state.ticket.reply}</p>
            </div>
          ) : (
            <p className="text-slate-600">Още работим по запитването. Ще получите отговор по имейл.</p>
          )}
        </section>
      )}
    </div>
  );
}
