"use client";

import { useEffect, useRef, useState } from "react";

// Per-section help copy. Structured so it can later be swapped for a
// knowledge-base lookup keyed by the same section key.
type HelpEntry = { title: string; points: string[]; kbHref?: string };

const HELP: Record<string, HelpEntry> = {
  today: {
    title: "Today",
    points: [
      "Plan your day into three buckets: Critical (the work that moves the day), Important, and Light lifts.",
      "Tap + on a section to add existing tasks or create new ones; the main New task button lets you pick a bucket.",
      "Click any card to open it, add a checklist, notes, or mark it in progress.",
      "Curious about the method? Use “Why these sections?” next to the date.",
    ],
  },
  reminders: {
    title: "Reminders",
    points: [
      "Your due queue and follow-ups, sorted by what needs attention first.",
      "Snooze, push to later today, or move to tomorrow without losing the thread.",
      "Enable notifications (left sidebar) to get alerts when tasks are due.",
    ],
  },
  tasks: {
    title: "Tasks",
    points: [
      "Capture everything here — each task can hold markdown notes and a checklist.",
      "Use Start to mark a task in progress; click the title to open the detail drawer.",
      "Tasks with a due date sync to your Google Calendar automatically.",
    ],
  },
  projects: {
    title: "Projects",
    points: [
      "Group related tasks under a project and track them across milestones.",
      "Set a status (planning, active, on-hold, completed) to see where each project stands.",
      "Project descriptions and task notes support markdown.",
    ],
  },
  ideas: {
    title: "Ideas",
    points: [
      "A quick inbox for notes and thoughts you don't want to lose.",
      "Capture fast with Cmd/Ctrl+Shift+I, add markdown notes, revisit anytime.",
    ],
  },
  feedback: {
    title: "Feedback",
    points: [
      "Capture product feedback — who said it and what they said.",
      "Messages support markdown so you can format quotes and links.",
    ],
  },
  learn: {
    title: "Learn",
    points: [
      "Save articles and links you want to read later, from any source.",
      "Paste a URL and an optional note; mark items as read once you're done.",
    ],
  },
  calendar: {
    title: "Calendar",
    points: [
      "Connect Google Calendar to pull your events into Suru.",
      "Tasks you create with a due date show up on your calendar, colour-coded by status.",
    ],
  },
  agents: {
    title: "Agents",
    points: ["Automated background workers that run tasks on your behalf. Coming soon."],
  },
};

export default function SectionHelp({ sectionKey }: { sectionKey: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const entry = HELP[sectionKey];

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("mousedown", onClick); window.removeEventListener("keydown", onKey); };
  }, [open]);

  if (!entry) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`How to use ${entry.title}`}
        title={`How to use ${entry.title}`}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-hairline text-ink-soft transition hover:border-coral hover:text-coral"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6.3 6.2a1.7 1.7 0 1 1 2.2 1.6c-.5.2-.7.5-.7 1v.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="8" cy="11.4" r="0.7" fill="currentColor" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-[1000] w-80 rounded-xl border border-hairline bg-canvas p-4 shadow-xl animate-fade">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">How to use {entry.title}</p>
            <button type="button" onClick={() => setOpen(false)} className="rounded p-0.5 text-ink-soft hover:text-ink">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
            </button>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {entry.points.map((p, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-ink-muted">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-coral" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-hairline pt-3">
            <span className="text-[11px] text-ink-soft">More guides coming to the knowledge base.</span>
          </div>
        </div>
      )}
    </div>
  );
}
