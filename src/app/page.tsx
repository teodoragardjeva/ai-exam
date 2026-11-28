import Link from "next/link";
import { InfoCard, SiteShell } from "@/components/SiteShell";
import { TicketForm } from "@/components/TicketForm";

export default function Home() {
  return (
    <SiteShell
      active="/"
      title="С какво можем да помогнем?"
      intro="Въпрос за устройство, доставка, връщане или фактура? Пишете ни и ще отговорим по имейл."
      aside={
        <>
          <InfoCard icon={<ClockIcon />} title="Отговор до 1 работен ден">
            Работим пн–пт, 09:00–18:00.
          </InfoCard>
          <InfoCard icon={<MailIcon />} title="Отговорът идва по имейл">
            Получавате и номер, с който да следите запитването.
          </InfoCard>
          <InfoCard icon={<SearchIcon />} title="Вече сте писали?">
            <Link href="/track" className="font-medium text-accent-dark hover:underline">
              Проследете запитването си →
            </Link>
          </InfoCard>
        </>
      }
    >
      <h2 className="mb-1 text-lg font-semibold text-brand-navy">Ново запитване</h2>
      <p className="mb-6 text-sm text-slate-500">Всички полета са задължителни.</p>
      <TicketForm />
    </SiteShell>
  );
}

const iconProps = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
