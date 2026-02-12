import { auth, signIn, signOut } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-mist-50 text-ink-900">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12 md:px-12">
        <h1 className="font-display text-3xl font-semibold">Profile</h1>
        {session?.user ? (
          <div className="rounded-3xl bg-white p-6 shadow-card">
            <div className="flex items-center gap-4">
              {session.user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.user.image}
                  alt={session.user.name ?? "User"}
                  className="h-14 w-14 rounded-full"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mist-100 text-sm font-semibold text-ink-500">
                  {session.user.name?.slice(0, 1) ?? "U"}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-ink-900">
                  {session.user.name ?? "Anonymous"}
                </p>
                <p className="text-sm text-ink-500">{session.user.email}</p>
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <button className="mt-6 rounded-2xl border border-mist-200 px-4 py-2 text-sm font-semibold text-ink-500 transition hover:border-accent-500 hover:text-accent-500">
                Sign out
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-3xl bg-white p-6 shadow-card">
            <p className="text-sm text-ink-500">
              You are not signed in yet.
            </p>
            <form
              action={async () => {
                "use server";
                await signIn("google");
              }}
            >
              <button className="mt-6 rounded-2xl bg-accent-500 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600">
                Sign in with Google
              </button>
            </form>
          </div>
        )}
      </section>
    </main>
  );
}
