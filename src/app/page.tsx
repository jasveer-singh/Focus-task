import TaskApp from "@/components/TaskApp";
import Link from "next/link";

export default function Page() {
  return (
    <main className="min-h-screen bg-mist-50 text-ink-900">
      <div className="mx-auto w-full max-w-6xl px-6 pt-10 md:px-12">
        <div className="flex items-center justify-end">
          <Link
            href="/profile"
            className="rounded-full border border-mist-200 bg-white px-4 py-2 text-xs font-semibold text-ink-500 transition hover:border-accent-500 hover:text-accent-500"
          >
            Profile
          </Link>
        </div>
      </div>
      <TaskApp />
    </main>
  );
}
