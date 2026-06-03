"use client";

import { useMemo, useState } from "react";

import CalendarSyncPanel from "@/components/CalendarSyncPanel";
import ProductivityLayer from "@/components/ProductivityLayer";
import ProfileDropdown from "@/components/ProfileDropdown";
import ProjectsApp from "@/components/ProjectsApp";
import TaskApp from "@/components/TaskApp";
import { AccountProvider, useAccounts } from "@/context/AccountContext";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";
import { TYPE_META } from "@/lib/accounts";

type ModuleKey = "reminders" | "tasks" | "projects" | "agents" | "ideas" | "feedback" | "calendar";

const MODULES: Array<{ key: ModuleKey; label: string; description: string; dividerAfter?: boolean }> = [
  { key: "reminders", label: "Reminders", description: "Due queue and follow-ups"     },
  { key: "tasks",     label: "Tasks",     description: "Task capture and execution"   },
  { key: "projects",  label: "Projects",  description: "Track work across milestones", dividerAfter: true },
  { key: "agents",    label: "Agents",    description: "Automated background workers", dividerAfter: true },
  { key: "ideas",     label: "Ideas",     description: "Inbox for notes and thoughts"  },
  { key: "feedback",  label: "Feedback",  description: "Captured product feedback",    dividerAfter: true },
  { key: "calendar",  label: "Calendar",  description: "Google Calendar sync"          },
];

function ComingSoon({ label, description }: { label: string; description: string }) {
  return (
    <section className="flex w-full flex-col items-center justify-center px-8 py-32 lg:px-10">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-hairline">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v6l3.5 3.5" stroke="#cc785c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="10" cy="10" r="8.5" stroke="#cc785c" strokeWidth="1.5"/>
          </svg>
        </div>
        <h2 className="font-display text-2xl font-normal tracking-[-0.3px] text-ink">{label}</h2>
        <p className="text-sm text-ink-muted leading-relaxed">{description}</p>
        <span className="rounded-pill border border-dashed border-coral/40 px-3 py-1 text-xs font-medium text-coral/70">
          Coming soon
        </span>
      </div>
    </section>
  );
}

// ── Active account pills shown below the sidebar nav ─────────────────────────

function AccountPills() {
  const { accounts, visibleIds } = useAccounts();
  if (accounts.length <= 1) return null;

  return (
    <div className="px-3 pb-3 flex flex-wrap gap-1.5">
      {accounts.map((acct) => {
        const visible = visibleIds.includes(acct.id);
        const meta = TYPE_META[acct.type];
        return (
          <span
            key={acct.id}
            className={`flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-medium transition ${
              visible ? "bg-white/20 text-white" : "bg-white/5 text-white/30"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${visible ? "bg-white" : "bg-white/30"}`} />
            {acct.name.split(" ")[0]} · {meta.label}
          </span>
        );
      })}
    </div>
  );
}

// ── Inner shell (needs AccountContext) ────────────────────────────────────────

function Shell({ email, name }: { email?: string | null; name?: string | null }) {
  const [activeModule, setActiveModule] = useState<ModuleKey>("reminders");
  const { visibleIds, activeAccountId } = useAccounts();
  useNotificationScheduler();

  const activeMeta = useMemo(
    () => MODULES.find((m) => m.key === activeModule) ?? MODULES[0],
    [activeModule]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] min-h-screen gap-0 px-0">

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col lg:flex"
        style={{ backgroundColor: "#b8694e" }}>

        {/* Brand */}
        <div className="px-4 pt-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M9 0v18M0 9h18M2.636 2.636l12.728 12.728M15.364 2.636 2.636 15.364"
                stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="font-display text-base font-normal text-white">Suru</span>
          </div>
          <ProfileDropdown name={name} email={email} />
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4 overflow-y-auto">
          {MODULES.map((mod) => {
            const active = mod.key === activeModule;
            return (
              <div key={mod.key}>
                <div className="group relative">
                  <button
                    type="button"
                    onClick={() => setActiveModule(mod.key)}
                    className={`w-full rounded-md px-3 py-2.5 text-left transition-colors pr-8 ${
                      active
                        ? "bg-white/20 text-white"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <p className="text-sm font-medium leading-none">{mod.label}</p>
                    <p className="mt-1 text-xs text-white/50 leading-none">{mod.description}</p>
                  </button>
                  <button
                    type="button"
                    aria-label={`New item in ${mod.label}`}
                    onClick={() => {
                      setActiveModule(mod.key);
                      setTimeout(() => window.dispatchEvent(new Event("focus-new-task")), 50);
                    }}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/20"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M5 1v8M1 5h8" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </button>
                </div>
                {mod.dividerAfter && <div className="my-2 mx-1 border-t border-white/10" />}
              </div>
            );
          })}
        </nav>

        {/* Active account pills */}
        <AccountPills />
      </aside>

      {/* ── Mobile top bar ────────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3 lg:hidden" style={{ backgroundColor: "#b8694e" }}>
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
          <path d="M9 0v18M0 9h18M2.636 2.636l12.728 12.728M15.364 2.636 2.636 15.364"
            stroke="#cc785c" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="font-display text-base text-on-dark">Suru</span>
        <div className="ml-auto flex gap-1 overflow-x-auto">
          {MODULES.map((mod) => {
            const active = mod.key === activeModule;
            return (
              <button
                key={mod.key}
                type="button"
                onClick={() => setActiveModule(mod.key)}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  active ? "bg-surface-dark-elevated text-on-dark" : "text-on-dark-soft"
                }`}
              >
                {mod.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 bg-canvas pt-12 lg:pt-0">
        <div className="border-b border-hairline px-8 py-5 lg:px-10">
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">{activeMeta.label}</p>
          <h2 className="mt-1 font-display text-2xl font-normal tracking-[-0.3px] text-ink">{activeMeta.description}</h2>
        </div>

        {activeModule === "reminders" ? <ProductivityLayer activeModule="reminders" visibleAccountIds={visibleIds} activeAccountId={activeAccountId} /> : null}
        {activeModule === "tasks"     ? <TaskApp /> : null}
        {activeModule === "projects"  ? <ProjectsApp /> : null}
        {activeModule === "agents"    ? <ComingSoon label="Agents" description="Automated background workers that run tasks on your behalf. Coming soon." /> : null}
        {activeModule === "ideas"     ? <ProductivityLayer activeModule="ideas" visibleAccountIds={visibleIds} activeAccountId={activeAccountId} /> : null}
        {activeModule === "feedback"  ? <ProductivityLayer activeModule="feedback" visibleAccountIds={visibleIds} activeAccountId={activeAccountId} /> : null}
        {activeModule === "calendar"  ? <CalendarSyncPanel /> : null}
      </main>
    </div>
  );
}

// ── Export (wraps Shell in AccountProvider) ───────────────────────────────────

export default function DashboardShell({ email, name }: { email?: string | null; name?: string | null }) {
  return (
    <AccountProvider primaryEmail={email} primaryName={name}>
      <Shell email={email} name={name} />
    </AccountProvider>
  );
}
