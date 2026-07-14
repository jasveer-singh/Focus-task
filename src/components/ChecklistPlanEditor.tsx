"use client";

import { useState } from "react";
import { KIND_META, uid, type ChecklistSection, type ChecklistItem, type ItemKind } from "@/lib/checklist-plan";

type Props = {
  initial?: { title: string; subtitle: string; sections: ChecklistSection[] };
  onSave: (title: string, subtitle: string, sections: ChecklistSection[]) => Promise<void>;
  onCancel: () => void;
  mode?: "create" | "edit";
};

export default function ChecklistPlanEditor({ initial, onSave, onCancel, mode = "create" }: Props) {
  const [title, setTitle]       = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [sections, setSections] = useState<ChecklistSection[]>(initial?.sections ?? []);
  const [saving, setSaving]     = useState(false);

  // ── Section actions ────────────────────────────────────────────────────────

  function addSection() {
    setSections((prev) => [
      ...prev,
      { id: uid(), tag: `Section ${prev.length + 1}`, title: "", why: "", items: [] },
    ]);
  }

  function updateSection(id: string, patch: Partial<ChecklistSection>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function moveSection(id: string, dir: -1 | 1) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  // ── Item actions ───────────────────────────────────────────────────────────

  function addItem(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, items: [...s.items, { id: uid(), kind: "learn" as ItemKind, text: "", done: false }] }
          : s
      )
    );
  }

  function updateItem(sectionId: string, itemId: string, patch: Partial<ChecklistItem>) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId ? s : { ...s, items: s.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }
      )
    );
  }

  function removeItem(sectionId: string, itemId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== sectionId ? s : { ...s, items: s.items.filter((i) => i.id !== itemId) }
      )
    );
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await onSave(title.trim(), subtitle.trim(), sections);
    setSaving(false);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex w-full flex-col gap-0">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hairline bg-canvas px-8 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-coral">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {mode === "edit" ? "Cancel" : "Learning plans"}
          </button>
          <span className="text-xs text-ink-soft">/</span>
          <span className="text-xs font-medium text-ink">{mode === "edit" ? "Edit plan" : "New checklist plan"}</span>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="rounded-md bg-coral px-4 py-1.5 text-xs font-medium text-white transition hover:bg-coral-active disabled:opacity-40"
        >
          {saving ? "Saving…" : mode === "edit" ? "Save changes" : "Create plan"}
        </button>
      </div>

      <div className="px-8 py-6 lg:px-10 flex flex-col gap-6">
        {/* Plan metadata */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Plan title</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. AI-First PM"
              className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-coral"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-ink-muted">Subtitle (optional)</label>
            <input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="One-line goal or context"
              className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition focus:border-coral"
            />
          </div>
        </div>

        {/* Sections */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">Sections</p>
            <button
              type="button"
              onClick={addSection}
              className="flex items-center gap-1 rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Add section
            </button>
          </div>

          {sections.length === 0 && (
            <div className="rounded-lg border border-dashed border-hairline p-8 text-center text-sm text-ink-soft">
              No sections yet. Add one to start building your plan.
            </div>
          )}

          {sections.map((section, sIdx) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={sIdx}
              total={sections.length}
              onUpdate={(patch) => updateSection(section.id, patch)}
              onRemove={() => removeSection(section.id)}
              onMoveUp={() => moveSection(section.id, -1)}
              onMoveDown={() => moveSection(section.id, 1)}
              onAddItem={() => addItem(section.id)}
              onUpdateItem={(itemId, patch) => updateItem(section.id, itemId, patch)}
              onRemoveItem={(itemId) => removeItem(section.id, itemId)}
            />
          ))}
        </div>

        {sections.length > 0 && (
          <button
            type="button"
            onClick={addSection}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-hairline py-3 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Add another section
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section editor ────────────────────────────────────────────────────────────

function SectionEditor({
  section, index, total,
  onUpdate, onRemove, onMoveUp, onMoveDown,
  onAddItem, onUpdateItem, onRemoveItem,
}: {
  section: ChecklistSection;
  index: number;
  total: number;
  onUpdate: (patch: Partial<ChecklistSection>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAddItem: () => void;
  onUpdateItem: (itemId: string, patch: Partial<ChecklistItem>) => void;
  onRemoveItem: (itemId: string) => void;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-canvas">
      {/* Section header row */}
      <div className="flex items-start gap-3 border-b border-hairline px-4 py-3">
        {/* Move buttons */}
        <div className="flex flex-col gap-0.5 mt-0.5">
          <button type="button" onClick={onMoveUp} disabled={index === 0} className="rounded p-0.5 text-ink-soft transition hover:text-ink disabled:opacity-20">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button type="button" onClick={onMoveDown} disabled={index === total - 1} className="rounded p-0.5 text-ink-soft transition hover:text-ink disabled:opacity-20">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-2 min-w-0">
          <div className="flex gap-2">
            <input
              value={section.tag}
              onChange={(e) => onUpdate({ tag: e.target.value })}
              placeholder="Label (e.g. Gap 1)"
              className="w-28 shrink-0 rounded-md border border-hairline bg-surface-card px-2.5 py-1.5 text-xs font-medium text-ink outline-none focus:border-coral"
            />
            <input
              value={section.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="Section title"
              className="flex-1 rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-sm text-ink outline-none focus:border-coral"
            />
          </div>
          <textarea
            value={section.why}
            onChange={(e) => onUpdate({ why: e.target.value })}
            placeholder="Why this section matters (optional)"
            rows={2}
            className="w-full resize-none rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-xs text-ink-muted outline-none focus:border-coral"
          />
        </div>

        <button type="button" onClick={onRemove} className="mt-0.5 shrink-0 rounded p-1 text-ink-soft transition hover:text-red-500">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2 2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
        </button>
      </div>

      {/* Items */}
      <div className="flex flex-col gap-0 divide-y divide-hairline">
        {section.items.map((item) => (
          <ItemEditor
            key={item.id}
            item={item}
            onUpdate={(patch) => onUpdateItem(item.id, patch)}
            onRemove={() => onRemoveItem(item.id)}
          />
        ))}
      </div>

      {/* Add item */}
      <div className="px-4 py-2.5">
        <button
          type="button"
          onClick={onAddItem}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-coral"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add item
        </button>
      </div>
    </div>
  );
}

// ── Item editor ───────────────────────────────────────────────────────────────

function ItemEditor({
  item,
  onUpdate,
  onRemove,
}: {
  item: ChecklistItem;
  onUpdate: (patch: Partial<ChecklistItem>) => void;
  onRemove: () => void;
}) {
  const kinds: ItemKind[] = ["learn", "read", "do"];

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5">
      {/* Kind picker */}
      <div className="flex rounded-full border border-hairline p-0.5 shrink-0">
        {kinds.map((k) => {
          const meta = KIND_META[k];
          const active = item.kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onUpdate({ kind: k })}
              className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] transition ${
                active ? meta.className : "text-ink-muted hover:text-ink"
              }`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      <input
        value={item.text}
        onChange={(e) => onUpdate({ text: e.target.value })}
        placeholder="Describe this item…"
        className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-soft"
      />

      <button type="button" onClick={onRemove} className="shrink-0 rounded p-1 text-ink-soft transition hover:text-red-500">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      </button>
    </div>
  );
}
