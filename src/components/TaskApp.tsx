"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import MarkdownEditor from "@/components/MarkdownEditor";
import RenderedMarkdown from "@/components/RenderedMarkdown";
import { extractMarkdownUrls } from "@/lib/markdown";
import { cancelNotifications, getReminderWindows, scheduleNotifications } from "@/lib/notifications";
import { useTaskActions } from "@/hooks/useTaskActions";

type Task = {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  pinned: boolean;
  dueAt: string | null;
  createdAt: number;
};

const STORAGE_KEY = "focus-tasks-v1";

function buildId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `task_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function clampPreview(text: string, limit = 140) {
  const cleaned = text.trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit)}…`;
}

export default function TaskApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const ignoreNextStorageSyncRef = useRef(false);
  // taskId waiting for "pick new time" edit — set when app opens from a notification action
  const [pendingPickTimeId, setPendingPickTimeId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Handle notification action buttons: Done / Snooze 1hr / Pick new time
  useTaskActions((taskId) => {
    setPendingPickTimeId(taskId);
  });

  // Open create modal from sidebar "+" button
  useEffect(() => {
    const handler = () => setShowCreateModal(true);
    window.addEventListener("focus-new-task", handler);
    return () => window.removeEventListener("focus-new-task", handler);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Task[];
        setTasks(parsed);
      } catch {
        setTasks([]);
      }
    }
    setHasHydrated(true);
  }, []);

  // Once tasks load, open edit form if "pick new time" was requested from a notification
  useEffect(() => {
    if (!hasHydrated || !pendingPickTimeId) return;
    const task = tasks.find((t) => t.id === pendingPickTimeId);
    if (task) {
      startEdit(task);
      setPendingPickTimeId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, pendingPickTimeId]);

  useEffect(() => {
    function reloadFromStorage() {
      if (ignoreNextStorageSyncRef.current) {
        ignoreNextStorageSyncRef.current = false;
        return;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setTasks([]);
        return;
      }
      try {
        const parsed = JSON.parse(stored) as Task[];
        setTasks(parsed);
      } catch {
        setTasks([]);
      }
    }

    window.addEventListener("focus-tasks-updated", reloadFromStorage);
    return () => {
      window.removeEventListener("focus-tasks-updated", reloadFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    ignoreNextStorageSyncRef.current = true;
    window.dispatchEvent(new Event("focus-tasks-updated"));
  }, [hasHydrated, tasks]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
  }, [tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;

  function closeCreateModal() {
    setShowCreateModal(false);
    setTitle("");
    setNotes("");
    setDueAt("");
  }

  function addTask() {
    if (!title.trim()) return;
    const resolvedDueAt = dueAt ? new Date(dueAt).toISOString() : null;
    const newTask: Task = {
      id: buildId(),
      title: title.trim(),
      notes: notes.trim(),
      completed: false,
      pinned: false,
      dueAt: resolvedDueAt,
      createdAt: Date.now()
    };
    setTasks((prev) => [newTask, ...prev]);
    if (resolvedDueAt) {
      scheduleNotifications({
        sourceId: newTask.id,
        sourceType: "task",
        title: newTask.title,
        dueAt: resolvedDueAt,
        reminderWindows: getReminderWindows()
      });
    }
    closeCreateModal();
  }

  function toggleComplete(id: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function removeTask(id: string) {
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setExpanded((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    cancelNotifications(id);
  }

  function toggleNotes(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function togglePin(id: string) {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, pinned: !task.pinned } : task
      )
    );
  }

  function startEdit(task: Task) {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditNotes(task.notes);
    setEditDueAt(task.dueAt ? task.dueAt.slice(0, 16) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditNotes("");
    setEditDueAt("");
  }

  function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    const resolvedDueAt = editDueAt ? new Date(editDueAt).toISOString() : null;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, title: editTitle.trim(), notes: editNotes.trim(), dueAt: resolvedDueAt }
          : task
      )
    );
    // Cancel old notifications, then reschedule if there's a due date
    cancelNotifications(id).then(() => {
      if (resolvedDueAt) {
        scheduleNotifications({
          sourceId: id,
          sourceType: "task",
          title: editTitle.trim(),
          dueAt: resolvedDueAt,
          reminderWindows: getReminderWindows()
        });
      }
    });
    cancelEdit();
  }

  function formatDueLabel(value: string | null) {
    if (!value) return "No due date";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "No due date";
    return dt.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function isOverdue(value: string | null) {
    if (!value) return false;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return false;
    return dt.getTime() < Date.now();
  }

  function sectionFor(task: Task) {
    if (!task.dueAt) return "month";
    const now = new Date();
    const due = new Date(task.dueAt);
    if (Number.isNaN(due.getTime())) return "month";
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const startOfNextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    if (due >= startOfToday && due < startOfTomorrow) return "today";
    if (due >= startOfToday && due < startOfNextWeek) return "week";
    if (due >= startOfToday && due < startOfNextMonth) return "month";
    return "month";
  }

  const sectionedTasks = useMemo(() => {
    const base = sortedTasks;
    return {
      today: base.filter((task) => sectionFor(task) === "today"),
      week: base.filter((task) => sectionFor(task) === "week"),
      month: base.filter((task) => sectionFor(task) === "month")
    };
  }, [sortedTasks]);

  return (
    <>
    {/* ── Create task modal ──────────────────────────────────────── */}
    {showCreateModal && (
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ backgroundColor: "rgba(20,20,19,0.45)" }}
        onMouseDown={(e) => { if (e.target === e.currentTarget) closeCreateModal(); }}
      >
        <div className="animate-fade w-full max-w-lg rounded-xl border border-hairline bg-canvas">
          <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
            <h2 className="font-display text-xl font-normal tracking-[-0.3px] text-ink">New task</h2>
            <button type="button" onClick={closeCreateModal} className="rounded-md p-1 text-ink-soft transition hover:text-ink">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <form
            className="flex flex-col gap-4 px-6 py-5"
            onSubmit={(e) => { e.preventDefault(); addTask(); }}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-muted">Task title</label>
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Draft outreach email"
                className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft focus:border-coral"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-muted">Notes (optional)</label>
              <MarkdownEditor
                value={notes}
                onChange={setNotes}
                placeholder="Markdown supported…"
                minHeight={120}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-ink-muted">Due date & time</label>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-coral"
              />
            </div>
            <div className="flex items-center justify-between border-t border-hairline pt-4">
              <p className="text-xs text-ink-soft">Stored locally in your browser.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="rounded-md border border-hairline px-4 py-2 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-md bg-coral px-4 py-2 text-xs font-medium text-white transition hover:bg-coral-active"
                >
                  Add task
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

    <section className="flex w-full flex-col gap-8 px-8 py-10 lg:px-10">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-8">
        <div>
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">Your workspace</p>
          <h1 className="mt-2 font-display text-4xl font-normal tracking-[-1px] text-ink md:text-5xl">
            Work with clarity,<br />not clutter.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink-muted leading-relaxed">
            Capture tasks with structured notes. Notes stay tucked away until you choose to open them.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-pill border border-hairline bg-surface-card px-3 py-1.5 text-xs font-medium text-ink-muted">
            {completedCount} / {tasks.length} completed
          </span>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-dashed border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New task
          </button>
        </div>
      </header>

      {/* ── Task list ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">Created tasks</p>
          {sortedTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-hairline p-10 text-center text-sm text-ink-soft">
              No tasks yet. Add one to get started.
            </div>
          ) : (
            ([
              { key: "today", label: "Due today",      items: sectionedTasks.today },
              { key: "week",  label: "Due this week",  items: sectionedTasks.week  },
              { key: "month", label: "Due this month", items: sectionedTasks.month }
            ] as const).map((section) => (
              <div key={section.key} className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">
                    {section.label}
                  </h2>
                  <span className="text-xs text-ink-soft">{section.items.length} tasks</span>
                </div>
                {section.items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-hairline-soft p-5 text-center text-xs text-ink-soft">
                    Nothing here yet.
                  </div>
                ) : (
                  section.items.map((task, index) => {
                    const isOpen    = expanded[task.id];
                    const isEditing = editingId === task.id;
                    const preview   = clampPreview(task.notes);
                    const overdue   = isOverdue(task.dueAt);
                    return (
                      <article
                        key={task.id}
                        className={`animate-rise rounded-lg border bg-canvas p-5 transition ${
                          overdue ? "border-coral/30" : "border-hairline"
                        } ${task.completed ? "opacity-60" : ""}`}
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            {/* Complete toggle */}
                            <button
                              type="button"
                              aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                              onClick={() => toggleComplete(task.id)}
                              className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border transition ${
                                task.completed
                                  ? "border-coral bg-coral"
                                  : "border-hairline bg-canvas hover:border-coral"
                              }`}
                            />
                            <div className="min-w-0">
                              <h3 className={`text-sm font-medium text-ink leading-snug ${
                                task.completed ? "line-through text-ink-soft" : ""
                              }`}>
                                {task.title}
                              </h3>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-ink-soft">{formatDueLabel(task.dueAt)}</span>
                                {overdue && !task.completed ? (
                                  <span className="rounded-pill bg-coral/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-coral">
                                    Overdue
                                  </span>
                                ) : null}
                                {task.pinned ? (
                                  <span className="rounded-pill bg-surface-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-ink-muted">
                                    Pinned
                                  </span>
                                ) : null}
                              </div>
                              {task.notes ? (
                                <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">{preview}</p>
                              ) : (
                                <p className="mt-1.5 text-[10px] uppercase tracking-[1px] text-ink-soft">No notes</p>
                              )}
                            </div>
                          </div>
                          {/* Action buttons */}
                          <div className="flex shrink-0 items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => togglePin(task.id)}
                              className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
                            >
                              {task.pinned ? "Unpin" : "Pin"}
                            </button>
                            <button
                              type="button"
                              onClick={() => isEditing ? cancelEdit() : startEdit(task)}
                              className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
                            >
                              {isEditing ? "Cancel" : "Edit"}
                            </button>
                            {task.notes ? (
                              <button
                                type="button"
                                onClick={() => toggleNotes(task.id)}
                                className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
                              >
                                {isOpen ? "Hide" : "Notes"}
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => removeTask(task.id)}
                              className="rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-hairline hover:text-ink-muted"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {/* Edit form */}
                        {isEditing ? (
                          <div className="animate-fade mt-4 rounded-md border border-hairline bg-surface-card p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-[1px] text-ink-muted">Title</label>
                                <input
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-coral"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-[1px] text-ink-muted">Notes</label>
                                <MarkdownEditor
                                  value={editNotes}
                                  onChange={setEditNotes}
                                  placeholder="Markdown supported…"
                                  minHeight={120}
                                />
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium uppercase tracking-[1px] text-ink-muted">Due date & time</label>
                                <input
                                  type="datetime-local"
                                  value={editDueAt}
                                  onChange={(e) => setEditDueAt(e.target.value)}
                                  className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-coral"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveEdit(task.id)}
                                  className="rounded-md bg-coral px-4 py-1.5 text-xs font-medium text-white transition hover:bg-coral-active"
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="rounded-md border border-hairline px-4 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                        {/* Notes expanded */}
                        {task.notes && isOpen ? (
                          <div className="animate-fade mt-4 rounded-md border border-hairline bg-surface-card px-4 py-3">
                            <RenderedMarkdown source={task.notes} />
                            {extractMarkdownUrls(task.notes).length > 0 ? (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {extractMarkdownUrls(task.notes).map((url) => (
                                  <a
                                    key={url}
                                    href={url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-coral transition hover:border-coral"
                                  >
                                    {url}
                                  </a>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            ))
          )}
      </div>
    </section>
    </>
  );
}
