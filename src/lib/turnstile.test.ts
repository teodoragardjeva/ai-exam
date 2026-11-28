import { afterEach, describe, expect, it, vi } from "vitest";
import { clientIp, verifyTurnstile } from "@/lib/turnstile";

function fakeFetch(success: boolean) {
  return vi.fn(async () => Response.json({ success })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("verifyTurnstile", () => {
  it("skips verification when no secret is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const f = fakeFetch(false);
    expect(await verifyTurnstile(undefined, null, f)).toEqual({ ok: true, skipped: true });
    expect(f).not.toHaveBeenCalled();
  });

  it("rejects a request without a token once the secret is set", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(await verifyTurnstile(undefined, null, fakeFetch(true))).toEqual({ ok: false, reason: "missing_token" });
  });

  it("sends secret, token and ip to Cloudflare", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const f = fakeFetch(true);
    expect(await verifyTurnstile("tok", "1.2.3.4", f)).toEqual({ ok: true, skipped: false });
    const body = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][1].body as URLSearchParams;
    expect(Object.fromEntries(body)).toEqual({ secret: "secret", response: "tok", remoteip: "1.2.3.4" });
  });

  it("rejects an invalid token", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    expect(await verifyTurnstile("bad", null, fakeFetch(false))).toEqual({ ok: false, reason: "invalid_token" });
  });

  it("fails closed when Cloudflare is unreachable", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "secret");
    const f = vi.fn(async () => {
      throw new Error("down");
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile("tok", null, f)).toEqual({ ok: false, reason: "verify_failed" });
  });
});

describe("clientIp", () => {
  it("prefers Cloudflare's header", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("1.1.1.1");
  });

  it("falls back to the last x-forwarded-for hop (the one our proxy added), not a client-sent one", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 3.3.3.3" }))).toBe("3.3.3.3");
    expect(clientIp(new Headers({ "x-forwarded-for": "3.3.3.3" }))).toBe("3.3.3.3");
  });

  it("returns null without any client IP header", () => {
    expect(clientIp(new Headers())).toBeNull();
  });
});
