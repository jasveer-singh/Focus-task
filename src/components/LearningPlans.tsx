"use client";

import { useEffect, useState } from "react";
import ChecklistPlan from "@/components/ChecklistPlan";
import { AI_PM_PLAN } from "@/data/ai-pm-plan";

// ── Types ─────────────────────────────────────────────────────────────────────

type Week = {
  id: string;
  label: string;        // "Week 1"
  focus: string;        // short focus line
  tasks: string[];      // bullet tasks
  deliverable?: string; // optional output
  done: boolean;
};

type Phase = {
  id: string;
  name: string;   // "Phase 1 — LLM Foundations"
  color: string;
  weeks: Week[];
};

type Plan = {
  id: string;
  title: string;
  subtitle: string;
  phases: Phase[];
  createdAt: string;
};

const PHASE_COLORS = ["#7c6af7", "#f97316", "#06b6d4", "#10b981", "#e0588f", "#eab308"];

function uid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ── Root ───────────────────────────────────────────────────────────────────────

export default function LearningPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [openChecklist, setOpenChecklist] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");

  useEffect(() => {
    fetch("/api/learning-plans")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Plan[]) => setPlans(Array.isArray(data) ? data.map(normalize) : []))
      .finally(() => setLoading(false));
  }, []);

  function normalize(p: Plan): Plan {
    return { ...p, phases: Array.isArray(p.phases) ? p.phases : [] };
  }

  async function createPlan() {
    if (!newTitle.trim()) return;
    const res = await fetch("/api/learning-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim(), subtitle: newSubtitle.trim(), phases: [] }),
    });
    if (!res.ok) return;
    const plan: Plan = normalize(await res.json());
    setPlans((prev) => [plan, ...prev]);
    setNewTitle(""); setNewSubtitle(""); setShowCreate(false);
    setOpenId(plan.id);
  }

  async function savePhases(planId: string, phases: Phase[]) {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, phases } : p)));
    await fetch(`/api/learning-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phases }),
    });
  }

  async function savePlanMeta(planId: string, patch: { title?: string; subtitle?: string }) {
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, ...patch } : p)));
    await fetch(`/api/learning-plans/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deletePlan(planId: string) {
    await fetch(`/api/learning-plans/${planId}`, { method: "DELETE" });
    setPlans((prev) => prev.filter((p) => p.id !== planId));
    if (openId === planId) setOpenId(null);
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-sm text-ink-soft">Loading…</div>;
  }

  const openPlan = plans.find((p) => p.id === openId) ?? null;

  if (openChecklist) {
    return <ChecklistPlan onBack={() => setOpenChecklist(false)} />;
  }

  if (openPlan) {
    return (
      <PlanDetail
        plan={openPlan}
        onBack={() => setOpenId(null)}
        onSavePhases={(phases) => savePhases(openPlan.id, phases)}
        onSaveMeta={(patch) => savePlanMeta(openPlan.id, patch)}
        onDelete={() => deletePlan(openPlan.id)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-muted">Build a phased plan and track your progress week by week.</p>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1.5 rounded-md bg-coral px-4 py-2 text-sm font-medium text-white transition hover:bg-coral-active"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          New plan
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-hairline bg-surface-card/60 p-5 animate-fade flex flex-col gap-3">
          <input autoFocus value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Plan title — e.g. AI PM → Forward Deployed Engineer" className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-coral" />
          <input value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} placeholder="Subtitle (optional) — the goal in one line" className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-sm text-ink outline-none focus:border-coral" />
          <div className="flex justify-end gap-2 border-t border-hairline pt-3">
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-md border border-hairline px-4 py-2 text-xs font-medium text-ink-muted hover:border-coral hover:text-coral">Cancel</button>
            <button type="button" onClick={createPlan} className="rounded-md bg-coral px-4 py-2 text-xs font-medium text-white hover:bg-coral-active">Create</button>
          </div>
        </div>
      )}

      {/* ── Pinned AI-PM plan ── */}
      <AiPmCard onClick={() => setOpenChecklist(true)} />

      {plans.length === 0 ? null : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {plans.map((p) => {
            const weeks = p.phases.flatMap((ph) => ph.weeks);
            const done = weeks.filter((w) => w.done).length;
            const pct = weeks.length ? Math.round((done / weeks.length) * 100) : 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenId(p.id)}
                className="rounded-xl border border-hairline bg-canvas p-5 text-left transition hover:border-coral/40"
              >
                <p className="font-display text-lg font-normal text-ink leading-snug">{p.title}</p>
                {p.subtitle && <p className="mt-1 text-xs text-ink-muted leading-relaxed line-clamp-2">{p.subtitle}</p>}
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-card">
                    <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-coral">{done}/{weeks.length}</span>
                </div>
                <p className="mt-2 text-[11px] text-ink-soft">{p.phases.length} phase{p.phases.length !== 1 ? "s" : ""}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AI-PM pinned card ────────────────────────────────────────────────────────

function AiPmCard({ onClick }: { onClick: () => void }) {
  const [checked, setChecked] = useState<number>(0);
  const total = AI_PM_PLAN.sections.flatMap((s) => s.items).length;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("suru-checklist-plan-ai-pm-v1");
      if (raw) setChecked((JSON.parse(raw) as string[]).length);
    } catch { /* ignore */ }
  }, []);

  const pct = total ? Math.round((checked / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-xl border-2 border-coral/20 bg-canvas p-5 text-left transition hover:border-coral/50 w-full"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="rounded-pill bg-coral/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px] text-coral">Pinned</span>
            <span className="rounded-pill bg-surface-card px-2 py-0.5 text-[10px] font-medium text-ink-muted">Checklist</span>
          </div>
          <p className="font-display text-lg font-normal text-ink leading-snug">{AI_PM_PLAN.title}</p>
          <p className="mt-0.5 text-xs text-ink-muted leading-relaxed">{AI_PM_PLAN.subtitle}</p>
        </div>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-1 shrink-0 text-ink-muted">
          <path d="M4 7h6M7 4l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-card">
          <div className="h-full rounded-full bg-coral transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-medium text-coral">{checked}/{total}</span>
      </div>
      <p className="mt-1.5 text-[11px] text-ink-soft">{AI_PM_PLAN.sections.length} gaps · {total} items</p>
    </button>
  );
}

// ── Plan detail ──────────────────────────────────────────────────────────────

function PlanDetail({
  plan,
  onBack,
  onSavePhases,
  onSaveMeta,
  onDelete,
}: {
  plan: Plan;
  onBack: () => void;
  onSavePhases: (phases: Phase[]) => void;
  onSaveMeta: (patch: { title?: string; subtitle?: string }) => void;
  onDelete: () => void;
}) {
  const [phases, setPhases] = useState<Phase[]>(plan.phases);
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set(plan.phases.map((p) => p.id)));
  const [addingWeekTo, setAddingWeekTo] = useState<string | null>(null);

  // keep local state in sync if the plan prop changes
  useEffect(() => { setPhases(plan.phases); }, [plan.phases]);

  function commit(next: Phase[]) {
    setPhases(next);
    onSavePhases(next);
  }

  const allWeeks = phases.flatMap((p) => p.weeks);
  const doneCount = allWeeks.filter((w) => w.done).length;
  const pct = allWeeks.length ? Math.round((doneCount / allWeeks.length) * 100) : 0;

  function addPhase() {
    const color = PHASE_COLORS[phases.length % PHASE_COLORS.length];
    const phase: Phase = { id: uid(), name: `Phase ${phases.length + 1}`, color, weeks: [] };
    commit([...phases, phase]);
    setOpenPhases((prev) => new Set(prev).add(phase.id));
  }

  function renamePhase(id: string, name: string) {
    commit(phases.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function deletePhase(id: string) {
    commit(phases.filter((p) => p.id !== id));
  }

  function addWeek(phaseId: string, week: Omit<Week, "id" | "done">) {
    commit(phases.map((p) => p.id === phaseId
      ? { ...p, weeks: [...p.weeks, { ...week, id: uid(), done: false }] }
      : p));
    setAddingWeekTo(null);
  }

  function toggleWeek(phaseId: string, weekId: string) {
    commit(phases.map((p) => p.id === phaseId
      ? { ...p, weeks: p.weeks.map((w) => (w.id === weekId ? { ...w, done: !w.done } : w)) }
      : p));
  }

  function deleteWeek(phaseId: string, weekId: string) {
    commit(phases.map((p) => p.id === phaseId
      ? { ...p, weeks: p.weeks.filter((w) => w.id !== weekId) }
      : p));
  }

  function togglePhaseOpen(id: string) {
    setOpenPhases((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Back + delete */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="flex items-center gap-1.5 text-xs font-medium text-ink-muted transition hover:text-coral">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2L3.5 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          All plans
        </button>
        <button type="button" onClick={onDelete} className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-hairline hover:text-coral">Delete plan</button>
      </div>

      {/* Title (editable on blur) */}
      <div>
        <input
          defaultValue={plan.title}
          onBlur={(e) => { if (e.target.value.trim() && e.target.value !== plan.title) onSaveMeta({ title: e.target.value.trim() }); }}
          className="w-full font-display text-3xl font-normal tracking-[-0.5px] text-ink bg-transparent outline-none"
        />
        <input
          defaultValue={plan.subtitle}
          placeholder="Add a one-line goal…"
          onBlur={(e) => { if (e.target.value !== plan.subtitle) onSaveMeta({ subtitle: e.target.value.trim() }); }}
          className="mt-1 w-full text-sm text-ink-muted bg-transparent outline-none placeholder:text-ink-soft"
        />
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-card/50 px-5 py-3">
        <span className="text-xs text-ink-soft whitespace-nowrap">Progress</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-card">
          <div className="h-full rounded-full bg-coral transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-semibold text-coral whitespace-nowrap">{doneCount} / {allWeeks.length} weeks</span>
      </div>

      {/* Phases */}
      <div className="flex flex-col gap-3">
        {phases.map((phase) => {
          const isOpen = openPhases.has(phase.id);
          const pDone = phase.weeks.filter((w) => w.done).length;
          return (
            <div key={phase.id} className="rounded-xl border border-hairline bg-canvas overflow-hidden">
              {/* Phase header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: phase.color }} />
                <input
                  defaultValue={phase.name}
                  onBlur={(e) => { if (e.target.value.trim() && e.target.value !== phase.name) renamePhase(phase.id, e.target.value.trim()); }}
                  className="flex-1 text-sm font-medium text-ink bg-transparent outline-none"
                />
                <span className="text-xs text-ink-soft">{pDone}/{phase.weeks.length}</span>
                <button type="button" onClick={() => deletePhase(phase.id)} className="rounded p-1 text-ink-soft hover:text-coral" title="Delete phase">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                </button>
                <button type="button" onClick={() => togglePhaseOpen(phase.id)} className="rounded p-1 text-ink-soft hover:text-ink" title={isOpen ? "Collapse" : "Expand"}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform ${isOpen ? "rotate-90" : ""}`}><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>

              {/* Weeks */}
              {isOpen && (
                <div className="border-t border-hairline px-4 py-3 flex flex-col gap-2">
                  {phase.weeks.map((w) => (
                    <div key={w.id} className="group flex items-start gap-3 rounded-lg border border-hairline px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => toggleWeek(phase.id, w.id)}
                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 transition flex items-center justify-center ${w.done ? "border-coral bg-coral" : "border-hairline hover:border-coral"}`}
                      >
                        {w.done && <svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l3 3 4-4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[1px] text-ink-soft">{w.label}</span>
                          {w.done && <span className="rounded-pill bg-coral/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[1px] text-coral">Done</span>}
                        </div>
                        <p className={`text-sm font-medium text-ink leading-snug ${w.done ? "line-through text-ink-soft" : ""}`}>{w.focus}</p>
                        {w.tasks.length > 0 && (
                          <ul className="mt-1 flex flex-col gap-0.5">
                            {w.tasks.map((t, i) => (
                              <li key={i} className="flex gap-1.5 text-xs text-ink-muted leading-relaxed">
                                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-ink-soft" />
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {w.deliverable && <p className="mt-1.5 text-xs text-ink-muted">📄 {w.deliverable}</p>}
                      </div>
                      <button type="button" onClick={() => deleteWeek(phase.id, w.id)} className="hidden group-hover:block text-ink-soft hover:text-coral" title="Delete week">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2 2 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  ))}

                  {addingWeekTo === phase.id ? (
                    <WeekForm
                      defaultLabel={`Week ${phase.weeks.length + 1}`}
                      onAdd={(week) => addWeek(phase.id, week)}
                      onCancel={() => setAddingWeekTo(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingWeekTo(phase.id)}
                      className="rounded-lg border border-dashed border-hairline px-3 py-2 text-xs text-ink-soft transition hover:border-coral/40 hover:text-coral text-left"
                    >
                      + Add week
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          onClick={addPhase}
          className="rounded-xl border border-dashed border-hairline px-4 py-3 text-sm text-ink-soft transition hover:border-coral/40 hover:text-coral"
        >
          + Add phase
        </button>
      </div>
    </div>
  );
}

// ── Week add form ──────────────────────────────────────────────────────────────

function WeekForm({
  defaultLabel,
  onAdd,
  onCancel,
}: {
  defaultLabel: string;
  onAdd: (week: Omit<Week, "id" | "done">) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState(defaultLabel);
  const [focus, setFocus] = useState("");
  const [tasksText, setTasksText] = useState("");
  const [deliverable, setDeliverable] = useState("");

  function submit() {
    if (!focus.trim() && !label.trim()) return;
    onAdd({
      label: label.trim() || defaultLabel,
      focus: focus.trim(),
      tasks: tasksText.split("\n").map((t) => t.trim()).filter(Boolean),
      deliverable: deliverable.trim() || undefined,
    });
  }

  return (
    <div className="rounded-lg border border-coral/40 bg-surface-card/40 p-3 flex flex-col gap-2">
      <div className="flex gap-2">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Week 1" className="w-28 rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none focus:border-coral" />
        <input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Focus for this week" className="flex-1 rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none focus:border-coral" />
      </div>
      <textarea value={tasksText} onChange={(e) => setTasksText(e.target.value)} rows={3} placeholder="Tasks — one per line" className="rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none focus:border-coral resize-none" />
      <input value={deliverable} onChange={(e) => setDeliverable(e.target.value)} placeholder="Deliverable (optional)" className="rounded-md border border-hairline bg-canvas px-2.5 py-1.5 text-xs text-ink outline-none focus:border-coral" />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="rounded-md border border-hairline px-3 py-1.5 text-xs font-medium text-ink-muted hover:border-coral hover:text-coral">Cancel</button>
        <button type="button" onClick={submit} className="rounded-md bg-coral px-3 py-1.5 text-xs font-medium text-white hover:bg-coral-active">Add week</button>
      </div>
    </div>
  );
}
