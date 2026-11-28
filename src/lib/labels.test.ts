import { describe, expect, it } from "vitest";
import { departmentLabel, languageLabel, sentimentLabel, statusLabel, urgencyLabel } from "@/lib/labels";
import { DEPARTMENTS, TICKET_STATUSES, URGENCIES } from "@/lib/migrations";

const cyrillic = /^[Ѐ-ӿ\s]+$/;

describe("Bulgarian labels", () => {
  it("translate every status, department and urgency used in the database", () => {
    for (const s of TICKET_STATUSES) expect(statusLabel(s)).toMatch(cyrillic);
    for (const d of DEPARTMENTS) expect(departmentLabel(d)).toMatch(cyrillic);
    for (const u of URGENCIES) expect(urgencyLabel(u)).toMatch(cyrillic);
  });

  it("translate sentiment and common languages", () => {
    expect(sentimentLabel("Neutral")).toBe("Неутрално");
    expect(languageLabel("de")).toBe("немски");
  });

  it("show a dash for empty values and keep unknown ones as they are", () => {
    expect(departmentLabel(null)).toBe("—");
    expect(languageLabel("pt")).toBe("pt");
  });
});
