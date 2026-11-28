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

// Cloudflare puts the visitor's real IP in cf-connecting-ip. That header is only trustworthy
// when the origin accepts traffic from Cloudflare alone (Cloud Firewall: 80/443 only from
// Cloudflare's IP ranges, see README). Without it, fall back to the LAST X-Forwarded-For hop,
// the one NPM itself added; earlier entries are whatever the client sent.
export function clientIp(headers: Headers): string | null {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const hops = headers.get("x-forwarded-for")?.split(",").map((h) => h.trim()).filter(Boolean);
  return hops?.length ? hops[hops.length - 1] : null;
}
