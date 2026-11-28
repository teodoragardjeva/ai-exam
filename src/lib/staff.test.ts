import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getAuth: vi.fn(), STAFF_ROLES: ["agent", "manager"] }));

const { canAccess } = await import("@/lib/staff");

const user = (over: Partial<{ role: "agent" | "manager"; approved: boolean }> = {}) => ({
  id: "1",
  email: "a@hometech.example",
  name: "A",
  role: "agent" as const,
  approved: true,
  ...over,
});

describe("canAccess (server-side gate for staff data)", () => {
  it("denies anonymous visitors", () => {
    expect(canAccess(null)).toBe(false);
  });

  it("denies logged-in users that are not approved", () => {
    expect(canAccess(user({ approved: false }))).toBe(false);
    expect(canAccess(user({ approved: false, role: "manager" }), "manager")).toBe(false);
  });

  it("lets approved agents in, but not into manager-only parts", () => {
    expect(canAccess(user())).toBe(true);
    expect(canAccess(user(), "manager")).toBe(false);
  });

  it("lets approved managers into everything", () => {
    expect(canAccess(user({ role: "manager" }), "manager")).toBe(true);
  });
});
