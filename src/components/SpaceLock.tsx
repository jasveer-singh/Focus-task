"use client";

// SpaceLock — shown in the DashboardShell header.
// Unlocked = personal content visible. Locked = professional only.

type Props = {
  unlocked: boolean;
  supported: boolean;
  onUnlock: () => void;
  onLock: () => void;
};

export default function SpaceLock({ unlocked, supported, onUnlock, onLock }: Props) {
  if (!supported) return null;

  if (unlocked) {
    return (
      <button
        type="button"
        onClick={onLock}
        title="Personal space unlocked — click to lock"
        className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
          <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M5 7V5a3 3 0 0 1 6 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
        Personal
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onUnlock}
      title="Show personal content — Touch ID required"
      className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
        <path d="M5 7V5a3 3 0 0 1 5.83-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
      Personal
    </button>
  );
}

// ── Small space picker used inside create forms ──────────────────────────────

export function SpacePicker({
  value,
  onChange,
}: {
  value: "professional" | "personal";
  onChange: (v: "professional" | "personal") => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-hairline p-0.5">
      {(["professional", "personal"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
            value === s
              ? s === "personal"
                ? "bg-amber-100 text-amber-700"
                : "bg-surface-card text-ink"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
