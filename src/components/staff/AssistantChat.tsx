"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "assistant"; text: string };

const EXAMPLES = [
  "Колко искания за връщане на пари имахме тази седмица?",
  "Покажи всички запитвания с висока спешност, които още са отворени.",
  "Колко запитвания са отговорени автоматично днес?",
];

export function AssistantChat() {
  // Created on the first message, not during render.
  const sessionIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);
  const [input, setInput] = useState("");

  async function ask(text: string) {
    const message = text.trim();
    if (!message || pending) return;
    sessionIdRef.current ??= crypto.randomUUID();
    setMessages((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setPending(true);

    const res = await fetch("/api/staff/assistant", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, sessionId: sessionIdRef.current }),
    }).catch(() => null);
    const body = await res?.json().catch(() => null);
    const reply =
      res?.ok && body?.reply
        ? body.reply
        : res?.status === 429
          ? "Твърде много въпроси за кратко време. Опитайте след няколко минути."
          : "Асистентът не е достъпен в момента. Опитайте отново.";
    setMessages((m) => [...m, { role: "assistant", text: reply }]);
    setPending(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((q) => (
            <button key={q} type="button" onClick={() => ask(q)} className="rounded-full border border-zinc-300 px-3 py-1 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800">
              {q}
            </button>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-3" aria-live="polite">
        {messages.map((m, i) => (
          <li
            key={i}
            className={
              m.role === "user"
                ? "self-end max-w-[85%] rounded-2xl bg-gradient-to-br from-accent to-brand-cyan px-4 py-2 text-white"
                : "self-start max-w-[85%] whitespace-pre-wrap rounded-2xl bg-white px-4 py-2 shadow-sm dark:bg-zinc-900"
            }
          >
            {m.text}
          </li>
        ))}
        {pending && <li className="self-start text-sm text-zinc-500">Асистентът проверява данните…</li>}
      </ul>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void ask(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={2000}
          placeholder="Попитайте за запитванията…"
          className="h-11 flex-1 rounded-xl border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-900"
        />
        <button type="submit" disabled={pending || !input.trim()} className="btn-primary h-11">
          Питай
        </button>
      </form>
    </div>
  );
}
