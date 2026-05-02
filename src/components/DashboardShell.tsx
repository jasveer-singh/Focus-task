"use client";

import { useMemo, useState } from "react";

import CalendarSyncPanel from "@/components/CalendarSyncPanel";
import NotificationSetup from "@/components/NotificationSetup";
import ProductivityLayer from "@/components/ProductivityLayer";
import ProfileDropdown from "@/components/ProfileDropdown";
import TaskApp from "@/components/TaskApp";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";

type ModuleKey = "tasks" | "reminders" | "feedback" | "ideas" | "calendar";

const MODULES: Array<{ key: ModuleKey; label: string; description: string }> = [
  { key: "tasks",     label: "Tasks",     description: "Task capture and execution" },
  { key: "reminders", label: "Reminders", description: "Due queue and follow-ups"   },
  { key: "feedback",  label: "Feedback",  description: "Captured product feedback"  },
  { key: "ideas",     label: "Ideas",     description: "Inbox for notes and thoughts"},
  { key: "calendar",  label: "Calendar",  description: "Google Calendar sync"       }
];

export default function DashboardShell({ email, name }: { email?: string | null; name?: string | null }) {
  const [activeModule, setActiveModule] = useState<ModuleKey>("tasks");
  useNotificationScheduler();

  const activeMeta = useMemo(
    () => MODULES.find((m) => m.key === activeModule) ?? MODULES[0],
    [activeModule]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] min-h-screen gap-0 px-0">

      {/* ── Sidebar (coral CTA shade) ────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col lg:flex"
        style={{ backgroundColor: "#b8694e" }}>
        {/* Brand */}
        <div className="px-4 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M9 0v18M0 9h18M2.636 2.636l12.728 12.728M15.364 2.636 2.636 15.364"
                stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="font-display text-base font-normal text-white">Focus Tasks</span>
          </div>
          {/* Profile dropdown trigger */}
          <ProfileDropdown name={name} email={email} />
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
          {MODULES.map((mod) => {
            const active = mod.key === activeModule;
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => setActiveModule(mod.key)}
                className={`w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <p className="text-sm font-medium leading-none">{mod.label}</p>
                <p className="mt-1 text-xs text-white/50 leading-none">{mod.description}</p>
              </button>
            );
          })}
        </nav>

        {/* Notifications */}
        <div className="px-3 pb-6">
          <NotificationSetup />
        </div>
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 lg:hidden" style={{ backgroundColor: "#b8694e" }}>
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path d="M9 0v18M0 9h18M2.636 2.636l12.728 12.728M15.364 2.636 2.636 15.364"
            stroke="#cc785c" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="font-display text-base text-on-dark">Focus Tasks</span>
        <div className="ml-auto flex gap-1 overflow-x-auto">
          {MODULES.map((mod) => {
            const active = mod.key === activeModule;
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => setActiveModule(mod.key)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-surface-dark-elevated text-on-dark"
                    : "text-on-dark-soft"
                }`}
              >
                {mod.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content (cream canvas) ───────────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-canvas pt-12 lg:pt-0">
        {/* Section header */}
        <div className="border-b border-hairline px-8 py-5 lg:px-10">
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">
            {activeMeta.label}
          </p>
          <h2 className="mt-1 font-display text-2xl font-normal tracking-[-0.3px] text-ink">
            {activeMeta.description}
          </h2>
        </div>

        {activeModule === "tasks"     ? <TaskApp /> : null}
        {activeModule === "calendar"  ? <CalendarSyncPanel /> : null}
        {activeModule === "reminders" ? <ProductivityLayer activeModule="reminders" /> : null}
        {activeModule === "feedback"  ? <ProductivityLayer activeModule="feedback"  /> : null}
        {activeModule === "ideas"     ? <ProductivityLayer activeModule="ideas"     /> : null}
      </main>
    </div>
  );
}
