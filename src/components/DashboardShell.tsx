"use client";

import { useMemo, useState } from "react";

import CalendarSyncPanel from "@/components/CalendarSyncPanel";
import ProductivityLayer from "@/components/ProductivityLayer";
import TaskApp from "@/components/TaskApp";

type ModuleKey = "tasks" | "reminders" | "feedback" | "ideas" | "calendar";

const MODULES: Array<{ key: ModuleKey; label: string; description: string }> = [
  { key: "tasks", label: "Tasks", description: "Task capture and execution" },
  { key: "reminders", label: "Reminders", description: "Due queue and follow-ups" },
  { key: "feedback", label: "Feedback", description: "Captured product feedback" },
  { key: "ideas", label: "Ideas", description: "Inbox for notes and thoughts" },
  { key: "calendar", label: "Calendar", description: "Google Calendar sync" }
];

export default function DashboardShell({ email }: { email: string | null | undefined }) {
  const [activeModule, setActiveModule] = useState<ModuleKey>("tasks");

  const activeMeta = useMemo(
    () => MODULES.find((module) => module.key === activeModule) ?? MODULES[0],
    [activeModule]
  );

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-6 px-6 pb-12 md:px-8">
      <aside className="sticky top-6 hidden h-[calc(100vh-3rem)] w-64 shrink-0 rounded-3xl bg-white p-4 shadow-card lg:flex lg:flex-col">
        <div className="border-b border-mist-200 px-2 pb-4">
          <p className="text-sm uppercase tracking-[0.3em] text-ink-300">Workspace</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-ink-900">Focus Tasks</h1>
          <p className="mt-2 text-xs text-ink-500">{email || "Signed in"}</p>
        </div>

        <nav className="mt-4 flex flex-1 flex-col gap-2">
          {MODULES.map((module) => {
            const selected = module.key === activeModule;
            return (
              <button
                key={module.key}
                type="button"
                onClick={() => setActiveModule(module.key)}
                className={`rounded-2xl px-4 py-3 text-left transition ${
                  selected
                    ? "bg-accent-500 text-white shadow-glow"
                    : "bg-mist-50 text-ink-600 hover:bg-mist-100"
                }`}
              >
                <p className="text-sm font-semibold">{module.label}</p>
                <p className={`mt-1 text-xs ${selected ? "text-white/80" : "text-ink-400"}`}>
                  {module.description}
                </p>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="rounded-3xl bg-white px-5 py-4 shadow-card lg:hidden">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MODULES.map((module) => {
              const selected = module.key === activeModule;
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => setActiveModule(module.key)}
                  className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                    selected
                      ? "bg-accent-500 text-white"
                      : "border border-mist-200 bg-white text-ink-500"
                  }`}
                >
                  {module.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-white px-5 py-4 shadow-card">
          <p className="text-sm uppercase tracking-[0.3em] text-ink-300">{activeMeta.label}</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-ink-900">
            {activeMeta.description}
          </h2>
        </div>

        {activeModule === "tasks" ? <TaskApp /> : null}
        {activeModule === "calendar" ? <CalendarSyncPanel /> : null}
        {activeModule === "reminders" ? <ProductivityLayer activeModule="reminders" /> : null}
        {activeModule === "feedback" ? <ProductivityLayer activeModule="feedback" /> : null}
        {activeModule === "ideas" ? <ProductivityLayer activeModule="ideas" /> : null}
      </div>
    </div>
  );
}
