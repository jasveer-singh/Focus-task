"use client";

import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared content for the "why Today works this way" philosophy.
// Three presentation variants below (A: modal, B: dismissible card, C: about)
// all render <PhilosophyBody />, so the copy lives in exactly one place.
// ─────────────────────────────────────────────────────────────────────────────

const INTRO =
  "Today splits your work into Critical, Important, and Light lifts on purpose. " +
  "It blends two ideas: eat the frog — do the hardest thing first — and the 3/3/3 " +
  "method's habit of sorting effort by weight, so the day has one clear win at the top " +
  "and the small stuff never crowds it out.";

type Technique = { name: string; blurb: string };

const TECHNIQUES: Technique[] = [
  { name: "Eat the Frog", blurb: "Do your hardest task first — that's your Critical pick. The rest of the day feels easier." },
  { name: "3/3/3 Method", blurb: "3 hours on one important project, 3 shorter urgent tasks, 3 maintenance items." },
  { name: "Eisenhower Matrix", blurb: "Urgent + important → do it. Important not urgent → schedule. Not important → delegate or drop." },
  { name: "Pomodoro", blurb: "Work a 25-min focused timer, take a 5-min break, repeat 4× then rest longer." },
  { name: "Time Blocking", blurb: "Group similar work and assign each block a slot on the calendar, then stick to it." },
  { name: "Seinfeld Strategy", blurb: "Mark each day you do the work and keep the streak — never miss two days in a row." },
];

function PhilosophyBody() {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-ink-muted">{INTRO}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {TECHNIQUES.map((t) => (
          <div key={t.name} className="rounded-lg border border-hairline bg-canvas px-4 py-3">
            <p className="text-sm font-medium text-ink">{t.name}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{t.blurb}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT A — Info button in the header that opens a modal.
//   Render <PhilosophyInfoButton /> next to the "Today" title.
// ═════════════════════════════════════════════════════════════════════════════

export function PhilosophyInfoButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Why these sections?"
        className="flex items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-xs text-ink-soft transition hover:border-coral hover:text-coral"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 7v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <circle cx="8" cy="4.8" r="0.8" fill="currentColor" />
        </svg>
        Why these sections?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(20,20,19,0.45)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-canvas animate-fade">
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-normal text-ink">The idea behind Today</h2>
                <p className="text-xs text-ink-soft">Steal this productivity cheat sheet</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-soft hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              <PhilosophyBody />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT B — Dismissible card between the header and the task sections.
//   Hidden once dismissed (remembered in localStorage).
// ═════════════════════════════════════════════════════════════════════════════

const DISMISS_KEY = "suru-today-philosophy-dismissed";

export function PhilosophyCard() {
  const [dismissed, setDismissed] = useState(true); // assume hidden until we read storage

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); }
    catch { setDismissed(false); }
  }, []);

  if (dismissed) return null;

  return (
    <div className="rounded-xl border border-hairline bg-surface-card/60 p-6 animate-fade">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-normal text-ink">Why Today is built this way</h2>
          <p className="text-xs text-ink-soft">The philosophy behind Critical · Important · Light</p>
        </div>
        <button
          type="button"
          onClick={() => { try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} setDismissed(true); }}
          title="Dismiss"
          className="rounded-md p-1 text-ink-soft transition hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="mt-4">
        <PhilosophyBody />
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// VARIANT C — Collapsible "About" section, collapsed by default, at the bottom.
// ═════════════════════════════════════════════════════════════════════════════

export function PhilosophyAbout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-hairline pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs text-ink-soft transition hover:text-coral"
      >
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          className={`transition-transform ${open ? "rotate-90" : ""}`}
        >
          <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Why these sections? The idea behind Today
      </button>
      {open && (
        <div className="mt-4 animate-fade">
          <PhilosophyBody />
        </div>
      )}
    </div>
  );
}
