"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { signOut } from "next-auth/react";
import {
  REMINDER_WINDOW_OPTIONS,
  getReminderWindows,
  registerServiceWorker,
  setReminderWindows,
  subscribeToPush,
  unsubscribeFromPush
} from "@/lib/notifications";
import { useAccounts } from "@/context/AccountContext";
import { TYPE_META, initials as getInitials } from "@/lib/accounts";
import type { AccountType } from "@/lib/accounts";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// ─── helpers ───────────────────────────────────────────────────────────────

function getDisplayName(name?: string | null, email?: string | null) {
  return name ?? email?.split("@")[0] ?? "Account";
}

// ─── Modal shell ───────────────────────────────────────────────────────────

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(20,20,19,0.55)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="animate-fade w-full max-w-md rounded-xl border border-hairline bg-white shadow-lg flex flex-col max-h-[90vh]">
        {children}
      </div>
    </div>,
    document.body
  );
}

// ─── Add account modal ─────────────────────────────────────────────────────

function AddAccountModal({ onClose }: { onClose: () => void }) {
  const { addAccount } = useAccounts();
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [type, setType]   = useState<AccountType>("personal");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    addAccount(email.trim(), name.trim(), type);
    onClose();
  }

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
      <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
        <p className="text-sm text-ink-muted leading-relaxed">
          Add another account to manage personal and professional work separately.
        </p>

        {/* Account type */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-muted">Account type</label>
          <div className="grid grid-cols-2 gap-2">
            {(["professional", "personal"] as AccountType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`rounded-md border py-2.5 text-sm font-medium capitalize transition ${
                  type === t
                    ? "border-coral bg-coral/10 text-coral"
                    : "border-hairline bg-canvas text-ink-muted hover:border-coral/50 hover:text-ink"
                }`}
              >
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-muted">Display name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Personal"
            className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-ink-muted">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-hairline pt-4">
          <button type="button" onClick={onClose}
            className="rounded-md border border-hairline px-4 py-2 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">
            Cancel
          </button>
          <button type="submit"
            className="rounded-md bg-coral px-4 py-2 text-xs font-medium text-white transition hover:bg-coral-active">
            Add account
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Accounts modal ─────────────────────────────────────────────────────────

function AccountsModal({ onClose, onAddNew }: { onClose: () => void; onAddNew: () => void }) {
  const { accounts, visibleIds, activeAccountId, setActiveAccountId, toggleVisibility, updateType, removeAccount } = useAccounts();

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
        <h2 className="font-display text-xl font-normal tracking-[-0.3px] text-ink">Accounts</h2>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft transition hover:text-ink">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div className="overflow-y-auto px-6 py-5 flex flex-col gap-3">
        <p className="text-xs text-ink-muted leading-relaxed">
          Professional accounts are shown by default. Toggle personal accounts on to see all items together.
        </p>

        {accounts.map((acct) => {
          const visible    = visibleIds.includes(acct.id);
          const isActive   = activeAccountId === acct.id;
          const meta       = TYPE_META[acct.type];
          const acctInit   = getInitials(acct.name, acct.email);

          return (
            <div key={acct.id}
              className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas p-3"
            >
              {/* Avatar */}
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: acct.color }}
              >
                {acctInit}
              </span>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-ink truncate">{acct.name}</p>
                  <span className={`rounded-pill px-1.5 py-0.5 text-[10px] font-medium ${meta.pill}`}>
                    {meta.label}
                  </span>
                  {isActive && (
                    <span className="rounded-pill bg-coral/10 px-1.5 py-0.5 text-[10px] font-medium text-coral">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted truncate">{acct.email}</p>

                {/* Type toggle */}
                <div className="mt-2 flex items-center gap-1">
                  {(["professional", "personal"] as AccountType[]).map((t) => (
                    <button key={t} type="button"
                      onClick={() => updateType(acct.id, t)}
                      className={`rounded px-2 py-0.5 text-[10px] font-medium transition ${
                        acct.type === t
                          ? "bg-coral/10 text-coral"
                          : "text-ink-soft hover:text-ink-muted"
                      }`}
                    >
                      {TYPE_META[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Visibility toggle */}
                <button
                  type="button"
                  onClick={() => toggleVisibility(acct.id)}
                  title={visible ? "Hide this account's items" : "Show this account's items"}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    visible ? "bg-coral" : "bg-hairline"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    visible ? "translate-x-4" : "translate-x-0.5"
                  }`} />
                </button>

                {/* Set as active */}
                {visible && !isActive && (
                  <button
                    type="button"
                    onClick={() => setActiveAccountId(acct.id)}
                    className="text-[10px] text-ink-soft hover:text-coral transition"
                  >
                    Set active
                  </button>
                )}

                {/* Remove (non-primary only) */}
                {!acct.isPrimary && (
                  <button
                    type="button"
                    onClick={() => removeAccount(acct.id)}
                    className="text-[10px] text-ink-soft hover:text-coral transition"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => { onClose(); onAddNew(); }}
          className="flex items-center gap-2 rounded-md border border-dashed border-hairline px-4 py-2.5 text-sm text-ink-muted transition hover:border-coral hover:text-coral"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Add another account
        </button>
      </div>

      <div className="border-t border-hairline px-6 py-4">
        <button type="button" onClick={onClose}
          className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active">
          Done
        </button>
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

  const [permission, setPermission]     = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscribed, setSubscribed]     = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [windows, setWindows]           = useState<number[]>([30]);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
    setWindows(getReminderWindows());
    navigator.serviceWorker?.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  async function enableNotifications() {
    setNotifLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
      const reg = await registerServiceWorker();
      if (!reg) return;
      const sub = await subscribeToPush(reg, VAPID_PUBLIC_KEY);
      if (!sub) return;
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } })
      });
      setSubscribed(true);
    } finally { setNotifLoading(false); }
  }

  async function disableNotifications() {
    setNotifLoading(true);
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await unsubscribeFromPush(reg);
      }
      setSubscribed(false);
    } finally { setNotifLoading(false); }
  }

  function toggleWindow(minutes: number) {
    const next = windows.includes(minutes) ? windows.filter((w) => w !== minutes) : [...windows, minutes];
    const safe = next.length === 0 ? [30] : next;
    setWindows(safe);
    setReminderWindows(safe);
    window.dispatchEvent(new Event("focus-reminder-windows-changed"));
  }

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
      <div className="overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Appearance */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[1.2px] text-ink-muted mb-3">Appearance</p>
          <div className="grid grid-cols-3 gap-2">
            {(["light", "dark", "system"] as Theme[]).map((t) => (
              <button key={t} type="button" onClick={() => applyTheme(t)}
                className={`rounded-md border py-2.5 text-sm font-medium capitalize transition ${
                  theme === t ? "border-coral bg-coral/10 text-coral" : "border-hairline bg-canvas text-ink-muted hover:border-coral/50 hover:text-ink"
                }`}>{t}</button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        {permission !== "unsupported" && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium uppercase tracking-[1.2px] text-ink-muted">Notifications</p>
              {subscribed && <span className="rounded-pill bg-coral/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-coral">Active</span>}
            </div>
            {permission === "denied" ? (
              <p className="text-sm text-ink-muted leading-relaxed">Notifications are blocked. Allow them in your browser settings.</p>
            ) : subscribed ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-ink-muted">Remind me before due time</p>
                <div className="flex flex-wrap gap-2">
                  {REMINDER_WINDOW_OPTIONS.map((opt) => (
                    <button key={opt.minutes} type="button" onClick={() => toggleWindow(opt.minutes)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                        windows.includes(opt.minutes) ? "border-coral bg-coral/10 text-coral" : "border-hairline bg-canvas text-ink-muted hover:border-coral/50 hover:text-ink"
                      }`}>{opt.label}</button>
                  ))}
                </div>
                <button type="button" onClick={disableNotifications} disabled={notifLoading}
                  className="self-start rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral disabled:opacity-50">
                  {notifLoading ? "Disabling…" : "Disable notifications"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-ink-muted leading-relaxed">Get push notifications when tasks are due.</p>
                <button type="button" onClick={enableNotifications} disabled={notifLoading}
                  className="self-start rounded-md bg-coral px-4 py-2 text-xs font-medium text-white transition hover:bg-coral-active disabled:opacity-50">
                  {notifLoading ? "Enabling…" : "Enable notifications"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="border-t border-hairline px-6 py-4">
        <button type="button" onClick={onClose}
          className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active">Done</button>
      </div>
    </Modal>
  );
}

// ─── Logout modal ──────────────────────────────────────────────────────────

function LogoutModal({ onClose, name, email, inits }: { onClose: () => void; name?: string | null; email?: string | null; inits: string }) {
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
        <div className="flex items-center gap-3 rounded-lg border border-hairline bg-surface-card px-4 py-3 mb-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ backgroundColor: "#b8694e" }}>{inits}</span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink">{getDisplayName(name, email)}</p>
            <p className="truncate text-xs text-ink-muted">{email}</p>
          </div>
        </div>
        <p className="text-sm text-ink-muted leading-relaxed">You will be signed out. Any unsaved changes will remain stored locally.</p>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-hairline px-6 py-4">
        <button type="button" onClick={onClose} className="rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink-muted transition hover:border-coral hover:text-coral">Cancel</button>
        <button type="button" onClick={() => signOut({ callbackUrl: "/signin" })} className="rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active">Log out</button>
      </div>
    </Modal>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

type ModalType = "add-account" | "accounts" | "settings" | "logout" | null;

export default function ProfileDropdown({ name, email }: { name?: string | null; email?: string | null }) {
  const [open, setOpen]   = useState(false);
  const [modal, setModal] = useState<ModalType>(null);
  const ref               = useRef<HTMLDivElement>(null);
  const { accounts, visibleIds } = useAccounts();

  const primaryAccount = accounts.find((a) => a.isPrimary);
  const inits          = getInitials(primaryAccount?.name ?? name, primaryAccount?.email ?? email);
  const displayName    = getDisplayName(primaryAccount?.name ?? name, primaryAccount?.email ?? email);
  const visibleCount   = visibleIds.length;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function openModal(m: ModalType) { setOpen(false); setModal(m); }

  const menuItems: Array<{ id: ModalType; label: string; icon: React.ReactNode; badge?: string }> = [
    {
      id: "accounts",
      label: "Accounts",
      badge: accounts.length > 1 ? `${visibleCount} active` : undefined,
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M1 13c0-2.209 2.239-4 5-4s5 1.791 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M14.5 12.5c0-1.657-1.12-3-2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: "settings",
      label: "Settings",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      )
    },
    {
      id: "logout",
      label: "Log out",
      icon: (
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
          <path d="M10.5 5V3.5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <path d="M7 8h7m0 0-2-2m2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    }
  ];

  return (
    <>
      <div ref={ref}>
        {/* Trigger */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/10"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/25 text-xs font-semibold text-white">
            {inits}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white leading-tight">{displayName}</p>
            <p className="truncate text-xs text-white/60 leading-tight">
              {accounts.length > 1
                ? `${visibleCount} of ${accounts.length} accounts active`
                : (primaryAccount?.email ?? email ?? "")}
            </p>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
            className={`shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}>
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="mt-1 overflow-hidden rounded-lg border border-white/10 bg-white animate-fade">
            {/* Header — shows all accounts */}
            <div className="border-b border-hairline px-3 py-3 flex flex-col gap-2">
              {accounts.map((acct) => {
                const visible = visibleIds.includes(acct.id);
                const meta    = TYPE_META[acct.type];
                const ai      = getInitials(acct.name, acct.email);
                return (
                  <div key={acct.id} className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ backgroundColor: acct.color }}>
                      {ai}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-ink truncate">{acct.name}</p>
                        <span className={`rounded-pill px-1.5 py-0.5 text-[9px] font-medium ${meta.pill}`}>{meta.label}</span>
                      </div>
                      <p className="text-[10px] text-ink-muted truncate">{acct.email}</p>
                    </div>
                    {/* Visibility dot */}
                    <span className={`h-2 w-2 rounded-full shrink-0 ${visible ? "bg-coral" : "bg-hairline"}`} title={visible ? "Visible" : "Hidden"} />
                  </div>
                );
              })}
            </div>

            {/* Menu items */}
            <div className="py-1">
              {menuItems.map((item) => (
                <button key={item.id} type="button" onClick={() => openModal(item.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-body transition-colors hover:bg-surface-soft">
                  <span className="text-ink-muted">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-pill bg-coral/10 px-2 py-0.5 text-[10px] font-medium text-coral">{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal === "add-account" && <AddAccountModal onClose={() => setModal(null)} />}
      {modal === "accounts"    && <AccountsModal   onClose={() => setModal(null)} onAddNew={() => setModal("add-account")} />}
      {modal === "settings"    && <SettingsModal   onClose={() => setModal(null)} />}
      {modal === "logout"      && <LogoutModal     onClose={() => setModal(null)} name={name} email={email} inits={inits} />}
    </>
  );
}
