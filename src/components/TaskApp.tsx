"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import MarkdownEditor from "@/components/MarkdownEditor";
import RenderedMarkdown from "@/components/RenderedMarkdown";
import TaskDrawer from "@/components/TaskDrawer";
import { InProgressLabel, ProjectLabel } from "@/components/TaskLabels";
import { SpacePicker } from "@/components/SpaceLock";
import { usePersonalSpaceCtx } from "@/components/DashboardShell";
import { extractMarkdownUrls } from "@/lib/markdown";
import { cancelNotifications, getReminderWindows, scheduleNotifications } from "@/lib/notifications";
import { useTaskActions } from "@/hooks/useTaskActions";
import { useTasksAndProjects } from "@/hooks/useTasksAndProjects";
import type { Task } from "@/lib/types";

function clampPreview(text: string, limit = 140) {
  const cleaned = text.trim();
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit)}…`;
}

export default function TaskApp() {
  const { tasks, projects, loading, createTask, updateTask, deleteTask } = useTasksAndProjects();
  const { unlocked } = usePersonalSpaceCtx();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [space, setSpace] = useState<"professional" | "personal">("professional");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const [pendingPickTimeId, setPendingPickTimeId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);

  useTaskActions((taskId) => setPendingPickTimeId(taskId));

  useEffect(() => {
    const handler = () => setShowCreateModal(true);
    window.addEventListener("focus-new-task", handler);
    return () => window.removeEventListener("focus-new-task", handler);
  }, []);

  useEffect(() => {
    if (loading || !pendingPickTimeId) return;
    const task = tasks.find((t) => t.id === pendingPickTimeId);
    if (task) {
      startEdit(task);
      setPendingPickTimeId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pendingPickTimeId]);

  const sortedTasks = useMemo(() => {
    const visible = tasks.filter((t) => t.space !== "personal" || unlocked);
    return [...visible].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
  }, [tasks, unlocked]);

  const completedCount = tasks.filter((t) => t.completed).length;

  function closeCreateModal() {
    setShowCreateModal(false);
    setTitle("");
    setNotes("");
    setDueAt("");
    setSpace("professional");
  }

  async function addTask() {
    if (!title.trim()) return;
    const resolvedDueAt = dueAt ? new Date(dueAt).toISOString() : null;
    const task = await createTask({ title: title.trim(), notes: notes.trim(), dueAt: resolvedDueAt, space });
    if (resolvedDueAt) {
      scheduleNotifications({ sourceId: task.id, sourceType: "task", title: task.title, dueAt: resolvedDueAt, reminderWindows: getReminderWindows() });
    }
    closeCreateModal();
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

  async function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    const resolvedDueAt = editDueAt ? new Date(editDueAt).toISOString() : null;
    await updateTask(id, { title: editTitle.trim(), notes: editNotes.trim(), dueAt: resolvedDueAt });
    cancelNotifications(id).then(() => {
      if (resolvedDueAt) {
        scheduleNotifications({ sourceId: id, sourceType: "task", title: editTitle.trim(), dueAt: resolvedDueAt, reminderWindows: getReminderWindows() });
      }
    });
    cancelEdit();
  }

  async function removeTask(id: string) {
    await deleteTask(id);
    setExpanded((prev) => { const next = { ...prev }; delete next[id]; return next; });
    cancelNotifications(id);
  }

  function formatDueLabel(value: string | null) {
    if (!value) return "No due date";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "No due date";
    return dt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  function isOverdue(value: string | null) {
    if (!value) return false;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return false;
    return dt.getTime() < Date.now();
  }

  if (loading) {
    return (
      <section className="flex w-full flex-col gap-8 px-8 py-10 lg:px-10">
        <div className="flex items-center justify-center py-20 text-sm text-ink-soft">Loading tasks…</div>
      </section>
    );
  }

  const drawerTask = drawerTaskId ? tasks.find((t) => t.id === drawerTaskId) ?? null : null;

  return (
    <>
    {drawerTask && (
      <TaskDrawer
        task={drawerTask}
        section="task"
        projectName={drawerTask.projectId ? projects.find((p) => p.id === drawerTask.projectId)?.title : undefined}
        onClose={() => setDrawerTaskId(null)}
        onUpdate={(patch) => updateTask(drawerTask.id, patch)}
        onDelete={() => { removeTask(drawerTask.id); setDrawerTaskId(null); }}
      />
    )}
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
          <form className="flex flex-col gap-4 px-6 py-5" onSubmit={(e) => { e.preventDefault(); addTask(); }}>
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
              <MarkdownEditor value={notes} onChange={setNotes} placeholder="Markdown supported…" minHeight={120} />
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
              <SpacePicker value={space} onChange={setSpace} />
              <div className="flex gap-2">
                <button type="button" onClick={closeCreateModal} className="rounded-md border border-hairline px-4 py-2 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">Cancel</button>
                <button type="submit" className="rounded-md bg-coral px-4 py-2 text-xs font-medium text-white transition hover:bg-coral-active">Add task</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}

    <section className="flex w-full flex-col gap-8 px-8 py-10 lg:px-10">
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
            className="flex items-center gap-1.5 rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            New task
          </button>
        </div>
      </header>

      <div className="flex flex-col gap-3">
        {sortedTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-hairline p-10 text-center text-sm text-ink-soft">
            No tasks yet. Add one to get started.
          </div>
        ) : (
          sortedTasks.map((task, index) => {
                  const isOpen    = expanded[task.id];
                  const isEditing = editingId === task.id;
                  const preview   = clampPreview(task.notes);
                  const overdue   = isOverdue(task.dueAt);
                  return (
                    <article
                      key={task.id}
                      className={`animate-rise rounded-lg border bg-canvas p-5 transition ${
                        overdue ? "border-coral/30" : task.inProgress ? "border-amber-300/60 bg-amber-50/30" : "border-hairline"
                      } ${task.completed ? "opacity-60" : ""}`}
                      style={{ animationDelay: `${index * 40}ms` }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {/* 3-state cycle button: todo → in-progress → done */}
                          <button
                            type="button"
                            title={task.completed ? "Mark incomplete" : task.inProgress ? "Mark complete" : "Mark in progress"}
                            onClick={() => {
                              if (task.completed) {
                                updateTask(task.id, { completed: false, inProgress: false });
                              } else if (task.inProgress) {
                                updateTask(task.id, { completed: true, inProgress: false });
                              } else {
                                updateTask(task.id, { inProgress: true });
                              }
                            }}
                            className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition flex items-center justify-center ${
                              task.completed
                                ? "border-coral bg-coral"
                                : task.inProgress
                                ? "border-amber-500 bg-amber-500"
                                : "border-hairline bg-canvas hover:border-amber-400"
                            }`}
                          >
                            {task.inProgress && !task.completed && (
                              <span className="h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <h3
                              className={`text-sm font-medium text-ink leading-snug cursor-pointer hover:text-coral transition ${task.completed ? "line-through text-ink-soft" : ""}`}
                              onClick={() => setDrawerTaskId(task.id)}
                            >
                              {task.title}
                            </h3>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span className="text-xs text-ink-soft">{formatDueLabel(task.dueAt)}</span>
                              {overdue && !task.completed && (
                                <span className="rounded-pill bg-coral/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-coral">Overdue</span>
                              )}
                              {task.pinned && (
                                <span className="rounded-pill bg-surface-card px-2 py-0.5 text-[10px] font-medium uppercase tracking-[1px] text-ink-muted">Pinned</span>
                              )}
                              {task.inProgress && !task.completed && <InProgressLabel />}
                              {task.projectId && (() => {
                                const proj = projects.find((p) => p.id === task.projectId);
                                return proj ? <ProjectLabel title={proj.title} /> : null;
                              })()}
                            </div>
                            {task.notes ? (
                              <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">{preview}</p>
                            ) : (
                              <p className="mt-1.5 text-[10px] uppercase tracking-[1px] text-ink-soft">No notes</p>
                            )}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {!task.completed && (
                            <button
                              type="button"
                              onClick={() => updateTask(task.id, { inProgress: !task.inProgress, ...(task.inProgress ? {} : { completed: false }) })}
                              className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                                task.inProgress
                                  ? "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-hairline text-ink-muted hover:border-amber-400 hover:text-amber-700"
                              }`}
                            >
                              {task.inProgress ? "In progress" : "Start"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => updateTask(task.id, { pinned: !task.pinned })}
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
                          {task.notes && (
                            <button
                              type="button"
                              onClick={() => setExpanded((prev) => ({ ...prev, [task.id]: !prev[task.id] }))}
                              className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
                            >
                              {isOpen ? "Hide" : "Notes"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => removeTask(task.id)}
                            className="rounded-md border border-transparent px-2.5 py-1 text-xs font-medium text-ink-soft transition hover:border-hairline hover:text-ink-muted"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="animate-fade mt-4 rounded-md border border-hairline bg-surface-card p-4">
                          <div className="flex flex-col gap-3">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium uppercase tracking-[1px] text-ink-muted">Title</label>
                              <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-coral" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium uppercase tracking-[1px] text-ink-muted">Notes</label>
                              <MarkdownEditor value={editNotes} onChange={setEditNotes} placeholder="Markdown supported…" minHeight={120} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-xs font-medium uppercase tracking-[1px] text-ink-muted">Due date & time</label>
                              <input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} className="rounded-md border border-hairline bg-canvas px-3 py-2 text-sm text-ink outline-none transition focus:border-coral" />
                            </div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => saveEdit(task.id)} className="rounded-md bg-coral px-4 py-1.5 text-xs font-medium text-white transition hover:bg-coral-active">Save</button>
                              <button type="button" onClick={cancelEdit} className="rounded-md border border-hairline px-4 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">Cancel</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {task.notes && isOpen && (
                        <div className="animate-fade mt-4 rounded-md border border-hairline bg-surface-card px-4 py-3">
                          <RenderedMarkdown source={task.notes} />
                          {extractMarkdownUrls(task.notes).length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {extractMarkdownUrls(task.notes).map((url) => (
                                <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-coral transition hover:border-coral">{url}</a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })
        )}
      </div>
    </section>
    </>
  );
}
