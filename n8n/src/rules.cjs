// HomeTech support policy (Stage 3 of the assignment), deterministic.
// Runs inside the n8n Code node "Apply business rules" of WF-2 (the generator copies the
// function below verbatim) and in unit tests (src/lib/rules.test.ts).
//
// Dates and amounts come from the orders table, never from the customer's text.
// The AI only says what the customer wants (refund? defect? answer in the handbook?).
// Order: R1 (order check, done earlier in WF-2) → injection → R6 → R2–R5 → R7 → R8,
// then the output guardrail (a flagged draft is never auto-sent).
//
// input = {
//   today: "YYYY-MM-DD",
//   order: { purchase_date: "YYYY-MM-DD", amount_eur: number },
//   injection: boolean,
//   output_blocked: boolean (the output guardrails stopped the AI draft reply),
//   output_block_reason: string,
//   sentiment: { category: "Positive"|"Neutral"|"Negative", strength: 0..1, confidence: 0..1 },
//   department: "Technical support"|"Returns & refunds"|"Shipping & delivery"|"Billing & invoices"|"Other",
//   ai: { refund_requested: boolean, defect_reported: boolean, answer_found_in_kb: boolean },
// }
// returns { policy_rule, status, urgency, status_reason, send_reply, needs_approval }

// BEGIN decide
function decide(input) {
  const NEGATIVE_THRESHOLD = 0.8;
  const RETURN_DAYS = 30;
  const AUTO_REFUND_MAX_EUR = 100;
  const WARRANTY_MONTHS = 24;

  const day = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
  const today = day(String(input.today));
  const purchase = day(String(input.order.purchase_date).slice(0, 10));
  const ageDays = Math.round((today - purchase) / 86400000);
  const p = new Date(purchase);
  const warrantyEnd = Date.UTC(p.getUTCFullYear(), p.getUTCMonth() + WARRANTY_MONTHS, p.getUTCDate());
  const inWarranty = today <= warrantyEnd;
  const amount = Number(input.order.amount_eur);

  const ai = input.ai || {};
  const s = input.sentiment || {};
  const negative = String(s.category || "").toLowerCase() === "negative";
  // "сила/увереност ≥ 0.8": strongly negative AND the model is sure about it.
  // Confidence alone (a calm message the model is sure is slightly negative) is not enough.
  const strongNegative = negative && Number(s.strength) >= NEGATIVE_THRESHOLD && Number(s.confidence) >= NEGATIVE_THRESHOLD;
  const baseUrgency = negative || ai.refund_requested || ai.defect_reported ? "Medium" : "Low";

  const final = (policy_rule, status, urgency, status_reason) => ({
    policy_rule,
    status,
    urgency,
    status_reason,
    send_reply: status === "Auto-answered" || status === "Rejected",
    needs_approval: status === "Waiting for approval",
  });
  // Output guardrails: a flagged AI draft is never sent automatically (the rule's auto-reply becomes
  // GUARDRAIL / Manual review). Where a human approves anyway (R3, R4, R6), the rule stays and the
  // reason warns the approver.
  const why = String(input.output_block_reason || "guardrails").trim();
  const result = (policy_rule, status, urgency, status_reason) => {
    if (!input.output_blocked) return final(policy_rule, status, urgency, status_reason);
    if (status === "Auto-answered" || status === "Rejected") {
      return final("GUARDRAIL", "Manual review", urgency,
        `Guardrails спряха AI отговора (${why}) при правило ${policy_rule}: не се изпраща автоматично, ръчен преглед`);
    }
    return final(policy_rule, status, urgency, `${status_reason} · Guardrails маркираха черновата (${why}): прегледайте я`);
  };

  if (input.injection) {
    return final("INJECTION", "Manual review", "Medium", "Открит опит за prompt injection: не се обработва автоматично");
  }
  if (strongNegative) {
    return result("R6", "Waiting for approval", "High",
      `Негативно настроение (сила ${Number(s.strength).toFixed(2)}, увереност ${Number(s.confidence).toFixed(2)} ≥ ${NEGATIVE_THRESHOLD}): без автоматичен отговор`);
  }
  if (ai.refund_requested && ageDays <= RETURN_DAYS) {
    return amount <= AUTO_REFUND_MAX_EUR
      ? result("R2", "Auto-answered", baseUrgency, `Връщане ${ageDays} дни след покупка, сума €${amount.toFixed(2)} ≤ €${AUTO_REFUND_MAX_EUR}: одобрено автоматично`)
      : result("R3", "Waiting for approval", baseUrgency, `Връщане ${ageDays} дни след покупка, сума €${amount.toFixed(2)} > €${AUTO_REFUND_MAX_EUR}: нужно одобрение`);
  }
  if (ai.defect_reported && ageDays > RETURN_DAYS) {
    return inWarranty
      ? result("R4", "Waiting for approval", baseUrgency, `Дефект ${ageDays} дни след покупка, в рамките на ${WARRANTY_MONTHS}-месечната гаранция: нужно одобрение`)
      : result("R5", "Rejected", baseUrgency, `Дефект след изтичане на ${WARRANTY_MONTHS}-месечната гаранция (${ageDays} дни): платен ремонт`);
  }
  if ((input.department === "Technical support" || input.department === "Shipping & delivery") && ai.answer_found_in_kb) {
    const topic = input.department === "Technical support" ? "Технически въпрос" : "Въпрос за доставка";
    return result("R7", "Auto-answered", baseUrgency, `${topic}: отговорът е намерен в наръчника`);
  }
  return result("R8", "Manual review", baseUrgency,
    ai.answer_found_in_kb ? "Не попада в автоматичните правила: ръчен преглед" : "Отговорът не е в наръчника: ръчен преглед");
}
// END decide

module.exports = { decide };
