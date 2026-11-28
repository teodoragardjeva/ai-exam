"use client";

import { useState } from "react";
import { Turnstile } from "@/components/Turnstile";

// Inlined at build time: changing it needs a new image (GitHub variable → build → redeploy).
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

type Field = "name" | "email" | "orderNumber" | "message";
type FieldErrors = Partial<Record<Field, string>>;
type Status =
  | { kind: "idle" | "sending" }
  | { kind: "sent"; ticketNumber: string }
  | { kind: "error"; message: string };

const FIELD_MESSAGES: Record<Field, string> = {
  name: "Въведете името си.",
  email: "Въведете валиден имейл, напр. ime@primer.bg.",
  orderNumber: "Номерът на поръчката е във формат HT-12345.",
  message: "Опишете запитването си (поне 5 символа).",
};

const ERROR_MESSAGES: Record<string, string> = {
  order_mismatch: "Не намерихме поръчка с този номер и имейл. Проверете ги в имейла за поръчката.",
  rate_limited: "Изпратихте много запитвания за кратко време. Опитайте отново след няколко минути.",
  captcha_failed: "Проверката „Не съм робот“ не мина. Опитайте отново.",
  service_unavailable: "Системата временно не приема запитвания. Опитайте отново след малко.",
  network_error: "Няма връзка със сървъра. Проверете интернета си и опитайте отново.",
};

function validate(data: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.name.trim()) errors.name = FIELD_MESSAGES.name;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) errors.email = FIELD_MESSAGES.email;
  if (!/^HT-\d{5}$/i.test(data.orderNumber.trim())) errors.orderNumber = FIELD_MESSAGES.orderNumber;
  if (data.message.trim().length < 5) errors.message = FIELD_MESSAGES.message;
  return errors;
}

export function TicketForm() {
  const [token, setToken] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<Field, string>;

    const clientErrors = validate(data);
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) {
      setStatus({ kind: "idle" });
      return;
    }

    setStatus({ kind: "sending" });
    const res = await fetch("/api/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...data, turnstileToken: token }),
    }).catch(() => null);
    setResetSignal((n) => n + 1);

    const body = await res?.json().catch(() => null);
    if (res?.ok && body?.ticketNumber) {
      form.reset();
      setStatus({ kind: "sent", ticketNumber: body.ticketNumber });
      return;
    }

    const code: string = body?.error ?? "network_error";
    if (code === "invalid_input" && Array.isArray(body?.fields)) {
      setErrors(Object.fromEntries((body.fields as Field[]).map((f) => [f, FIELD_MESSAGES[f]])));
      setStatus({ kind: "idle" });
      return;
    }
    if (code === "order_mismatch") {
      setErrors({ orderNumber: " ", email: " " });
    }
    setStatus({ kind: "error", message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.service_unavailable });
  }

  if (status.kind === "sent") {
    return (
      <div role="status" className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950">
        <p className="flex items-center gap-2 text-lg font-semibold">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white">✓</span>
          Получихме запитването ви.
        </p>
        <p>
          Номер на запитването: <strong className="rounded-lg bg-white px-2 py-0.5 font-mono text-xl text-brand-navy ring-1 ring-emerald-200">{status.ticketNumber}</strong>
        </p>
        <p>Ще получите отговор по имейл до 1 работен ден (поддръжката работи пн–пт, 09:00–18:00).</p>
        <p className="text-sm">
          Запазете номера: с него и имейла си можете да{" "}
          <a href="/track" className="font-medium text-accent-dark underline">
            проследите запитването
          </a>
          .
        </p>
        <button type="button" onClick={() => setStatus({ kind: "idle" })} className="self-start rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-emerald-100">
          Ново запитване
        </button>
      </div>
    );
  }

  const waitingForCaptcha = Boolean(SITE_KEY) && !token;

  return (
    <form onSubmit={onSubmit} noValidate className="grid w-full gap-4 sm:grid-cols-2">
      <Input name="name" label="Име" autoComplete="name" error={errors.name} />
      <Input name="email" label="Имейл" type="email" autoComplete="email" inputMode="email" error={errors.email} />
      <Input name="orderNumber" label="Номер на поръчка" placeholder="HT-10421" autoCapitalize="characters" error={errors.orderNumber} hint="Ще го намерите в имейла за поръчката." />
      <label className="flex flex-col gap-1.5 sm:col-span-2">
        <span className="text-sm font-medium text-brand-navy">Съобщение</span>
        <textarea
          name="message"
          rows={5}
          maxLength={4000}
          aria-invalid={Boolean(errors.message)}
          className="field h-auto resize-y py-3"
        />
        {errors.message && <span className="text-sm text-red-600">{errors.message}</span>}
      </label>

      {SITE_KEY && (
        <div className="sm:col-span-2">
          <Turnstile siteKey={SITE_KEY} onToken={setToken} resetSignal={resetSignal} />
        </div>
      )}

      {status.kind === "error" && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={status.kind === "sending" || waitingForCaptcha}
        className="btn-primary mt-2 sm:col-span-2"
      >
        {status.kind === "sending" ? "Изпращане…" : "Изпрати запитването"}
      </button>
    </form>
  );
}

function Input({
  name,
  label,
  error,
  hint,
  ...rest
}: { name: Field; label: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-brand-navy">{label}</span>
      <input
        name={name}
        aria-invalid={Boolean(error)}
        className="field"
        {...rest}
      />
      {error?.trim() ? (
        <span className="text-sm text-red-600">{error}</span>
      ) : (
        hint && <span className="text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}
