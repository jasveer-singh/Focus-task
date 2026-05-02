"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";

type Theme = "light" | "dark" | "system";

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function getDisplayName(name?: string | null, email?: string | null): string {
  if (name) return name;
  if (email) return email.split("@")[0];
  return "Account";
}

export default function ProfileDropdown({
  name,
  email
}: {
  name?: string | null;
  email?: string | null;
}) {
  const [open, setOpen]           = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [theme, setTheme]         = useState<Theme>("system");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setThemeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials    = getInitials(name, email);
  const displayName = getDisplayName(name, email);

  function handleTheme(t: Theme) {
    setTheme(t);
    setThemeOpen(false);
    // Persist to localStorage for future use
    localStorage.setItem("focus-theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }

  const themeLabels: Record<Theme, string> = {
    light:  "Light",
    dark:   "Dark",
    system: "System"
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger — click the user row */}
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setThemeOpen(false); }}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-white/10"
      >
        {/* Avatar */}
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white leading-tight">{displayName}</p>
          <p className="truncate text-xs text-white/60 leading-tight">{email ?? ""}</p>
        </div>
        {/* Chevron */}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`shrink-0 text-white/50 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-1 z-50 overflow-hidden rounded-lg border border-white/10 bg-white shadow-subtle animate-fade">
          {/* User header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-hairline">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
              style={{ backgroundColor: "#b8694e" }}>
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
              <p className="truncate text-xs text-ink-muted">{email ?? ""}</p>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-body transition-colors hover:bg-surface-soft"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5.5" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M2.5 13c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Profile
            </button>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-body transition-colors hover:bg-surface-soft"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1.5A6.5 6.5 0 1 0 14.5 8 6.507 6.507 0 0 0 8 1.5ZM8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z" stroke="currentColor" strokeWidth="1.3"/>
              </svg>
              Account settings
            </button>

            {/* Theme — with nested flyout */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setThemeOpen((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-body transition-colors hover:bg-surface-soft"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.3"/>
                  <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.05 3.05l1.06 1.06M11.89 11.89l1.06 1.06M3.05 12.95l1.06-1.06M11.89 4.11l1.06-1.06"
                    stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                <span className="flex-1 text-left">Theme</span>
                <span className="text-xs text-ink-soft mr-1">{themeLabels[theme]}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="text-ink-soft">
                  <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              {themeOpen && (
                <div className="absolute right-full top-0 mr-1 w-36 rounded-lg border border-hairline bg-white shadow-subtle animate-fade">
                  {(["light", "dark", "system"] as Theme[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleTheme(t)}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-surface-soft ${
                        theme === t ? "text-coral font-medium" : "text-ink-body"
                      }`}
                    >
                      {themeLabels[t]}
                      {theme === t && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-hairline py-1">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/signin" })}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-body transition-colors hover:bg-surface-soft"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10.5 5V3.5a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2V11"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M7 8h7m0 0-2-2m2 2-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
