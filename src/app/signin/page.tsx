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
    <main className="min-h-screen bg-mist-50 text-ink-900">
      <section className="mx-auto flex min-h-screen w-full max-w-lg items-center px-6 py-12">
        <div className="w-full rounded-3xl bg-white p-8 shadow-card">
          <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Focus Tasks</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ink-900">
            Sign in to continue
          </h1>

          {isDev ? (
            <>
              <p className="mt-2 text-sm text-amber-500 font-medium">
                ⚠️ Dev mode — enter any email to sign in instantly.
              </p>
              <form
                className="mt-8 flex flex-col gap-3"
                action={async (formData: FormData) => {
                  "use server";
                  const email = formData.get("email") as string;
                  await signIn("dev-credentials", { email, redirectTo: callbackUrl });
                }}
              >
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  defaultValue="abhishekt646@gmail.com"
                  className="w-full rounded-2xl border border-mist-200 px-4 py-3 text-sm text-ink-900 outline-none focus:border-accent-500"
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600"
                >
                  Continue →
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-ink-500">
                Only authorized Google accounts can access this workspace.
              </p>
              <form
                className="mt-8"
                action={async () => {
                  "use server";
                  await signIn("google", { redirectTo: callbackUrl });
                }}
              >
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600"
                >
                  Continue with Google
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
