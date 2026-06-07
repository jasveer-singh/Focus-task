"use client";

import { useEffect, useRef, useState } from "react";
import type { ChecklistItem, Task } from "@/lib/types";
import MarkdownEditor from "@/components/MarkdownEditor";
import RenderedMarkdown from "@/components/RenderedMarkdown";

function buildId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatDue(value: string | null) {
  if (!value) return null;
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return null;
  const today = new Date();
  const isToday = dt.toDateString() === today.toDateString();
  return isToday
    ? `Today, by ${dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
    : dt.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        (dt.getHours() ? ` · ${dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : "");
}

function formatCreated(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type DrawerSection = "critical" | "important" | "light" | "task" | "project";

const SECTION_LABEL: Record<DrawerSection, string> = {
  critical:  "Critical",
  important: "Important",
  light:     "Light lifts",
  task:      "Task",
  project:   "Project task",
};

export default function TaskDrawer({
  task,
  section = "task",
  onClose,
  onUpdate,
  onDelete,
}: {
  task: Task;
  section?: DrawerSection;
  onClose: () => void;
  onUpdate: (patch: Partial<Task> & { checklist?: ChecklistItem[] }) => void;
  onDelete: () => void;
  onRemoveFromToday?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editNotes, setEditNotes] = useState(task.notes);
  const [editDueAt, setEditDueAt] = useState(task.dueAt ? task.dueAt.slice(0, 16) : "");
  const [checklist, setChecklist] = useState<ChecklistItem[]>(task.checklist ?? []);
  const [newItemText, setNewItemText] = useState("");
  const newItemRef = useRef<HTMLInputElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Sync checklist to parent whenever it changes
  function saveChecklist(next: ChecklistItem[]) {
    setChecklist(next);
    onUpdate({ checklist: next });
  }

  function toggleItem(id: string) {
    const next = checklist.map((item) => item.id === id ? { ...item, done: !item.done } : item);
    saveChecklist(next);
  }

  function addItem() {
    if (!newItemText.trim()) return;
    const next = [...checklist, { id: buildId(), text: newItemText.trim(), done: false }];
    saveChecklist(next);
    setNewItemText("");
    newItemRef.current?.focus();
  }

  function removeItem(id: string) {
    saveChecklist(checklist.filter((item) => item.id !== id));
  }

  function saveEdit() {
    onUpdate({
      title: editTitle.trim(),
      notes: editNotes.trim(),
      dueAt: editDueAt ? new Date(editDueAt).toISOString() : null,
    });
    setEditing(false);
  }

  const doneCount = checklist.filter((i) => i.done).length;
  const isOverdue = task.dueAt && new Date(task.dueAt).getTime() < Date.now() && !task.completed;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[999] bg-black/20"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-[1000] flex h-full w-full max-w-md flex-col bg-canvas shadow-2xl animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-coral" />
            <span className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">
              {SECTION_LABEL[section]}
            </span>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-ink-soft transition hover:text-ink">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Title */}
          {editing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="font-display text-2xl font-normal text-ink bg-transparent outline-none border-b border-coral pb-1 w-full"
            />
          ) : (
            <h2 className="font-display text-2xl font-normal tracking-[-0.3px] text-ink leading-snug">
              {task.title}
            </h2>
          )}

          {/* Mark complete button */}
          <button
            type="button"
            onClick={() => onUpdate({ completed: !task.completed })}
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition ${
              task.completed
                ? "border-coral bg-coral/10 text-coral"
                : "border-hairline bg-surface-card text-ink hover:border-coral hover:bg-coral/5"
            }`}
          >
            <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition ${task.completed ? "border-coral bg-coral" : "border-hairline"}`}>
              {task.completed && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 5l3 3 4-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
            {task.completed ? "Completed" : "Mark complete"}
          </button>

          {/* Metadata */}
          <div className="flex flex-col divide-y divide-hairline rounded-xl border border-hairline overflow-hidden">
            {/* Due */}
            <div className="flex items-center gap-3 px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-ink-soft">
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span className="text-sm text-ink-soft w-20 shrink-0">Due</span>
              {editing ? (
                <input type="datetime-local" value={editDueAt} onChange={(e) => setEditDueAt(e.target.value)} className="text-sm text-ink bg-transparent outline-none" />
              ) : (
                <span className={`text-sm font-medium ${isOverdue ? "text-coral" : "text-ink"}`}>
                  {formatDue(task.dueAt) ?? "No due date"}
                </span>
              )}
            </div>
            {/* Created */}
            <div className="flex items-center gap-3 px-4 py-3">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-ink-soft">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <span className="text-sm text-ink-soft w-20 shrink-0">Created</span>
              <span className="text-sm font-medium text-ink">{formatCreated(task.createdAt)}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">Notes</p>
            {editing ? (
              <MarkdownEditor value={editNotes} onChange={setEditNotes} placeholder="Add notes…" minHeight={120} />
            ) : task.notes ? (
              <div className="rounded-xl border border-hairline bg-surface-card px-4 py-3">
                <RenderedMarkdown source={task.notes} />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-xl border border-dashed border-hairline px-4 py-3 text-sm text-ink-soft hover:border-coral/40 transition text-left"
              >
                Add notes…
              </button>
            )}
          </div>

          {/* Checklist */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">Checklist</p>
              {checklist.length > 0 && (
                <span className="text-xs text-ink-soft">{doneCount}/{checklist.length}</span>
              )}
            </div>

            {checklist.length > 0 && (
              <div className="flex flex-col gap-1">
                {checklist.map((item) => (
                  <div key={item.id} className="group flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-card transition">
                    <button
                      type="button"
                      onClick={() => toggleItem(item.id)}
                      className={`h-5 w-5 shrink-0 rounded-full border-2 transition flex items-center justify-center ${item.done ? "border-coral bg-coral" : "border-hairline hover:border-coral"}`}
                    >
                      {item.done && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M1.5 5l3 3 4-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm text-ink ${item.done ? "line-through text-ink-soft" : ""}`}>{item.text}</span>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="hidden group-hover:block text-ink-soft hover:text-coral transition"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add item input */}
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-hairline px-3 py-2 focus-within:border-coral transition">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-ink-soft shrink-0">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                ref={newItemRef}
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
                placeholder="Add checklist item…"
                className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
              />
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-hairline px-6 py-4 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onUpdate({ pinned: !task.pinned })}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${task.pinned ? "border-coral text-coral bg-coral/5" : "border-hairline text-ink-muted hover:border-coral hover:text-coral"}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M5 1h2M6 1v3M3 4h6l-1 4H4L3 4zM5 8v3M7 8v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {task.pinned ? "Pinned" : "Pin"}
            </button>
            <button
              type="button"
              onClick={() => { setEditing(!editing); if (editing) saveEdit(); }}
              className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {editing ? "Save" : "Edit"}
            </button>
          </div>
          {onRemoveFromToday && (
            <button
              type="button"
              onClick={onRemoveFromToday}
              className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-hairline hover:text-ink-muted mr-1"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              Remove from today
            </button>
          )}
          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-hairline hover:text-coral"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 3h9M4.5 3V1.5h3V3M5 5.5v4M7 5.5v4M2.5 3l.5 7.5h6L9.5 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
