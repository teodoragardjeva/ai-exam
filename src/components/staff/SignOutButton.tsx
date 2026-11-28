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
      className="text-sm underline"
    >
      Изход
    </button>
  );
}
