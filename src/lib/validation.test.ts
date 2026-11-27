import { describe, expect, it } from "vitest";
import { parseChat, parseContact } from "@/lib/validation";

describe("parseContact", () => {
  it("accepts and trims valid input", () => {
    const r = parseContact({ name: " Ana ", email: "ana@example.com", message: " Hi " });
    expect(r).toEqual({ ok: true, value: { name: "Ana", email: "ana@example.com", message: "Hi" } });
  });

  it("lists every invalid field", () => {
    const r = parseContact({ name: "", email: "not-an-email", message: "x".repeat(5001) });
    expect(r).toEqual({ ok: false, errors: ["name", "email", "message"] });
  });

  it("handles a missing body", () => {
    expect(parseContact(null).ok).toBe(false);
  });
});

describe("parseChat", () => {
  it("accepts a message with a uuid session", () => {
    const r = parseChat({ message: "hello", sessionId: "6f1c2a9e-0d4b-4b7e-9a51-3c2d1e0f9a88" });
    expect(r.ok).toBe(true);
  });

  it("rejects a bad session id and empty message", () => {
    expect(parseChat({ message: " ", sessionId: "x;drop" })).toEqual({ ok: false, errors: ["message", "sessionId"] });
  });
});
