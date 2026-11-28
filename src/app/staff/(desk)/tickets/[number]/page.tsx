import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge, UrgencyBadge } from "@/components/staff/Badges";
import { StatusForm } from "@/components/staff/StatusForm";
import { departmentLabel, languageLabel, sentimentLabel } from "@/lib/labels";
import { requireStaffPage } from "@/lib/staff";
import { getTicket } from "@/lib/tickets";

const RULE_LABELS: Record<string, string> = {
  R1: "R1 · поръчката не е намерена или имейлът не съвпада",
  R2: "R2 · връщане до 30 дни и до €100: одобрено автоматично",
  R3: "R3 · връщане до 30 дни над €100: нужно одобрение",
  R4: "R4 · дефект след 30 дни, в 24-месечната гаранция: нужно одобрение",
  R5: "R5 · дефект след изтичане на гаранцията: отказ, платен ремонт",
  R6: "R6 · силно негативно настроение: висока спешност, без автоматичен отговор",
  R7: "R7 · технически въпрос или доставка, отговорено от наръчника",
  R8: "R8 · всичко останало: ръчен преглед",
  INJECTION: "Открит опит за prompt injection: ръчен преглед",
};

export default async function TicketPage({ params }: PageProps<"/staff/tickets/[number]">) {
  await requireStaffPage();
  const { number } = await params;
  const ticket = await getTicket(number.toUpperCase());
  if (!ticket) notFound();

  const score = (v: string | null) => (v == null ? "—" : Number(v).toFixed(2));

  return (
    <div className="flex flex-col gap-6">
      <Link href="/staff" className="text-sm underline">
        ← Всички запитвания
      </Link>

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-mono text-2xl font-semibold">{ticket.ticket_number}</h1>
        <StatusBadge status={ticket.status} />
        <UrgencyBadge urgency={ticket.urgency} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card title="Съобщение на клиента">
            <p className="whitespace-pre-wrap">{ticket.message}</p>
          </Card>
          <Card title="AI резюме">
            <p>{ticket.ai_summary ?? "—"}</p>
          </Card>
          <Card title="Решение по политиката">
            <p className="font-medium">{ticket.policy_rule ? RULE_LABELS[ticket.policy_rule] ?? ticket.policy_rule : "—"}</p>
            {ticket.status_reason && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{ticket.status_reason}</p>}
          </Card>
          <Card title="AI чернова на отговор">
            <p className="whitespace-pre-wrap">{ticket.ai_draft_reply ?? "—"}</p>
          </Card>
          <Card title="Финален отговор">
            <p className="whitespace-pre-wrap">{ticket.final_reply ?? "Още не е изпратен."}</p>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card title="Смяна на статус">
            <StatusForm ticketNumber={ticket.ticket_number} current={ticket.status} />
          </Card>
          <Card title="Детайли">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <Row label="Клиент" value={`${ticket.customer_name} · ${ticket.customer_email}`} />
              <Row label="Поръчка" value={ticket.order_number} />
              <Row label="Отдел" value={departmentLabel(ticket.department)} />
              <Row label="Език" value={languageLabel(ticket.language)} />
              <Row label="Настроение" value={ticket.sentiment && `${sentimentLabel(ticket.sentiment)} (сила ${score(ticket.sentiment_score)}, увереност ${score(ticket.sentiment_confidence)})`} />
              <Row label="В наръчника" value={ticket.answer_found_in_kb == null ? null : ticket.answer_found_in_kb ? "да" : "не"} />
              <Row label="Връщане на пари" value={ticket.refund_requested ? `да${ticket.refund_amount ? `, €${ticket.refund_amount}` : ""}` : "не"} />
              <Row label="Обработено от" value={ticket.handled_by} />
              <Row label="Създадено" value={new Date(ticket.created_at).toLocaleString("bg-BG", { timeZone: "Europe/Sofia" })} />
            </dl>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd>{value || "—"}</dd>
    </>
  );
}
