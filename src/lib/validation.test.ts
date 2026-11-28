import { describe, expect, it } from "vitest";
import { parseChat, parseReply, parseStatusChange, parseTicket, parseTrack } from "@/lib/validation";

describe("parseTicket", () => {
  it("accepts, trims and normalizes valid input", () => {
    const r = parseTicket({ name: " Мария ", email: " Maria.Petrova@Example.com ", orderNumber: "ht-10421", message: " Как да върна контакта? " });
    expect(r).toEqual({
      ok: true,
      value: { name: "Мария", email: "maria.petrova@example.com", orderNumber: "HT-10421", message: "Как да върна контакта?" },
    });
  });

  it("lists every invalid field (empty, bad email, bad order number)", () => {
    const r = parseTicket({ name: "", email: "not-an-email", orderNumber: "10421", message: "hi" });
    expect(r).toEqual({ ok: false, errors: ["name", "email", "orderNumber", "message"] });
  });

  it("handles a missing body", () => {
    expect(parseTicket(null).ok).toBe(false);
  });
});

describe("parseTrack", () => {
  it("accepts a ticket number and email", () => {
    expect(parseTrack({ ticketNumber: "t-001001", email: "A@b.co" })).toEqual({
      ok: true,
      value: { ticketNumber: "T-001001", email: "a@b.co" },
    });
  });

  it("rejects malformed ticket numbers", () => {
    expect(parseTrack({ ticketNumber: "1001; drop", email: "a@b.co" })).toEqual({ ok: false, errors: ["ticketNumber"] });
  });
});

describe("parseStatusChange", () => {
  it("accepts a known status", () => {
    expect(parseStatusChange({ status: "Closed", reason: " done " })).toEqual({ ok: true, value: { status: "Closed", reason: "done" } });
  });

  it("rejects an unknown status", () => {
    expect(parseStatusChange({ status: "Deleted" }).ok).toBe(false);
  });

  it("doesn't let staff set statuses that mean an email was sent", () => {
    expect(parseStatusChange({ status: "Approved & sent" }).ok).toBe(false);
    expect(parseStatusChange({ status: "Auto-answered" }).ok).toBe(false);
    expect(parseStatusChange({ status: "Manual review" }).ok).toBe(true);
  });
});

describe("parseReply", () => {
  it("accepts a reply and trims it", () => {
    expect(parseReply({ reply: "  Здравейте, Мария!  " })).toEqual({ ok: true, value: { reply: "Здравейте, Мария!" } });
  });

  it("rejects empty and too long replies", () => {
    expect(parseReply({ reply: " " }).ok).toBe(false);
    expect(parseReply({ reply: "x".repeat(5001) }).ok).toBe(false);
  });
});

describe("parseChat", () => {
  it("accepts a message with a uuid session", () => {
    expect(parseChat({ message: "hello", sessionId: "6f1c2a9e-0d4b-4b7e-9a51-3c2d1e0f9a88" }).ok).toBe(true);
  });

  it("rejects a bad session id and empty message", () => {
    expect(parseChat({ message: " ", sessionId: "x;drop" })).toEqual({ ok: false, errors: ["message", "sessionId"] });
  });
});
