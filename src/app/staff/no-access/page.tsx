import { SignOutButton } from "@/components/staff/SignOutButton";

export default function NoAccessPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">Нямате достъп</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Акаунтът ви не е одобрен за служебното табло. Обърнете се към мениджъра по поддръжка.
      </p>
      <SignOutButton />
    </main>
  );
}
