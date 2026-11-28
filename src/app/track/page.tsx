import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { TrackForm } from "@/components/TrackForm";

export const metadata = { title: "Проследи запитване · HomeTech поддръжка" };

export default function TrackPage() {
  return (
    <SiteShell
      active="/track"
      title="Проследи запитване"
      intro="Въведете номера на запитването и имейла, от който сте писали."
    >
      <TrackForm />
      <p className="mt-6 border-t border-slate-100 pt-4 text-sm text-slate-500">
        Нямате номер?{" "}
        <Link href="/" className="font-medium text-brand-blue hover:underline">
          Изпратете ново запитване
        </Link>
      </p>
    </SiteShell>
  );
}
