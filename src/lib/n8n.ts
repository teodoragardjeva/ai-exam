import { optionalEnv, requireEnv } from "@/lib/env";

// n8n has no published port: the app reaches it by service name on the internal Docker network.
const DEFAULT_WEBHOOK_BASE = "http://n8n:5678/webhook";

export class N8nError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "N8nError";
  }
}

// Calls an n8n Webhook node at <N8N_WEBHOOK_URL>/<path>. The workflow must check the
// x-bot-secret header (Header Auth credential) so nothing else on the network can call it.
export async function callN8n<T = unknown>(
  path: string,
  payload: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<T> {
  const base = (optionalEnv("N8N_WEBHOOK_URL") ?? DEFAULT_WEBHOOK_BASE).replace(/\/+$/, "");
  const url = `${base}/${path.replace(/^\/+/, "")}`;

  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-bot-secret": requireEnv("BOT_SECRET"),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    throw new N8nError(`n8n unreachable: ${(err as Error).message}`);
  }

  if (!res.ok) {
    throw new N8nError(`n8n responded ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}
