import Image from "next/image";
import Link from "next/link";

/** Logo icon + "HomeTech" wordmark in the logo's two colors. */
export function Brand({ href = "/", size = 40, suffix }: { href?: string; size?: number; suffix?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5" aria-label="HomeTech — начало">
      <Image src="/logo-icon.png" alt="" width={size} height={Math.round((size * 612) / 682)} priority />
      <span className="text-xl leading-none font-bold tracking-tight">
        <span className="text-brand-navy">Home</span>
        <span className="text-brand-blue">Tech</span>
        {suffix && <span className="ml-2 text-sm font-medium text-slate-500">{suffix}</span>}
      </span>
    </Link>
  );
}
