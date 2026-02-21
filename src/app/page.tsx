import TaskApp from "@/components/TaskApp";
import CalendarSyncPanel from "@/components/CalendarSyncPanel";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <main className="min-h-screen bg-mist-50 text-ink-900">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-3 px-6 pt-8 md:px-12">
        <span className="text-xs text-ink-500">{session?.user?.email}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button
            type="submit"
            className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 transition hover:border-accent-500 hover:text-accent-500"
          >
            Sign out
          </button>
        </form>
      </div>
      <TaskApp />
      <CalendarSyncPanel />
    </main>
  );
}
