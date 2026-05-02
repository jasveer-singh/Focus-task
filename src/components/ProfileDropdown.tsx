"use client";

import { useEffect, useRef, useState } from "react";
import { signOut, signIn } from "next-auth/react";

// ─── helpers ───────────────────────────────────────────────────────────────

function getInitials(name?: string | null, email?: string | null) {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : "??";
}

function getDisplayName(name?: string | null, email?: string | null) {
  return name ?? email?.split("@")[0] ?? "Account";
}

// ─── Modal shell ───────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(20,20,19,0.45)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade w-full max-w-md rounded-xl border border-hairline bg-canvas shadow-subtle">
        {children}
      </div>
    </div>
  );
}

// ─── Add account modal ─────────────────────────────────────────────────────

function AddAccountModal({ onClose }: { onClose: () => void }) {
  const isDev = process.env.NODE_ENV === "development";
  const [email, setEmail] = useState("");

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <h2 className="font-display text-xl font-normal tracking-[-0.3px] text-ink">Add account</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft transition hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="px-6 py-5">
        <p className="text-sm text-ink-muted leading-relaxed">
          Sign in with another account to switch between workspaces.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {isDev ? (
            <>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-coral"
              />
              <button
                type="button"
                onClick={() => { if (email) { signIn("dev-credentials", { email }); onClose(); } }}
                className="rounded-md bg-coral px-4 py-2.5 text-sm font-medium text-white transition hover:bg-coral-active"
              >
                Add account →
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => { signIn("google"); onClose(); }}
              className="rounded-md bg-coral px-4 py-2.5 text-sm font-medium text-white transition hover:bg-coral-active"
            >
              Continue with Google
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

// ─── Settings modal ────────────────────────────────────────────────────────

type Theme = "light" | "dark" | "system";

function SettingsModal({ onClose }: { onClose: () => void }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("focus-theme") as Theme) ?? "system";
    }
    return "system";
  });

  function applyTheme(t: Theme) {
    setTheme(t);
    localStorage.setItem("focus-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <h2 className="font-display text-xl font-normal tracking-[-0.3px] text-ink">Settings</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft transition hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="px-6 py-5 flex flex-col gap-6">
        {/* Theme */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[1.2px] text-ink-muted mb-3">Appearance</p>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => applyTheme(t)}
                className={`rounded-md border py-2.5 text-sm font-medium capitalize transition ${
                  theme === t
                    ? "border-coral bg-coral/10 text-coral"
                    : "border-hairline bg-canvas text-ink-muted hover:border-coral/50 hover:text-ink"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications hint */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[1.2px] text-ink-muted mb-3">Notifications</p>
          <p className="text-sm text-ink-muted leading-relaxed">
            Manage notification preferences from the <span className="font-medium text-ink">Reminders</span> tab in the sidebar.
          </p>
        </div>
      </div>
      <div className="border-t border-hairline px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}

// ─── Logout modal ──────────────────────────────────────────────────────────

function LogoutModal({
  onClose,
  name,
  email,
  initials
}: {
  onClose: () => void;
  name?: string | null;
  email?: string | null;
  initials: string;
}) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <h2 className="font-display text-xl font-normal tracking-[-0.3px] text-ink">Log out</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft transition hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
      <div className="px-6 py-5">
        {/* Account card */}
        <div className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-card px-4 py-3 mb-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: "#b8694e" }}>
            {initials}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{getDisplayName(name, email)}</p>
            <p className="truncate text-xs text-ink-muted">{email}</p>
          </div>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">
          You'll be signed out of this account. Any unsaved changes will remain stored locally.
        </p>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-hairline px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink-muted transition hover:border-coral hover:text-coral"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/signin" })}
          className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active"
        >
          Log out
        </button>
      </div>
    </Modal>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

type ModalType = "add-account" | "settings" | "logout" | null;

export default function ProfileDropdown({
  name,
  email
}: {
  name?: string | null;
  email?: string | null;
}) {
  const [open, setOpen]         = useState(false);
  const [modal, setModal]       = useState<ModalType>(null);
  const ref                     = useRef<HTMLDivElement>(null);
  const initials                = getInitials(name, email);
  const displayName             = getDisplayName(name, email);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function openModal(m: ModalType) {
    setOpen(false);
    setModal(m);
  }

  const menuItems = [
    {
      id: "add-account" as ModalType,
      label: "Add account",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="6.5" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1 13c0-2.485 2.462-4.5 5.5-4.5M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: "settings" as ModalType,
      label: "Settings",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: "logout" as ModalType,
      label: "Log out",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M10.5 5V3.5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V11"
            stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M7 8h7m0 0-2-2m2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  return (
    <>
      <div ref={ref} className="relative">
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/10"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white leading-tight">{displayName}</p>
            <p className="truncate text-xs text-white/60 leading-tight">{email ?? ""}</p>
          </div>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={`shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown — opens downward */}
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 overflow-hidden rounded-lg border border-white/10 bg-white shadow-subtle animate-fade">
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-hairline px-3 py-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: "#b8694e" }}>
                {initials}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                <p className="truncate text-xs text-ink-muted">{email}</p>
              </div>
            </div>

            {/* Items */}
            <div className="py-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openModal(item.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-body transition-colors hover:bg-surface-soft"
                >
                  <span className="text-ink-muted">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "add-account" && <AddAccountModal onClose={() => setModal(null)} />}
      {modal === "settings"    && <SettingsModal   onClose={() => setModal(null)} />}
      {modal === "logout"      && (
        <LogoutModal
          onClose={() => setModal(null)}
          name={name}
          email={email}
          initials={initials}
        />
      )}
    </>
  );
}
