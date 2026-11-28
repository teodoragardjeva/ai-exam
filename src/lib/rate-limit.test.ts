import { beforeEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => resetRateLimits());

describe("rateLimit", () => {
  it("allows up to max requests in the window, then blocks with retry-after", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rateLimit("ip:1", 5, 60_000, t0 + i).ok).toBe(true);
    const blocked = rateLimit("ip:1", 5, 60_000, t0 + 10);
    expect(blocked).toEqual({ ok: false, retryAfterSeconds: 60 });
  });

  it("allows again once the oldest request leaves the window", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 5; i++) rateLimit("ip:2", 5, 60_000, t0);
    expect(rateLimit("ip:2", 5, 60_000, t0 + 60_001).ok).toBe(true);
  });

  it("keeps separate counters per key", () => {
    for (let i = 0; i < 5; i++) rateLimit("ip:3", 5, 60_000, 0);
    expect(rateLimit("ip:4", 5, 60_000, 0).ok).toBe(true);
  });
});
