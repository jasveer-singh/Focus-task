"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: string;
  title: string;
  notes: string;
  completed: boolean;
  pinned: boolean;
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
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored) as Task[];
      setTasks(parsed);
    } catch {
      setTasks([]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
  }, [tasks]);

  const completedCount = tasks.filter((task) => task.completed).length;

  function addTask() {
    if (!title.trim()) return;
    const newTask: Task = {
      id: buildId(),
      title: title.trim(),
      notes: notes.trim(),
      completed: false,
      pinned: false,
      createdAt: Date.now()
    };
    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
    setNotes("");
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
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditNotes("");
  }

  function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? { ...task, title: editTitle.trim(), notes: editNotes.trim() }
          : task
      )
    );
    cancelEdit();
  }

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12 md:px-12">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-ink-300">
              Focus Tasks
            </p>
            <h1 className="font-display text-4xl font-semibold text-ink-900 md:text-5xl">
              Work with clarity, not clutter.
            </h1>
          </div>
          <div className="rounded-full bg-white px-4 py-2 text-sm text-ink-500 shadow-sm">
            {completedCount}/{tasks.length} completed
          </div>
        </div>
        <p className="max-w-2xl text-base text-ink-500">
          Capture tasks with structured notes. Notes stay tucked away until you
          choose to open them.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1.4fr]">
        <form
          className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-card"
          onSubmit={(event) => {
            event.preventDefault();
            addTask();
          }}
        >
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-ink-700">
              Task title
            </label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Draft outreach email"
              className="rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3 text-sm text-ink-700 shadow-sm outline-none transition focus:border-accent-500"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-ink-700">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Key context, steps, or references. These stay hidden until opened."
              className="min-h-[140px] resize-none rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3 text-sm text-ink-700 shadow-sm outline-none transition focus:border-accent-500"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-2xl bg-accent-500 px-4 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-accent-600"
          >
            Add task
          </button>
          <p className="text-xs text-ink-300">
            Everything is stored locally in your browser.
          </p>
        </form>

        <div className="flex flex-col gap-4">
          {sortedTasks.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-mist-200 bg-white/70 p-10 text-center text-sm text-ink-500">
              No tasks yet. Add one to get started.
            </div>
          ) : (
            sortedTasks.map((task, index) => {
              const isOpen = expanded[task.id];
              const isEditing = editingId === task.id;
              const preview = clampPreview(task.notes);
              return (
                <article
                  key={task.id}
                  className="animate-rise rounded-3xl bg-white p-5 shadow-card"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
                        onClick={() => toggleComplete(task.id)}
                        className={`mt-1 h-5 w-5 rounded-full border transition ${
                          task.completed
                            ? "border-accent-500 bg-accent-500"
                            : "border-mist-200 bg-white"
                        }`}
                      />
                      <div>
                        <h3
                          className={`text-lg font-semibold text-ink-900 ${
                            task.completed ? "line-through text-ink-300" : ""
                          }`}
                        >
                          {task.title}
                        </h3>
                        {task.notes ? (
                          <p className="mt-1 text-sm text-ink-500">
                            {preview}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ink-300">
                            No notes
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => togglePin(task.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          task.pinned
                            ? "border-accent-500 text-accent-500"
                            : "border-mist-200 text-ink-500 hover:border-accent-500 hover:text-accent-500"
                        }`}
                      >
                        {task.pinned ? "Pinned" : "Pin"}
                      </button>
                      <button
                        type="button"
                        onClick={() => (isEditing ? cancelEdit() : startEdit(task))}
                        className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 transition hover:border-accent-500 hover:text-accent-500"
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      {task.notes ? (
                        <button
                          type="button"
                          onClick={() => toggleNotes(task.id)}
                          className="rounded-full border border-mist-200 px-3 py-1 text-xs font-semibold text-ink-500 transition hover:border-accent-500 hover:text-accent-500"
                        >
                          {isOpen ? "Hide notes" : "View notes"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeTask(task.id)}
                        className="rounded-full border border-transparent px-3 py-1 text-xs font-semibold text-ink-300 transition hover:border-mist-200 hover:text-ink-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="animate-fade mt-4 rounded-2xl border border-mist-200 bg-mist-50 px-4 py-4">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
                            Title
                          </label>
                          <input
                            value={editTitle}
                            onChange={(event) => setEditTitle(event.target.value)}
                            className="rounded-2xl border border-mist-200 bg-white px-4 py-2 text-sm text-ink-700 shadow-sm outline-none transition focus:border-accent-500"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
                            Notes
                          </label>
                          <textarea
                            value={editNotes}
                            onChange={(event) => setEditNotes(event.target.value)}
                            className="min-h-[120px] resize-none rounded-2xl border border-mist-200 bg-white px-4 py-2 text-sm text-ink-700 shadow-sm outline-none transition focus:border-accent-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(task.id)}
                            className="rounded-full bg-accent-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent-600"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-full border border-mist-200 px-4 py-2 text-xs font-semibold text-ink-500 transition hover:border-accent-500 hover:text-accent-500"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {task.notes && isOpen ? (
                    <div className="animate-fade mt-4 rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3">
                      <p className="whitespace-pre-wrap text-sm text-ink-700">
                        {task.notes}
                      </p>
                    </div>
                  ) : null}
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
