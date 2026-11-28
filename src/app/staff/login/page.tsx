import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/staff/LoginForm";
import { getStaff } from "@/lib/staff";

export const metadata = { title: "Вход за служители · HomeTech" };

// Checks the session to skip the form for logged-in staff: per-request only.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getStaff()) redirect("/staff");
  return (
    <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-brand-navy via-[#0d3a8f] to-brand-blue px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-2xl bg-white p-8 shadow-2xl">
        <header className="flex flex-col items-center gap-3 text-center">
          <Image src="/logo.png" alt="HomeTech" width={168} height={128} priority />
          <h1 className="text-xl font-semibold text-brand-navy">Вход за служители</h1>
        </header>
        <LoginForm />
      </div>
    </main>
  );
}
