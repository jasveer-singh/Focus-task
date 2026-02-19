"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInlineMarkdown(input: string) {
  let output = escapeHtml(input);
  output = output.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2" target="_blank" rel="noreferrer">$1</a>'
  );
  output = output.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  output = output.replace(/\*(.+?)\*/g, "<em>$1</em>");
  output = output.replace(/`(.+?)`/g, "<code>$1</code>");
  return output;
}

function renderMarkdownBlocks(input: string) {
  const lines = input.split("\n");
  const htmlBlocks: string[] = [];
  let inUnorderedList = false;
  let inOrderedList = false;

  function closeLists() {
    if (inUnorderedList) {
      htmlBlocks.push("</ul>");
      inUnorderedList = false;
    }
    if (inOrderedList) {
      htmlBlocks.push("</ol>");
      inOrderedList = false;
    }
  }

  lines.forEach((line) => {
    const unorderedListMatch = line.match(/^\s*[-*]\s+(.+)/);
    if (unorderedListMatch) {
      if (!inUnorderedList) {
        closeLists();
        inUnorderedList = true;
        htmlBlocks.push("<ul>");
      }
      htmlBlocks.push(`<li>${renderInlineMarkdown(unorderedListMatch[1])}</li>`);
      return;
    }

    const orderedListMatch = line.match(/^\s*\d+\.\s+(.+)/);
    if (orderedListMatch) {
      if (!inOrderedList) {
        closeLists();
        inOrderedList = true;
        htmlBlocks.push("<ol>");
      }
      htmlBlocks.push(`<li>${renderInlineMarkdown(orderedListMatch[1])}</li>`);
      return;
    }

    closeLists();

    if (!line.trim()) {
      htmlBlocks.push("<br />");
      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const tag = `h${level}`;
      htmlBlocks.push(`<${tag}>${renderInlineMarkdown(headingMatch[2])}</${tag}>`);
      return;
    }

    const quoteMatch = line.match(/^\>\s+(.+)/);
    if (quoteMatch) {
      htmlBlocks.push(`<blockquote>${renderInlineMarkdown(quoteMatch[1])}</blockquote>`);
      return;
    }

    htmlBlocks.push(`<p>${renderInlineMarkdown(line)}</p>`);
  });

  closeLists();
  return htmlBlocks.join("");
}

function extractUrls(input: string) {
  const matches = input.match(/https?:\/\/[^\s<]+/g) || [];
  return Array.from(new Set(matches));
}

function wrapMarkdownSelection(
  ref: React.RefObject<HTMLTextAreaElement>,
  value: string,
  setValue: (next: string) => void,
  left: string,
  right: string,
  placeholder: string
) {
  const element = ref.current;
  const start = element?.selectionStart ?? value.length;
  const end = element?.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  const content = selected || placeholder;
  const next = `${value.slice(0, start)}${left}${content}${right}${value.slice(end)}`;
  setValue(next);
  requestAnimationFrame(() => {
    const target = ref.current;
    if (!target) return;
    target.focus();
    target.setSelectionRange(start + left.length, start + left.length + content.length);
  });
}

function prefixMarkdownSelection(
  ref: React.RefObject<HTMLTextAreaElement>,
  value: string,
  setValue: (next: string) => void,
  prefix: string,
  placeholder: string
) {
  const element = ref.current;
  const start = element?.selectionStart ?? value.length;
  const end = element?.selectionEnd ?? value.length;
  const selected = value.slice(start, end);
  const content = selected || placeholder;
  const prefixed = content
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");
  const next = `${value.slice(0, start)}${prefixed}${value.slice(end)}`;
  setValue(next);
  requestAnimationFrame(() => {
    const target = ref.current;
    if (!target) return;
    target.focus();
    target.setSelectionRange(start, start + prefixed.length);
  });
}

export default function TaskApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [notesMode, setNotesMode] = useState<"write" | "preview">("write");
  const [editNotesMode, setEditNotesMode] = useState<"write" | "preview">("write");
  const [dueAt, setDueAt] = useState("");
  const [editDueAt, setEditDueAt] = useState("");
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const editNotesRef = useRef<HTMLTextAreaElement>(null);

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
      dueAt: dueAt ? new Date(dueAt).toISOString() : null,
      createdAt: Date.now()
    };
    setTasks((prev) => [newTask, ...prev]);
    setTitle("");
    setNotes("");
    setDueAt("");
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
    setEditDueAt(task.dueAt ? task.dueAt.slice(0, 16) : "");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditNotes("");
    setEditNotesMode("write");
    setEditDueAt("");
  }

  function saveEdit(id: string) {
    if (!editTitle.trim()) return;
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              title: editTitle.trim(),
              notes: editNotes.trim(),
              dueAt: editDueAt ? new Date(editDueAt).toISOString() : null
            }
          : task
      )
    );
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
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  wrapMarkdownSelection(notesRef, notes, setNotes, "**", "**", "bold")
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                Bold
              </button>
              <button
                type="button"
                onClick={() =>
                  wrapMarkdownSelection(notesRef, notes, setNotes, "*", "*", "italic")
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                Italic
              </button>
              <button
                type="button"
                onClick={() =>
                  wrapMarkdownSelection(notesRef, notes, setNotes, "`", "`", "code")
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                Code
              </button>
              <button
                type="button"
                onClick={() =>
                  prefixMarkdownSelection(notesRef, notes, setNotes, "- ", "list item")
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                List
              </button>
              <button
                type="button"
                onClick={() =>
                  prefixMarkdownSelection(notesRef, notes, setNotes, "## ", "Heading")
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() =>
                  prefixMarkdownSelection(notesRef, notes, setNotes, "> ", "Quoted text")
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                Quote
              </button>
              <button
                type="button"
                onClick={() =>
                  wrapMarkdownSelection(
                    notesRef,
                    notes,
                    setNotes,
                    "[Link text](",
                    ")",
                    "https://example.com"
                  )
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                Link
              </button>
              <button
                type="button"
                onClick={() =>
                  setNotes((prev) =>
                    prev ? `${prev}\nhttps://docs.google.com/document/...` : "https://docs.google.com/document/..."
                  )
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                Google Doc
              </button>
              <button
                type="button"
                onClick={() =>
                  setNotes((prev) =>
                    prev ? `${prev}\nhttps://docs.google.com/spreadsheets/...` : "https://docs.google.com/spreadsheets/..."
                  )
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                Google Sheet
              </button>
              <button
                type="button"
                onClick={() =>
                  setNotesMode((prev) => (prev === "write" ? "preview" : "write"))
                }
                className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
              >
                {notesMode === "write" ? "Preview" : "Write"}
              </button>
            </div>
            {notesMode === "write" ? (
              <textarea
                ref={notesRef}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Markdown supported. Add links, Google Docs, or Sheets URLs."
                className="min-h-[140px] resize-none rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3 text-sm text-ink-700 shadow-sm outline-none transition focus:border-accent-500"
              />
            ) : (
              <div className="min-h-[140px] rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3">
                <div
                  className="prose prose-sm max-w-none text-ink-700"
                  dangerouslySetInnerHTML={{ __html: renderMarkdownBlocks(notes) }}
                />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-ink-700">
              Due date & time
            </label>
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(event) => setDueAt(event.target.value)}
              className="rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3 text-sm text-ink-700 shadow-sm outline-none transition focus:border-accent-500"
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
            ([
              { key: "today", label: "Due today", items: sectionedTasks.today },
              { key: "week", label: "Due this week", items: sectionedTasks.week },
              { key: "month", label: "Due this month", items: sectionedTasks.month }
            ] as const).map((section) => (
              <div key={section.key} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-ink-300">
                    {section.label}
                  </h2>
                  <span className="text-xs text-ink-300">
                    {section.items.length} tasks
                  </span>
                </div>
                {section.items.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-mist-200 bg-white/70 p-6 text-center text-xs text-ink-300">
                    Nothing here yet.
                  </div>
                ) : (
                  section.items.map((task, index) => {
                    const isOpen = expanded[task.id];
                    const isEditing = editingId === task.id;
                    const preview = clampPreview(task.notes);
                    const overdue = isOverdue(task.dueAt);
                    return (
                      <article
                        key={task.id}
                        className={`animate-rise rounded-3xl bg-white p-5 shadow-card ${
                          overdue ? "border border-accent-500/40" : ""
                        }`}
                        style={{ animationDelay: `${index * 40}ms` }}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              aria-label={
                                task.completed ? "Mark incomplete" : "Mark complete"
                              }
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
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-300">
                                <span>{formatDueLabel(task.dueAt)}</span>
                                {overdue ? (
                                  <span className="rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-600">
                                    Overdue
                                  </span>
                                ) : null}
                              </div>
                              {task.notes ? (
                                <p className="mt-2 text-sm text-ink-500">
                                  {preview}
                                </p>
                              ) : (
                                <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink-300">
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
                              onClick={() =>
                                isEditing ? cancelEdit() : startEdit(task)
                              }
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
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      wrapMarkdownSelection(
                                        editNotesRef,
                                        editNotes,
                                        setEditNotes,
                                        "**",
                                        "**",
                                        "bold"
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    Bold
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      wrapMarkdownSelection(
                                        editNotesRef,
                                        editNotes,
                                        setEditNotes,
                                        "*",
                                        "*",
                                        "italic"
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    Italic
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      wrapMarkdownSelection(
                                        editNotesRef,
                                        editNotes,
                                        setEditNotes,
                                        "`",
                                        "`",
                                        "code"
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    Code
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      prefixMarkdownSelection(
                                        editNotesRef,
                                        editNotes,
                                        setEditNotes,
                                        "- ",
                                        "list item"
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    List
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      prefixMarkdownSelection(
                                        editNotesRef,
                                        editNotes,
                                        setEditNotes,
                                        "## ",
                                        "Heading"
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    H2
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      prefixMarkdownSelection(
                                        editNotesRef,
                                        editNotes,
                                        setEditNotes,
                                        "> ",
                                        "Quoted text"
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    Quote
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      wrapMarkdownSelection(
                                        editNotesRef,
                                        editNotes,
                                        setEditNotes,
                                        "[Link text](",
                                        ")",
                                        "https://example.com"
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    Link
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditNotes((prev) =>
                                        prev
                                          ? `${prev}\nhttps://docs.google.com/document/...`
                                          : "https://docs.google.com/document/..."
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    Google Doc
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditNotes((prev) =>
                                        prev
                                          ? `${prev}\nhttps://docs.google.com/spreadsheets/...`
                                          : "https://docs.google.com/spreadsheets/..."
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    Google Sheet
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditNotesMode((prev) =>
                                        prev === "write" ? "preview" : "write"
                                      )
                                    }
                                    className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500"
                                  >
                                    {editNotesMode === "write" ? "Preview" : "Write"}
                                  </button>
                                </div>
                                {editNotesMode === "write" ? (
                                  <textarea
                                    ref={editNotesRef}
                                    value={editNotes}
                                    onChange={(event) => setEditNotes(event.target.value)}
                                    className="min-h-[120px] resize-none rounded-2xl border border-mist-200 bg-white px-4 py-2 text-sm text-ink-700 shadow-sm outline-none transition focus:border-accent-500"
                                  />
                                ) : (
                                  <div className="min-h-[120px] rounded-2xl border border-mist-200 bg-white px-4 py-2">
                                    <div
                                      className="prose prose-sm max-w-none text-ink-700"
                                      dangerouslySetInnerHTML={{
                                        __html: renderMarkdownBlocks(editNotes)
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-300">
                                  Due date & time
                                </label>
                                <input
                                  type="datetime-local"
                                  value={editDueAt}
                                  onChange={(event) =>
                                    setEditDueAt(event.target.value)
                                  }
                                  className="rounded-2xl border border-mist-200 bg-white px-4 py-2 text-sm text-ink-700 shadow-sm outline-none transition focus:border-accent-500"
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
                    <div
                      className="prose prose-sm max-w-none text-ink-700"
                      dangerouslySetInnerHTML={{
                        __html: renderMarkdownBlocks(task.notes)
                      }}
                    />
                    {extractUrls(task.notes).length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {extractUrls(task.notes).map((url) => (
                          <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-full border border-mist-200 bg-white px-3 py-1 text-xs font-semibold text-ink-500 transition hover:border-accent-500 hover:text-accent-500"
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
      </div>
    </section>
  );
}
