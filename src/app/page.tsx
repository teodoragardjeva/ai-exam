import Link from "next/link";
import { TicketForm } from "@/components/TicketForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">HomeTech</p>
        <h1 className="text-3xl font-semibold">Поддръжка</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Въпрос за устройство, доставка, връщане или фактура? Пишете ни и ще отговорим по имейл.
        </p>
      </header>
      <TicketForm />
      <Link href="/track" className="text-sm underline">
        Вече сте писали? Проследете запитването си →
      </Link>
    </main>
  );
}
