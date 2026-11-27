import { afterEach, describe, expect, it, vi } from "vitest";
import { callN8n, N8nError } from "@/lib/n8n";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("callN8n", () => {
  it("posts to the internal webhook with the shared secret", async () => {
    vi.stubEnv("BOT_SECRET", "s3cret");
    vi.stubEnv("N8N_WEBHOOK_URL", "");
    const f = vi.fn(async () => Response.json({ reply: "hi" }));

    const data = await callN8n("chat", { message: "hello" }, f as unknown as typeof fetch);

    expect(data).toEqual({ reply: "hi" });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://n8n:5678/webhook/chat");
    expect((init.headers as Record<string, string>)["x-bot-secret"]).toBe("s3cret");
    expect(init.body).toBe(JSON.stringify({ message: "hello" }));
  });

  it("joins a custom base url without double slashes", async () => {
    vi.stubEnv("BOT_SECRET", "s");
    vi.stubEnv("N8N_WEBHOOK_URL", "http://localhost:5678/webhook-test/");
    const f = vi.fn(async () => Response.json({}));
    await callN8n("/chat", {}, f as unknown as typeof fetch);
    const [url] = f.mock.calls[0] as unknown as [string];
    expect(url).toBe("http://localhost:5678/webhook-test/chat");
  });

  it("throws N8nError on a non-2xx response", async () => {
    vi.stubEnv("BOT_SECRET", "s");
    const f = vi.fn(async () => new Response("nope", { status: 403 }));
    await expect(callN8n("chat", {}, f as unknown as typeof fetch)).rejects.toBeInstanceOf(N8nError);
  });

  it("refuses to call n8n without BOT_SECRET", async () => {
    vi.stubEnv("BOT_SECRET", "");
    const f = vi.fn();
    await expect(callN8n("chat", {}, f as unknown as typeof fetch)).rejects.toThrow("BOT_SECRET");
    expect(f).not.toHaveBeenCalled();
  });
});
