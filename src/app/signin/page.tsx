import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams
}: {
  searchParams?: { callbackUrl?: string };
}) {
  const session = await auth();
  if (session?.user) redirect("/");

  const callbackUrl = searchParams?.callbackUrl || "/";
  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="min-h-screen bg-canvas flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand mark */}
        <div className="mb-8 flex items-center gap-2.5">
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
            <path d="M9 0v18M0 9h18M2.636 2.636l12.728 12.728M15.364 2.636 2.636 15.364"
              stroke="#cc785c" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="font-display text-xl font-normal text-ink">Focus Tasks</span>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-hairline bg-surface-card p-8">
          <h1 className="font-display text-3xl font-normal tracking-[-0.5px] text-ink">
            Sign in to continue
          </h1>

          {isDev ? (
            <>
              <p className="mt-2 text-sm text-amber leading-relaxed">
                Dev mode — enter any email to access instantly.
              </p>
              <form
                className="mt-6 flex flex-col gap-3"
                action={async (formData: FormData) => {
                  "use server";
                  const email = formData.get("email") as string;
                  await signIn("dev-credentials", { email, redirectTo: callbackUrl });
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-ink-muted">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    defaultValue="abhishekt646@gmail.com"
                    className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-coral"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-1 rounded-md bg-coral px-4 py-2.5 text-sm font-medium text-white transition hover:bg-coral-active"
                >
                  Continue →
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                Only authorized Google accounts can access this workspace.
              </p>
              <form
                className="mt-6"
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: callbackUrl });
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-md bg-coral px-4 py-2.5 text-sm font-medium text-white transition hover:bg-coral-active"
                >
                  Continue with Google
                </button>
              </form>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-soft">
          Your data stays in your browser. Nothing is shared.
        </p>
      </div>
    </main>
  );
}
