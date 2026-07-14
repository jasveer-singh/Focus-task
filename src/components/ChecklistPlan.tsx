"use client";

import { useEffect, useState } from "react";
import { AI_PM_PLAN, type ChecklistPlanData, type ItemKind } from "@/data/ai-pm-plan";

const STORAGE_KEY = "suru-checklist-plan-ai-pm-v1";
const NOTE_KEY    = "suru-checklist-plan-ai-pm-note-v1";

// ── Kind label ────────────────────────────────────────────────────────────────

const KIND_META: Record<ItemKind, { label: string; className: string }> = {
  learn: { label: "Learn",    className: "bg-indigo-50 text-indigo-600" },
  read:  { label: "Read",     className: "bg-green-50 text-green-700"   },
  do:    { label: "Practice", className: "bg-orange-50 text-orange-600" },
};

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ done, total, size = "md" }: { done: number; total: number; size?: "sm" | "md" }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 rounded-full bg-surface-card overflow-hidden ${size === "sm" ? "h-1" : "h-1.5"}`}>
        <div
          className="h-full rounded-full bg-coral transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 text-xs text-ink-muted tabular-nums">
        {done}/{total}
      </span>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function ChecklistPlan({ onBack }: { onBack: () => void }) {
  const plan: ChecklistPlanData = AI_PM_PLAN;

  // checked item IDs
  const [checked, setChecked] = useState<Set<string>>(new Set());
  // editable pricing note
  const [note, setNote] = useState(plan.pricingNote);
  const [editingNote, setEditingNote] = useState(false);

  // load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
      const savedNote = localStorage.getItem(NOTE_KEY);
      if (savedNote) setNote(savedNote);
    } catch { /* ignore */ }
  }, []);

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  function resetAll() {
    setChecked(new Set());
    localStorage.removeItem(STORAGE_KEY);
  }

  function saveNote(val: string) {
    setNote(val);
    localStorage.setItem(NOTE_KEY, val);
    setEditingNote(false);
  }

  const allItems   = plan.sections.flatMap((s) => s.items);
  const totalDone  = allItems.filter((i) => checked.has(i.id)).length;
  const totalItems = allItems.length;

  return (
    <section className="flex w-full flex-col gap-0">
      {/* ── Header ── */}
      <div className="border-b border-hairline px-8 py-6 lg:px-10">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-coral"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Learning plans
        </button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">{plan.subtitle}</p>
            <h1 className="mt-1 font-display text-3xl font-normal tracking-[-0.5px] text-ink">{plan.title}</h1>
            <div className="mt-4 max-w-sm">
              <ProgressBar done={totalDone} total={totalItems} />
              <p className="mt-1 text-xs text-ink-muted">{totalDone} of {totalItems} done ({Math.round((totalDone / totalItems) * 100)}%)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
          >
            Reset all
          </button>
        </div>

        {/* Pricing note */}
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="mt-px shrink-0">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          {editingNote ? (
            <div className="flex-1 flex gap-2">
              <input
                autoFocus
                defaultValue={note}
                onBlur={(e) => saveNote(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveNote((e.target as HTMLInputElement).value); if (e.key === "Escape") setEditingNote(false); }}
                className="flex-1 bg-transparent outline-none text-amber-800"
              />
            </div>
          ) : (
            <span className="flex-1 cursor-pointer" onClick={() => setEditingNote(true)} title="Click to edit">{note}</span>
          )}
        </div>
      </div>

      {/* ── Sections ── */}
      <div className="flex flex-col divide-y divide-hairline">
        {plan.sections.map((section) => {
          const secDone  = section.items.filter((i) => checked.has(i.id)).length;
          const secTotal = section.items.length;
          const allDone  = secDone === secTotal;

          return (
            <div key={section.id} className="px-8 py-6 lg:px-10">
              {/* Section header */}
              <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] ${
                      section.id === "stretch"
                        ? "bg-purple-50 text-purple-600"
                        : "bg-surface-card text-ink-muted"
                    }`}>
                      {section.tag}
                    </span>
                    {allDone && (
                      <span className="rounded-pill bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-green-700">
                        Done ✓
                      </span>
                    )}
                  </div>
                  <h2 className="font-display text-lg font-normal tracking-[-0.2px] text-ink">{section.title}</h2>
                  <p className="mt-1 text-xs text-ink-muted leading-relaxed max-w-2xl">{section.why}</p>
                </div>
                <div className="w-36 shrink-0">
                  <ProgressBar done={secDone} total={secTotal} size="sm" />
                </div>
              </div>

              {/* Items */}
              <ul className="flex flex-col gap-2">
                {section.items.map((item) => {
                  const done = checked.has(item.id);
                  const meta = KIND_META[item.kind];
                  return (
                    <li key={item.id}>
                      <label className={`flex items-start gap-3 cursor-pointer rounded-lg border px-4 py-3 transition ${
                        done
                          ? "border-hairline bg-surface-card/40 opacity-60"
                          : "border-hairline bg-canvas hover:border-coral/30"
                      }`}>
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() => toggle(item.id)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-coral"
                        />
                        <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] ${meta.className}`}>
                          {meta.label}
                        </span>
                        <span className={`text-sm leading-relaxed text-ink ${done ? "line-through text-ink-muted" : ""}`}>
                          {item.text}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
