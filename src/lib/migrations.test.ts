import { describe, expect, it } from "vitest";
import { migrations } from "@/lib/migrations";

describe("migrations", () => {
  it("have unique ids in ascending order", () => {
    const ids = migrations.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it("use a three-digit numeric prefix", () => {
    for (const m of migrations) expect(m.id).toMatch(/^\d{3}_[a-z0-9_]+$/);
  });
});
