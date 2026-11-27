import { ChatBox } from "@/components/ChatBox";
import { ContactForm } from "@/components/ContactForm";

// Placeholder home page. Replace with the exam topic; keep the form and chat if they fit.
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">AI Exam</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Next.js · PostgreSQL · n8n, behind Nginx Proxy Manager and Cloudflare.</p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Contact</h2>
        <ContactForm />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">Assistant</h2>
        <ChatBox />
      </section>
    </main>
  );
}
