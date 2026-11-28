import { describe, expect, it } from "vitest";
import { GRANTS } from "@/lib/migrate";
import { DEPARTMENTS, migrations, TICKET_STATUSES } from "@/lib/migrations";

describe("migrations", () => {
  it("have unique ids in ascending order", () => {
    const ids = migrations.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(ids);
  });

  it("use a three-digit numeric prefix", () => {
    for (const m of migrations) expect(m.id).toMatch(/^\d{3}_[a-z0-9_]+$/);
  });

  it("allow exactly the statuses and departments from the assignment", () => {
    expect(TICKET_STATUSES).toEqual([
      "New",
      "Auto-answered",
      "Waiting for approval",
      "Approved & sent",
      "Rejected",
      "Manual review",
      "Closed",
    ]);
    expect(DEPARTMENTS).toHaveLength(5);
    const tickets = migrations.find((m) => m.id === "004_tickets")!.sql;
    expect(tickets).toContain("'Approved & sent'");
    expect(tickets).toContain("'Returns & refunds'");
  });

  it("don't depend on uuid-ossp (n8n owns it in its own schema)", () => {
    for (const m of migrations) {
      expect(m.sql).not.toContain("uuid_generate_v4(");
      expect(m.sql).not.toContain("uuid-ossp");
    }
  });

  it("seed all eight orders from Appendix B", () => {
    const orders = migrations.find((m) => m.id === "003_orders")!.sql;
    for (let n = 10421; n <= 10428; n++) expect(orders).toContain(`'HT-${n}'`);
  });
});

describe("grants", () => {
  it("never give the read-only role write access", () => {
    const readonly = GRANTS.find((g) => g.role === "n8n_readonly")!;
    for (const stmt of readonly.sql) expect(stmt).not.toMatch(/INSERT|UPDATE|DELETE|ALL/i);
  });

  it("give the workflow role no access to the auth tables", () => {
    const app = GRANTS.find((g) => g.role === "n8n_app")!;
    for (const stmt of app.sql) expect(stmt).not.toMatch(/\b(users?|sessions?|accounts?)\b/i);
  });
});
