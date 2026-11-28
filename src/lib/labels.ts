// Bulgarian display labels. The database and n8n keep the English values from the
// assignment (statuses, departments, urgency), so only the UI is translated.

const STATUS: Record<string, string> = {
  New: "Ново",
  "Auto-answered": "Отговорено автоматично",
  "Waiting for approval": "Чака одобрение",
  "Approved & sent": "Одобрено и изпратено",
  Rejected: "Отказано",
  "Manual review": "Ръчен преглед",
  Closed: "Затворено",
};

const DEPARTMENT: Record<string, string> = {
  "Technical support": "Техническа поддръжка",
  "Returns & refunds": "Връщане на стока и пари",
  "Shipping & delivery": "Доставка",
  "Billing & invoices": "Фактури",
  Other: "Друго",
};

const URGENCY: Record<string, string> = { Low: "Ниска", Medium: "Средна", High: "Висока" };

const SENTIMENT: Record<string, string> = { Positive: "Положително", Neutral: "Неутрално", Negative: "Отрицателно" };

const LANGUAGE: Record<string, string> = {
  bg: "български",
  en: "английски",
  de: "немски",
  fr: "френски",
  es: "испански",
  it: "италиански",
  ro: "румънски",
  el: "гръцки",
  tr: "турски",
  ru: "руски",
};

const pick = (map: Record<string, string>) => (value: string | null | undefined) =>
  value == null || value === "" ? "—" : map[value] ?? value;

export const statusLabel = pick(STATUS);
export const departmentLabel = pick(DEPARTMENT);
export const urgencyLabel = pick(URGENCY);
export const sentimentLabel = pick(SENTIMENT);
export const languageLabel = pick(LANGUAGE);
