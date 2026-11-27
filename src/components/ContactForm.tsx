"use client";

import { useState } from "react";
import { Turnstile } from "@/components/Turnstile";

// Inlined at build time: changing it needs a new image (GitHub variable → build → redeploy).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type Status = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

export function ContactForm() {
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus({ kind: "sending" });

    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, turnstileToken: token }),
    }).catch(() => null);

    setResetSignal((n) => n + 1);
    if (res?.ok) {
      form.reset();
      setStatus({ kind: "sent" });
    } else {
      const body = await res?.json().catch(() => null);
      setStatus({ kind: "error", message: body?.error ?? "network_error" });
    }
  }

  const waitingForCaptcha = Boolean(SITE_KEY) && !token;

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
      <input name="name" required maxLength={100} placeholder="Name" className="rounded border px-3 py-2" />
      <input name="email" type="email" required maxLength={254} placeholder="Email" className="rounded border px-3 py-2" />
      <textarea name="message" required maxLength={5000} rows={4} placeholder="Message" className="rounded border px-3 py-2" />
      {SITE_KEY && <Turnstile siteKey={SITE_KEY} onToken={setToken} resetSignal={resetSignal} />}
      <button
        type="submit"
        disabled={status.kind === "sending" || waitingForCaptcha}
        className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {status.kind === "sending" ? "Sending…" : "Send"}
      </button>
      {status.kind === "sent" && <p role="status">Thanks, your message was saved.</p>}
      {status.kind === "error" && <p role="alert">Could not send: {status.message}</p>}
    </form>
  );
}
