"use client";

import { useState } from "react";
import { KIND_META, planProgress, type ChecklistPlan, type ChecklistSection } from "@/lib/checklist-plan";

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ done, total, size = "md" }: { done: number; total: number; size?: "sm" | "md" }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 rounded-full bg-surface-card overflow-hidden ${size === "sm" ? "h-1" : "h-1.5"}`}>
        <div className="h-full rounded-full bg-coral transition-all duration-300" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs text-ink-muted tabular-nums">{done}/{total}</span>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

type Props = {
  plan: ChecklistPlan;
  onBack: () => void;
  onToggleItem: (sectionId: string, itemId: string, done: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
};

export default function ChecklistPlanView({ plan, onBack, onToggleItem, onDelete, onEdit }: Props) {
  const { done: totalDone, total: totalItems } = planProgress(plan.sections);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <section className="flex w-full flex-col gap-0">
      {/* Header */}
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
            {plan.subtitle && (
              <p className="text-xs font-medium uppercase tracking-[1.5px] text-ink-muted">{plan.subtitle}</p>
            )}
            <h1 className="mt-1 font-display text-3xl font-normal tracking-[-0.5px] text-ink">{plan.title}</h1>
            <div className="mt-4 max-w-sm">
              <ProgressBar done={totalDone} total={totalItems} />
              <p className="mt-1 text-xs text-ink-muted">
                {totalDone} of {totalItems} done ({totalItems ? Math.round((totalDone / totalItems) * 100) : 0}%)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onEdit}
              className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
            >
              Edit plan
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-ink-muted">Delete?</span>
                <button type="button" onClick={onDelete} className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100">Yes, delete</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted hover:text-ink">Cancel</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-red-300 hover:text-red-500"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="flex flex-col divide-y divide-hairline">
        {plan.sections.map((section) => (
          <SectionBlock
            key={section.id}
            section={section}
            onToggle={(itemId, done) => onToggleItem(section.id, itemId, done)}
          />
        ))}

        {plan.sections.length === 0 && (
          <div className="px-8 py-16 text-center text-sm text-ink-soft">
            No sections yet. Click &ldquo;Edit plan&rdquo; to add some.
          </div>
        )}
      </div>
    </section>
  );
}

function SectionBlock({
  section,
  onToggle,
}: {
  section: ChecklistSection;
  onToggle: (itemId: string, done: boolean) => void;
}) {
  const done  = section.items.filter((i) => i.done).length;
  const total = section.items.length;
  const allDone = done === total && total > 0;

  return (
    <div className="px-8 py-6 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {section.tag && (
              <span className="rounded-pill bg-surface-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-ink-muted">
                {section.tag}
              </span>
            )}
            {allDone && (
              <span className="rounded-pill bg-green-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-green-700">
                Done
              </span>
            )}
          </div>
          <h2 className="font-display text-lg font-normal tracking-[-0.2px] text-ink">{section.title}</h2>
          {section.why && (
            <p className="mt-1 text-xs text-ink-muted leading-relaxed max-w-2xl">{section.why}</p>
          )}
        </div>
        <div className="w-32 shrink-0 mt-1">
          <ProgressBar done={done} total={total} size="sm" />
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {section.items.map((item) => {
          const meta = KIND_META[item.kind];
          return (
            <li key={item.id}>
              <label className={`flex items-start gap-3 cursor-pointer rounded-lg border px-4 py-3 transition ${
                item.done ? "border-hairline bg-surface-card/40 opacity-60" : "border-hairline bg-canvas hover:border-coral/30"
              }`}>
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() => onToggle(item.id, !item.done)}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-coral"
                />
                <span className={`shrink-0 rounded-pill px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] ${meta.className}`}>
                  {meta.label}
                </span>
                <span className={`text-sm leading-relaxed text-ink ${item.done ? "line-through text-ink-muted" : ""}`}>
                  {item.text}
                </span>
              </label>
            </li>
          );
        })}
        {section.items.length === 0 && (
          <li className="rounded-lg border border-dashed border-hairline px-4 py-3 text-xs text-ink-soft text-center">
            No items in this section
          </li>
        )}
      </ul>
    </div>
  );
}
