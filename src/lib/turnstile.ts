import { optionalEnv } from "@/lib/env";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult =
  | { ok: true; skipped: boolean }
  | { ok: false; reason: "missing_token" | "invalid_token" | "verify_failed" };

// Until TURNSTILE_SECRET_KEY is set in Portainer, verification is skipped so the site
// works before phase H. Once it is set, a request without a valid token is rejected.
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<TurnstileResult> {
  const secret = optionalEnv("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return { ok: true, skipped: true };
  }
  if (!token) {
    return { ok: false, reason: "missing_token" };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetchImpl(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success ? { ok: true, skipped: false } : { ok: false, reason: "invalid_token" };
  } catch {
    return { ok: false, reason: "verify_failed" };
  }
}

// Cloudflare puts the visitor's real IP here; NPM forwards the header to the app.
export function clientIp(headers: Headers): string | null {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
}
