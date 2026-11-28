import { Client } from "pg";
import { requireEnv } from "@/lib/env";
import { requireStaffApi } from "@/lib/staff";

// Live updates for the staff dashboard (our replacement for Supabase Realtime):
// the tickets trigger runs pg_notify('tickets_changed', ...) on every insert/update,
// this route LISTENs and forwards each notification as a Server-Sent Event.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const staff = await requireStaffApi();
  if (staff instanceof Response) return staff;

  const db = new Client({ connectionString: requireEnv("DATABASE_URL") });
  await db.connect();
  await db.query("LISTEN tickets_changed");

  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let closed = false;

  const close = async () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);
    await db.query("UNLISTEN tickets_changed").catch(() => {});
    await db.end().catch(() => {});
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (text: string) => {
        if (!closed) controller.enqueue(encoder.encode(text));
      };
      send("retry: 3000\n\n");
      db.on("notification", (msg) => send(`event: tickets\ndata: ${msg.payload ?? "{}"}\n\n`));
      db.on("error", () => {
        void close();
        try {
          controller.close();
        } catch {}
      });
      // Keeps proxies (NPM, Cloudflare) from closing an idle connection.
      heartbeat = setInterval(() => send(": ping\n\n"), 25_000);
      request.signal.addEventListener("abort", () => void close());
    },
    cancel() {
      void close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
