import { redirect } from "next/navigation";
import { LoginForm } from "@/components/staff/LoginForm";
import { getStaff } from "@/lib/staff";

export const metadata = { title: "Вход за служители · HomeTech" };

// Checks the session to skip the form for logged-in staff: per-request only.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getStaff()) redirect("/staff");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <header className="flex flex-col gap-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">HomeTech</p>
        <h1 className="text-2xl font-semibold">Вход за служители</h1>
      </header>
      <LoginForm />
    </main>
  );
}
