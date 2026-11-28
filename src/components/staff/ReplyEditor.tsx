"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ReplyEditor({ ticketNumber, initial, customerEmail }: { ticketNumber: string; initial: string; customerEmail: string }) {
  const router = useRouter();
  const [text, setText] = useState(initial);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function send() {
    if (!confirm(`Да изпратя ли отговора на ${customerEmail}?`)) return;
    setState("sending");
    const res = await fetch(`/api/staff/tickets/${ticketNumber}/send`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reply: text }),
    }).catch(() => null);
    setState(res?.ok ? "sent" : "error");
    if (res?.ok) router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        maxLength={5000}
        className="rounded-xl border border-zinc-300 bg-white p-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={send}
          disabled={state === "sending" || text.trim().length < 5}
          className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {state === "sending" ? "Изпращане…" : "Изпрати на клиента"}
        </button>
        {state === "sent" && <span role="status" className="text-sm text-emerald-700">Изпратено. Статус: Одобрено и изпратено.</span>}
        {state === "error" && <span role="alert" className="text-sm text-red-600">Отговорът не беше изпратен. Опитайте отново.</span>}
      </div>
    </div>
  );
}
