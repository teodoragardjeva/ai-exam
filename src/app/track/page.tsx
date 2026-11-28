import Link from "next/link";
import { TrackForm } from "@/components/TrackForm";

export const metadata = { title: "Проследи запитване · HomeTech поддръжка" };

export default function TrackPage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">HomeTech</p>
        <h1 className="text-3xl font-semibold">Проследи запитване</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Въведете номера на запитването и имейла, от който сте писали.</p>
      </header>
      <TrackForm />
      <Link href="/" className="text-sm underline">
        ← Ново запитване
      </Link>
    </main>
  );
}
