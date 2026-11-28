"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Manager-only header button: glowing pill with a sparkle; solid when on the assistant page. */
export function AssistantLink() {
  const active = usePathname().startsWith("/staff/assistant");
  return (
    <Link
      href="/staff/assistant"
      aria-current={active ? "page" : undefined}
      className={`group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:ring-white/40 focus-visible:outline-none ${
        active
          ? "bg-white text-accent-dark shadow-lg shadow-black/15"
          : "bg-white/15 text-white ring-1 ring-white/30 hover:bg-white hover:text-accent-dark hover:shadow-lg hover:shadow-mint/40"
      }`}
    >
      <span
        aria-hidden
        className={`flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-mint to-brand-cyan text-brand-navy transition group-hover:rotate-12 ${
          active ? "" : "animate-pulse group-hover:animate-none"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" />
          <path d="M19 14l.9 2.6 2.6.9-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" opacity=".7" />
        </svg>
      </span>
      AI асистент
    </Link>
  );
}
