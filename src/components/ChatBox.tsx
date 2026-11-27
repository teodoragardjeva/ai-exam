"use client";

import { useRef, useState } from "react";

type Message = { role: "user" | "bot"; text: string };

export function ChatBox() {
  // Created on the first message, not during render: the page is prerendered at build time.
  const sessionIdRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("message") as HTMLInputElement;
    const text = input.value.trim();
    if (!text) return;
    sessionIdRef.current ??= crypto.randomUUID();
    const sessionId = sessionIdRef.current;

    setMessages((m) => [...m, { role: "user", text }]);
    form.reset();
    setPending(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text, sessionId }),
    }).catch(() => null);
    const body = await res?.json().catch(() => null);

    setMessages((m) => [...m, { role: "bot", text: res?.ok ? body.reply : "The assistant is unavailable right now." }]);
    setPending(false);
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <ul className="flex flex-col gap-2" aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={m.role === "user" ? "self-end rounded bg-zinc-200 px-3 py-2 dark:bg-zinc-800" : "self-start rounded border px-3 py-2"}>
            {m.text}
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="flex gap-2">
        <input name="message" maxLength={2000} placeholder="Ask something…" className="flex-1 rounded border px-3 py-2" />
        <button type="submit" disabled={pending} className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50">
          {pending ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}
