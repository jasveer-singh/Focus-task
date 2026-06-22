"use client";

import { useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Shared content for the "why Today works this way" philosophy.
// Three presentation variants below (A: modal, B: dismissible card, C: about)
// all render <PhilosophyBody />, so the copy lives in exactly one place.
// ─────────────────────────────────────────────────────────────────────────────

function PhilosophyBody() {
  return (
    <div className="flex flex-col gap-5">
      <img
        src="/productivity-cheatsheet.png"
        alt="Productivity cheat sheet: Pomodoro, 3/3/3 Method, Eisenhower Matrix, Eat the Frog, Seinfeld Strategy, and Time Blocking"
        className="w-full rounded-lg border border-hairline"
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
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
