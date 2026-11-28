import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const { decide } = require("../../n8n/src/rules.cjs") as { decide: (input: unknown) => Decision };

type Decision = {
  policy_rule: string;
  status: string;
  urgency: string;
  status_reason: string;
  send_reply: boolean;
  needs_approval: boolean;
};

const TODAY = "2026-11-28";
const daysAgo = (n: number) => new Date(Date.UTC(2026, 10, 28 - n)).toISOString().slice(0, 10);
const monthsAgo = (n: number) => new Date(Date.UTC(2026, 10 - n, 28)).toISOString().slice(0, 10);

// Appendix B orders (amounts and dates relative to the exam day).
const ORDERS = {
  "HT-10421": { purchase_date: daysAgo(5), amount_eur: 39.8 },
  "HT-10422": { purchase_date: daysAgo(12), amount_eur: 149 },
  "HT-10423": { purchase_date: daysAgo(45), amount_eur: 129 },
  "HT-10424": { purchase_date: monthsAgo(30), amount_eur: 199 },
  "HT-10425": { purchase_date: daysAgo(3), amount_eur: 59 },
  "HT-10426": { purchase_date: daysAgo(20), amount_eur: 19.9 },
  "HT-10427": { purchase_date: daysAgo(8), amount_eur: 129 },
} as const;

const neutral = { category: "Neutral", strength: 0.2, confidence: 0.8 };
const ai = (over: Partial<{ refund_requested: boolean; defect_reported: boolean; answer_found_in_kb: boolean }> = {}) => ({
  refund_requested: false,
  defect_reported: false,
  answer_found_in_kb: false,
  ...over,
});

function run(order: keyof typeof ORDERS, rest: Record<string, unknown>) {
  return decide({ today: TODAY, order: ORDERS[order], injection: false, sentiment: neutral, department: "Other", ai: ai(), ...rest });
}

describe("business rules on the Appendix C scenarios", () => {
  it("1: return of a €39.80 plug after 5 days → R2 Auto-answered", () => {
    const d = run("HT-10421", { department: "Returns & refunds", ai: ai({ refund_requested: true, answer_found_in_kb: true }) });
    expect(d).toMatchObject({ policy_rule: "R2", status: "Auto-answered", send_reply: true, needs_approval: false });
  });

  it("2: refund for a €149 camera with a cracked lens after 12 days → R3 Waiting for approval", () => {
    const d = run("HT-10422", { department: "Returns & refunds", ai: ai({ refund_requested: true, defect_reported: true }) });
    expect(d).toMatchObject({ policy_rule: "R3", status: "Waiting for approval", needs_approval: true, send_reply: false });
  });

  it("2 (angry version): strong negative sentiment wins → R6 High", () => {
    const d = run("HT-10422", {
      sentiment: { category: "Negative", strength: 0.85, confidence: 0.9 },
      ai: ai({ refund_requested: true, defect_reported: true }),
    });
    expect(d).toMatchObject({ policy_rule: "R6", status: "Waiting for approval", urgency: "High" });
  });

  it("3: thermostat stopped heating after 45 days → R4 warranty, Waiting for approval", () => {
    const d = run("HT-10423", { department: "Technical support", ai: ai({ defect_reported: true, answer_found_in_kb: true }) });
    expect(d).toMatchObject({ policy_rule: "R4", status: "Waiting for approval" });
  });

  it("4: hub dead after 30 months → R5 Rejected, reply is sent (paid repair)", () => {
    const d = run("HT-10424", { department: "Technical support", ai: ai({ defect_reported: true, refund_requested: true }) });
    expect(d).toMatchObject({ policy_rule: "R5", status: "Rejected", send_reply: true, needs_approval: false });
  });

  it("5: 'No Wi-Fi' answered from the FAQ → R7 Auto-answered", () => {
    const d = run("HT-10427", { department: "Technical support", ai: ai({ answer_found_in_kb: true }) });
    expect(d).toMatchObject({ policy_rule: "R7", status: "Auto-answered", urgency: "Low" });
  });

  it("6: shipping question in German → R7, or R6 when strongly negative", () => {
    expect(run("HT-10425", { department: "Shipping & delivery", ai: ai({ answer_found_in_kb: true }) }).policy_rule).toBe("R7");
    expect(
      run("HT-10425", {
        department: "Shipping & delivery",
        sentiment: { category: "Negative", strength: 0.8, confidence: 0.8 },
        ai: ai({ answer_found_in_kb: true }),
      }).policy_rule,
    ).toBe("R6");
  });

  it("R6 needs both strength and confidence ≥ 0.8 (confidence alone isn't enough)", () => {
    const at = (strength: number, confidence: number) =>
      run("HT-10421", { department: "Returns & refunds", sentiment: { category: "Negative", strength, confidence }, ai: ai({ refund_requested: true }) }).policy_rule;
    expect(at(0.6, 0.9)).toBe("R2");
    expect(at(0.9, 0.6)).toBe("R2");
    expect(at(0.8, 0.8)).toBe("R6");
  });

  it("7: all-caps complaint → R6 High, never auto-answered", () => {
    const d = run("HT-10426", {
      department: "Technical support",
      sentiment: { category: "Negative", strength: 0.95, confidence: 0.92 },
      ai: ai({ answer_found_in_kb: true }),
    });
    expect(d).toMatchObject({ policy_rule: "R6", status: "Waiting for approval", urgency: "High", send_reply: false });
  });

  it("9: prompt injection → Manual review, nothing sent, even if it 'asks' for a refund", () => {
    const d = run("HT-10426", { injection: true, ai: ai({ refund_requested: true }) });
    expect(d).toMatchObject({ policy_rule: "INJECTION", status: "Manual review", send_reply: false, needs_approval: false });
  });

  it("output guardrail blocked the draft → Manual review, nothing sent, even when R2 would auto-answer", () => {
    const d = run("HT-10421", { output_blocked: true, output_block_reason: "urls", ai: ai({ refund_requested: true }) });
    expect(d).toMatchObject({ policy_rule: "GUARDRAIL", status: "Manual review", urgency: "Medium", send_reply: false, needs_approval: false });
    expect(d.status_reason).toContain("urls");
    expect(d.status_reason).toContain("R2");
  });

  it("output guardrail on a rule that needs approval anyway → rule stays, the approver is warned", () => {
    const angry = { category: "Negative", strength: 0.95, confidence: 0.9 };
    const d = run("HT-10422", { sentiment: angry, output_blocked: true, output_block_reason: "Policy & leak" });
    expect(d).toMatchObject({ policy_rule: "R6", status: "Waiting for approval", urgency: "High", send_reply: false, needs_approval: true });
    expect(d.status_reason).toContain("Policy & leak");
  });

  it("injection still wins over a blocked output", () => {
    expect(run("HT-10421", { injection: true, output_blocked: true }).policy_rule).toBe("INJECTION");
  });

  it("10: 20% discount, not in the handbook → R8 Manual review", () => {
    const d = run("HT-10427", { department: "Other", ai: ai({ answer_found_in_kb: false }) });
    expect(d).toMatchObject({ policy_rule: "R8", status: "Manual review", send_reply: false });
  });
});

describe("rule boundaries", () => {
  it("refund on day 30 is still R2/R3, on day 31 it isn't", () => {
    const at = (n: number, amount: number) =>
      decide({ today: TODAY, order: { purchase_date: daysAgo(n), amount_eur: amount }, injection: false, sentiment: neutral, department: "Returns & refunds", ai: ai({ refund_requested: true }) }).policy_rule;
    expect(at(30, 100)).toBe("R2");
    expect(at(30, 100.01)).toBe("R3");
    expect(at(31, 50)).toBe("R8");
  });

  it("warranty ends exactly 24 months after purchase", () => {
    const at = (purchase: string) =>
      decide({ today: TODAY, order: { purchase_date: purchase, amount_eur: 50 }, injection: false, sentiment: neutral, department: "Technical support", ai: ai({ defect_reported: true }) }).policy_rule;
    expect(at(monthsAgo(24))).toBe("R4");
    expect(at(new Date(Date.UTC(2024, 10, 27)).toISOString().slice(0, 10))).toBe("R5");
  });

  it("an answer from the handbook in Returns or Billing is not auto-answered (R7 covers only technical/shipping)", () => {
    expect(run("HT-10427", { department: "Billing & invoices", ai: ai({ answer_found_in_kb: true }) }).policy_rule).toBe("R8");
  });

  it("a negative message below the threshold is Medium, not High", () => {
    const d = run("HT-10427", { department: "Technical support", sentiment: { category: "Negative", strength: 0.6, confidence: 0.7 }, ai: ai({ answer_found_in_kb: true }) });
    expect(d).toMatchObject({ policy_rule: "R7", urgency: "Medium" });
  });

  it("writes every status reason in Bulgarian (shown in the staff dashboard)", () => {
    const reasons = [
      run("HT-10427", { department: "Technical support", ai: ai({ answer_found_in_kb: true }) }),
      run("HT-10425", { department: "Shipping & delivery", ai: ai({ answer_found_in_kb: true }) }),
      run("HT-10427", { department: "Other" }),
      run("HT-10421", { department: "Returns & refunds", ai: ai({ refund_requested: true }) }),
    ].map((d) => d.status_reason);
    for (const r of reasons) expect(r).not.toMatch(/Technical support|Shipping & delivery|Returns & refunds|Other/);
  });

  it("accepts Postgres timestamps as purchase_date", () => {
    const d = decide({ today: TODAY, order: { purchase_date: "2026-11-23T00:00:00.000Z", amount_eur: "39.80" }, injection: false, sentiment: neutral, department: "Returns & refunds", ai: ai({ refund_requested: true }) });
    expect(d.policy_rule).toBe("R2");
  });
});
