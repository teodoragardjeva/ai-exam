import Link from "next/link";
import { Brand } from "@/components/Brand";

const NAV = [
  { href: "/", label: "Ново запитване", short: "Ново" },
  { href: "/track", label: "Проследи запитване", short: "Проследи" },
] as const;

/** Public page frame: header with logo, gradient hero, white card for the form, footer. */
export function SiteShell({
  active,
  title,
  intro,
  children,
  aside,
}: {
  active: (typeof NAV)[number]["href"];
  title: string;
  intro: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Brand />
          <nav className="flex items-center gap-1 text-sm font-medium">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === active ? "page" : undefined}
                className="rounded-lg px-2.5 py-2 whitespace-nowrap text-slate-600 sm:px-3 transition hover:bg-slate-100 hover:text-brand-navy aria-[current=page]:bg-accent/10 aria-[current=page]:text-accent-dark"
              >
                <span className="sm:hidden">{item.short}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-gradient-to-br from-accent-dark via-[#0e9aa7] to-[#38bdf8] text-white">
        <svg
          aria-hidden
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          className="absolute inset-x-0 bottom-0 h-16 w-full text-background sm:h-24"
        >
          <path fill="currentColor" d="M0 80 C 360 0, 1080 160, 1440 40 L1440 120 L0 120 Z" />
        </svg>
        <div
          aria-hidden
          className="absolute -top-24 -right-24 size-80 rounded-full bg-mint/40 blur-3xl"
        />
        <div aria-hidden className="absolute -bottom-32 left-1/4 size-72 rounded-full bg-emerald-300/25 blur-3xl" />
        <div className="relative mx-auto w-full max-w-5xl px-4 pt-10 pb-24 sm:pt-14 sm:pb-32">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase ring-1 ring-white/25">
            <span className="size-1.5 rounded-full bg-mint" />
            Поддръжка на клиенти
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-xl text-base text-teal-50 sm:text-lg">{intro}</p>
        </div>
      </section>

      <main className="relative mx-auto -mt-16 grid w-full max-w-5xl flex-1 gap-6 px-4 pb-16 sm:-mt-24 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-accent/10 sm:p-8">{children}</div>
        {aside && <aside className="flex flex-col gap-4 lg:pt-4">{aside}</aside>}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HomeTech · Умни устройства за дома</p>
          <p>Поддръжка: пн–пт, 09:00–18:00</p>
        </div>
      </footer>
    </div>
  );
}

/** Small info card for the shell's side column. */
export function InfoCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-accent/15 to-mint/25 text-accent-dark">{icon}</div>
      <div className="text-sm">
        <p className="font-semibold text-brand-navy">{title}</p>
        <div className="mt-0.5 text-slate-600">{children}</div>
      </div>
    </div>
  );
}
