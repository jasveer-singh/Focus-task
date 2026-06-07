"use client";

import { useEffect, useMemo, useState } from "react";
import { useTasksAndProjects } from "@/hooks/useTasksAndProjects";
import TaskDrawer, { type DrawerSection } from "@/components/TaskDrawer";
import type { Task } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type Section = "critical" | "important" | "light";

type DayPlan = {
  date: string; // "YYYY-MM-DD"
  critical: string[];
  important: string[];
  light: string[];
};

const SECTION_META: Record<Section, { label: string; subtitle: string; color: string }> = {
  critical:  { label: "Critical",     subtitle: "The work that moves the day", color: "text-coral"      },
  important: { label: "Important",    subtitle: "Keep the momentum going",      color: "text-coral"      },
  light:     { label: "Light lifts",  subtitle: "Quick wins and follow-ups",    color: "text-ink-muted"  },
};

// ── localStorage helpers ───────────────────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function loadPlan(): DayPlan {
  try {
    const raw = localStorage.getItem("suru-today-plan");
    if (!raw) return { date: todayKey(), critical: [], important: [], light: [] };
    const parsed = JSON.parse(raw) as DayPlan;
    // Reset if it's a new day
    if (parsed.date !== todayKey()) return { date: todayKey(), critical: [], important: [], light: [] };
    return parsed;
  } catch {
    return { date: todayKey(), critical: [], important: [], light: [] };
  }
}

function savePlan(plan: DayPlan) {
  localStorage.setItem("suru-today-plan", JSON.stringify(plan));
}

// ── Add task modal ─────────────────────────────────────────────────────────────

function AddToSectionModal({
  section,
  availableTasks,
  onAdd,
  onClose,
}: {
  section: Section;
  availableTasks: Task[];
  onAdd: (taskId: string) => void;
  onClose: () => void;
}) {
  const meta = SECTION_META[section];
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(20,20,19,0.45)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-hairline bg-canvas animate-fade">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-normal text-ink">Add to {meta.label}</h2>
            <p className="text-xs text-ink-soft">{meta.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {availableTasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-soft">No tasks to add — all are already planned or you have none yet.</p>
          ) : (
            [...availableTasks]
              .sort((a, b) => {
                // Due today first, then overdue, then by created date
                const todayMs = new Date().setHours(0,0,0,0);
                const tomorrowMs = todayMs + 86400000;
                const aScore = a.dueAt && new Date(a.dueAt).getTime() < tomorrowMs ? 0 : 1;
                const bScore = b.dueAt && new Date(b.dueAt).getTime() < tomorrowMs ? 0 : 1;
                if (aScore !== bScore) return aScore - bScore;
                return b.createdAt - a.createdAt;
              })
              .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { onAdd(t.id); onClose(); }}
                className="w-full rounded-lg border border-hairline bg-canvas px-4 py-3 text-left transition hover:border-coral hover:bg-coral/5"
              >
                <p className="text-sm font-medium text-ink">{t.title}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  {t.dueAt && <span className="text-xs text-ink-soft">{new Date(t.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                  {t.notes && <span className="text-xs text-ink-muted line-clamp-1 truncate max-w-[220px]">{t.notes}</span>}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create task modal ──────────────────────────────────────────────────────────

function CreateTaskModal({
  onSave,
  onClose,
}: {
  onSave: (title: string, notes: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(20,20,19,0.45)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl border border-hairline bg-canvas animate-fade">
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="font-display text-lg font-normal text-ink">New task for today</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
        <form className="flex flex-col gap-4 px-6 py-5" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onSave(title.trim(), notes.trim()); onClose(); } }}>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-coral" />
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" rows={3} className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-coral resize-none" />
          <div className="flex justify-end gap-2 border-t border-hairline pt-4">
            <button type="button" onClick={onClose} className="rounded-md border border-hairline px-4 py-2 text-xs font-medium text-ink-muted hover:border-coral hover:text-coral">Cancel</button>
            <button type="submit" className="rounded-md bg-coral px-4 py-2 text-xs font-medium text-white hover:bg-coral-active">Add task</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Section components ─────────────────────────────────────────────────────────

function CriticalSection({ tasks, onToggle, onAddClick, onTaskClick }: { tasks: Task[]; onToggle: (id: string) => void; onAddClick: () => void; onTaskClick: (task: Task) => void }) {
  const done = tasks.filter((t) => t.completed).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-coral" />
        <span className="font-display text-lg font-normal text-ink">Critical</span>
        <span className="text-sm text-ink-soft">· The work that moves the day</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-ink-soft">{done}/{tasks.length}</span>
          <button type="button" onClick={onAddClick} className="flex h-5 w-5 items-center justify-center rounded-full border border-hairline text-ink-soft hover:border-coral hover:text-coral transition">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
      <div className="h-px bg-coral/40" />
      {tasks.length === 0 ? (
        <button type="button" onClick={onAddClick} className="rounded-xl border border-dashed border-coral/30 p-6 text-center text-sm text-ink-soft hover:border-coral/60 transition">
          Add your most important work here
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-xl border p-5 transition cursor-pointer ${task.completed ? "border-hairline opacity-50" : "border-coral/20 bg-coral/5 hover:border-coral/40"}`}
              onClick={() => onTaskClick(task)}
            >
              <div className="flex items-start gap-3">
                <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 transition ${task.completed ? "border-coral bg-coral" : "border-coral/40 hover:border-coral"}`} />
                <div>
                  <p className={`font-display text-lg font-normal leading-snug text-ink ${task.completed ? "line-through text-ink-soft" : ""}`}>{task.title}</p>
                  {task.notes && <p className="mt-1 text-sm text-ink-muted leading-relaxed">{task.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ImportantSection({ tasks, onToggle, onAddClick, onTaskClick }: { tasks: Task[]; onToggle: (id: string) => void; onAddClick: () => void; onTaskClick: (task: Task) => void }) {
  const done = tasks.filter((t) => t.completed).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-coral" />
        <span className="text-xs font-semibold uppercase tracking-[1.5px] text-ink">Important</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-ink-soft">{done}/{tasks.length}</span>
          <button type="button" onClick={onAddClick} className="flex h-5 w-5 items-center justify-center rounded-full border border-hairline text-ink-soft hover:border-coral hover:text-coral transition">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
      {tasks.length === 0 ? (
        <button type="button" onClick={onAddClick} className="rounded-xl border border-dashed border-hairline p-4 text-center text-sm text-ink-soft hover:border-coral/40 transition">
          Add tasks to keep momentum going
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-xl border bg-canvas p-4 transition cursor-pointer ${task.completed ? "opacity-50 border-hairline" : "border-hairline hover:border-coral/40"}`}
              onClick={() => onTaskClick(task)}
            >
              <div className="flex items-start gap-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border transition ${task.completed ? "border-coral bg-coral" : "border-hairline hover:border-coral"}`} />
                <div>
                  <p className={`text-sm font-medium text-ink leading-snug ${task.completed ? "line-through text-ink-soft" : ""}`}>{task.title}</p>
                  {task.notes && <p className="mt-0.5 text-xs text-ink-soft line-clamp-1">{task.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LightSection({ tasks, onToggle, onAddClick, onTaskClick }: { tasks: Task[]; onToggle: (id: string) => void; onAddClick: () => void; onTaskClick: (task: Task) => void }) {
  const done = tasks.filter((t) => t.completed).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-ink-soft" />
        <span className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">Light lifts</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-ink-soft">{done}/{tasks.length}</span>
          <button type="button" onClick={onAddClick} className="flex h-5 w-5 items-center justify-center rounded-full border border-hairline text-ink-soft hover:border-coral hover:text-coral transition">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>
      {tasks.length === 0 ? (
        <button type="button" onClick={onAddClick} className="rounded-xl border border-dashed border-hairline p-4 text-center text-sm text-ink-soft hover:border-coral/40 transition">
          Add quick wins and follow-ups
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-xl border bg-surface-card p-3 transition cursor-pointer ${task.completed ? "opacity-40 border-hairline" : "border-hairline hover:border-coral/40"}`}
              onClick={() => onTaskClick(task)}
            >
              <div className="flex items-start gap-2">
                <button type="button" onClick={(e) => { e.stopPropagation(); onToggle(task.id); }} className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border transition ${task.completed ? "border-coral bg-coral" : "border-hairline hover:border-coral"}`} />
                <p className={`text-xs font-medium text-ink leading-snug ${task.completed ? "line-through text-ink-soft" : ""}`}>{task.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function TodayApp() {
  const { tasks, loading, updateTask, deleteTask, createTask } = useTasksAndProjects();
  const [plan, setPlan] = useState<DayPlan>(() => loadPlan());
  const [addingToSection, setAddingToSection] = useState<Section | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drawerTask, setDrawerTask] = useState<{ task: Task; section: DrawerSection } | null>(null);

  // Persist plan whenever it changes
  useEffect(() => { savePlan(plan); }, [plan]);

  const today = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }), []);

  // Tasks in each section (resolved from IDs)
  const taskMap = useMemo(() => Object.fromEntries(tasks.map((t) => [t.id, t])), [tasks]);
  const criticalTasks  = plan.critical.map((id) => taskMap[id]).filter(Boolean) as Task[];
  const importantTasks = plan.important.map((id) => taskMap[id]).filter(Boolean) as Task[];
  const lightTasks     = plan.light.map((id) => taskMap[id]).filter(Boolean) as Task[];

  const plannedIds = new Set([...plan.critical, ...plan.important, ...plan.light]);
  const allPlanned = criticalTasks.length + importantTasks.length + lightTasks.length;
  const allDone    = [...criticalTasks, ...importantTasks, ...lightTasks].filter((t) => t.completed).length;
  const pct        = allPlanned > 0 ? Math.round((allDone / allPlanned) * 100) : 0;

  // Tasks available to add (not yet in any section)
  // All tasks not already in today's plan — no due-date filter
  const availableForSection = tasks.filter((t) => !plannedIds.has(t.id) && !t.completed);

  function addToSection(section: Section, taskId: string) {
    setPlan((prev) => ({ ...prev, [section]: [...prev[section], taskId] }));
  }

  function toggleTask(id: string) {
    const task = taskMap[id];
    if (!task) return;
    updateTask(id, { completed: !task.completed });
  }

  async function handleCreateTask(title: string, notes: string) {
    const today = new Date();
    today.setHours(23, 59, 0, 0);
    const task = await createTask({ title, notes, dueAt: today.toISOString() });
    // Auto-add to critical if empty, otherwise leave unassigned
    if (plan.critical.length === 0) {
      setPlan((prev) => ({ ...prev, critical: [...prev.critical, task.id] }));
    } else if (plan.important.length === 0) {
      setPlan((prev) => ({ ...prev, important: [...prev.important, task.id] }));
    } else {
      setPlan((prev) => ({ ...prev, light: [...prev.light, task.id] }));
    }
  }

  function reset() {
    const empty = { date: todayKey(), critical: [], important: [], light: [] };
    setPlan(empty);
    savePlan(empty);
  }

  if (loading) {
    return (
      <section className="flex w-full flex-col px-8 py-10 lg:px-10">
        <div className="flex items-center justify-center py-20 text-sm text-ink-soft">Loading…</div>
      </section>
    );
  }

  const isEmpty = allPlanned === 0;

  return (
    <>
      {/* Task drawer */}
      {drawerTask && (
        <TaskDrawer
          task={drawerTask.task}
          section={drawerTask.section}
          onClose={() => setDrawerTask(null)}
          onUpdate={(patch) => {
            updateTask(drawerTask.task.id, patch);
          }}
          onDelete={() => {
            deleteTask(drawerTask.task.id);
            setPlan((prev) => ({
              ...prev,
              critical:  prev.critical.filter((id) => id !== drawerTask.task.id),
              important: prev.important.filter((id) => id !== drawerTask.task.id),
              light:     prev.light.filter((id) => id !== drawerTask.task.id),
            }));
            setDrawerTask(null);
          }}
        />
      )}

      {/* Modals */}
      {addingToSection && (
        <AddToSectionModal
          section={addingToSection}
          availableTasks={availableForSection}
          onAdd={(id) => addToSection(addingToSection, id)}
          onClose={() => setAddingToSection(null)}
        />
      )}
      {showCreateModal && (
        <CreateTaskModal
          onSave={handleCreateTask}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      <section className="flex w-full flex-col gap-8 px-8 py-10 lg:px-10">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-6">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="font-display text-4xl font-normal tracking-[-1px] text-ink">Today</h1>
            <span className="text-sm text-ink-soft">{today}</span>
            {allPlanned > 0 && (
              <>
                <span className="text-sm text-ink-soft">{allDone} of {allPlanned} done</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-card">
                    <div className="h-full rounded-full bg-coral transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium text-coral">{pct}%</span>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-full bg-coral px-5 py-2 text-sm font-medium text-white transition hover:bg-coral-active"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            New task
          </button>
        </header>

        {/* Empty state */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center gap-6 py-24 text-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 2v28M2 16h28M6.34 6.34l19.32 19.32M25.66 6.34 6.34 25.66" stroke="#cc785c" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <h2 className="font-display text-3xl font-normal text-ink">Nothing planned yet.</h2>
              <p className="mt-2 max-w-sm text-sm text-ink-muted leading-relaxed">
                Add your first task for today. Sort it into{" "}
                <span className="text-coral font-medium">Critical</span>,{" "}
                <span className="text-coral font-medium">Important</span>, or{" "}
                Light lifts as you go.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              {/* Primary — move existing tasks */}
              <button
                type="button"
                onClick={() => setAddingToSection("critical")}
                className="flex items-center gap-2 rounded-full bg-coral px-6 py-3 text-sm font-medium text-white transition hover:bg-coral-active"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M2 7l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Plan from existing tasks
              </button>
              {/* Secondary — create new */}
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="rounded-full border border-hairline px-5 py-2.5 text-sm text-ink-muted transition hover:border-coral hover:text-coral"
              >
                + Create new task
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            <CriticalSection  tasks={criticalTasks}  onToggle={toggleTask} onAddClick={() => setAddingToSection("critical")}  onTaskClick={(t) => setDrawerTask({ task: t, section: "critical" })}  />
            <ImportantSection tasks={importantTasks} onToggle={toggleTask} onAddClick={() => setAddingToSection("important")} onTaskClick={(t) => setDrawerTask({ task: t, section: "important" })} />
            <LightSection     tasks={lightTasks}     onToggle={toggleTask} onAddClick={() => setAddingToSection("light")}     onTaskClick={(t) => setDrawerTask({ task: t, section: "light" })}     />

            <div className="border-t border-hairline pt-4">
              <button type="button" onClick={reset} className="rounded-full border border-hairline px-4 py-1.5 text-xs text-ink-soft transition hover:border-coral hover:text-coral">
                Reset to empty
              </button>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
