import { AssistantChat } from "@/components/staff/AssistantChat";
import { requireStaffPage } from "@/lib/staff";

export const metadata = { title: "Асистент · HomeTech поддръжка" };

export default async function AssistantPage() {
  await requireStaffPage("manager");
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <header>
        <h1 className="text-2xl font-semibold">Асистент за мениджъра</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Отговаря по данните за запитванията и поръчките. Има само права за четене.
        </p>
      </header>
      <AssistantChat />
    </div>
  );
}
