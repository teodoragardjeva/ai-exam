"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Listens to /api/staff/stream and re-renders the current staff page when n8n
// (or a colleague) adds or changes a ticket.
export function LiveRefresh() {
  const router = useRouter();
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/staff/stream");
    let timer: ReturnType<typeof setTimeout> | undefined;
    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.addEventListener("tickets", () => {
      // n8n often updates a ticket several times in a row: refresh once.
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    });
    return () => {
      clearTimeout(timer);
      source.close();
    };
  }, [router]);

  return (
    <span className="flex items-center gap-2 text-xs opacity-80" title={live ? "Таблото се обновява на живо" : "Няма връзка за обновяване на живо"}>
      <span className={`h-2 w-2 rounded-full ${live ? "bg-mint shadow-[0_0_6px] shadow-mint" : "bg-zinc-400"}`} />
      {live ? "На живо" : "Офлайн"}
    </span>
  );
}
