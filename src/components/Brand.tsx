import Image from "next/image";
import Link from "next/link";

/** Logo icon + "HomeTech" wordmark. `tone="light"` is for colored backgrounds. */
export function Brand({
  href = "/",
  size = 40,
  suffix,
  tone = "dark",
}: {
  href?: string;
  size?: number;
  suffix?: string;
  tone?: "dark" | "light";
}) {
  const light = tone === "light";
  const icon = <Image src="/logo-icon.png" alt="" width={size} height={Math.round((size * 612) / 682)} priority />;
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="HomeTech — начало">
      {light ? <span className="rounded-xl bg-white p-1 shadow-sm">{icon}</span> : icon}
      <span className="text-xl leading-none font-bold tracking-tight">
        <span className={light ? "text-white" : "text-brand-navy"}>Home</span>
        <span className={light ? "text-mint" : "text-brand-blue"}>Tech</span>
        {suffix && (
          <span
            className={
              light
                ? "ml-2 rounded-full bg-white/15 px-2 py-0.5 align-middle text-xs font-semibold text-white ring-1 ring-white/25"
                : "ml-2 text-sm font-medium text-slate-500"
            }
          >
            {suffix}
          </span>
        )}
      </span>
    </Link>
  );
}
