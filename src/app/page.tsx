import DashboardShell from "@/components/DashboardShell";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <main className="min-h-screen bg-canvas text-ink">
      {/* Sign-out bar — only visible on mobile since sidebar handles it on desktop */}
      <div className="fixed bottom-4 right-4 z-40 lg:hidden">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/signin" });
          }}
        >
          <button
            type="submit"
            className="rounded-pill border border-hairline bg-canvas px-3 py-1.5 text-xs font-medium text-ink-muted shadow-subtle transition hover:border-coral hover:text-coral"
          >
            Sign out
          </button>
        </form>
      </div>
      <DashboardShell email={session?.user?.email} />
    </main>
  );
}
