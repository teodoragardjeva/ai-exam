"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.email({
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
    });
    setPending(false);
    if (error) {
      setError(error.status === 429 ? "Твърде много опити. Изчакайте минута." : "Грешен имейл или парола.");
      return;
    }
    router.replace("/staff");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-brand-navy">Имейл</span>
        <input name="email" type="email" required autoComplete="username" className="field" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium text-brand-navy">Парола</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Влизане…" : "Вход"}
      </button>
    </form>
  );
}
