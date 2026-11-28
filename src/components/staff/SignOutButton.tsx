"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await authClient.signOut();
        router.replace("/staff/login");
        router.refresh();
      }}
      className="rounded-lg px-3 py-1.5 text-sm font-medium ring-1 ring-current/30 transition hover:bg-white/15"
    >
      Изход
    </button>
  );
}
