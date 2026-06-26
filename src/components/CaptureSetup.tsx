"use client";

import { useEffect, useState } from "react";

// "Save from your phone" — shows the user's capture token, the endpoint,
// and step-by-step instructions to wire up an iOS Share Sheet Shortcut.

export default function CaptureSetup() {
  const [open, setOpen] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<"token" | "endpoint" | null>(null);

  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/capture` : "/api/capture";

  useEffect(() => {
    if (!open || token) return;
    setLoading(true);
    fetch("/api/capture/token")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setToken(d?.token ?? null))
      .finally(() => setLoading(false));
  }, [open, token]);

  async function rotate() {
    setLoading(true);
    const res = await fetch("/api/capture/token", { method: "POST" });
    const d = res.ok ? await res.json() : null;
    setToken(d?.token ?? null);
    setLoading(false);
  }

  function copy(text: string, which: "token" | "endpoint") {
    navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink-muted transition hover:border-coral hover:text-coral"
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <rect x="4" y="1.5" width="8" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
          <path d="M7 12.5h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        Save from your phone
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(20,20,19,0.45)" }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-lg rounded-xl border border-hairline bg-canvas animate-fade max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4 sticky top-0 bg-canvas">
              <div>
                <h2 className="font-display text-lg font-normal text-ink">Save from your phone</h2>
                <p className="text-xs text-ink-soft">One tap from YouTube, Instagram, Substack &amp; more</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-ink-soft hover:text-ink">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-5">
              {/* Endpoint */}
              <Field label="Endpoint URL" value={endpoint} copied={copied === "endpoint"} onCopy={() => copy(endpoint, "endpoint")} />

              {/* Token */}
              <div className="flex flex-col gap-1.5">
                <Field
                  label="Your capture token (keep it private)"
                  value={loading ? "Loading…" : (token ?? "—")}
                  mono
                  copied={copied === "token"}
                  onCopy={() => token && copy(token, "token")}
                />
                <button type="button" onClick={rotate} disabled={loading} className="self-start text-xs text-ink-soft underline transition hover:text-coral disabled:opacity-50">
                  Rotate token (invalidates the old Shortcut)
                </button>
              </div>

              {/* Setup steps */}
              <div className="rounded-lg border border-hairline bg-surface-card/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[1.5px] text-ink-muted">iPhone setup (one time)</p>
                <ol className="mt-3 flex flex-col gap-2 text-sm text-ink-muted leading-relaxed list-decimal pl-4">
                  <li>Open the <span className="font-medium text-ink">Shortcuts</span> app → <span className="font-medium text-ink">＋</span> → <span className="font-medium text-ink">Add Action</span>.</li>
                  <li>Add <span className="font-medium text-ink">Get Contents of URL</span>. Set the URL to the Endpoint above, Method <span className="font-medium text-ink">POST</span>.</li>
                  <li>Under Request Body choose <span className="font-medium text-ink">JSON</span> and add two fields:
                    <div className="mt-1 rounded-md bg-canvas border border-hairline px-3 py-2 font-mono text-xs text-ink">
                      token → <span className="text-coral">your token above</span><br/>
                      url → <span className="text-coral">Shortcut Input</span>
                    </div>
                  </li>
                  <li>Name it <span className="font-medium text-ink">Save to Suru</span> and enable <span className="font-medium text-ink">Show in Share Sheet</span> (set Share Sheet input to <span className="font-medium text-ink">URLs</span>).</li>
                  <li>Done. In any app, tap <span className="font-medium text-ink">Share → Save to Suru</span> — it lands here, enriched.</li>
                </ol>
              </div>

              <p className="text-xs text-ink-soft">
                Tip: on a Mac or Android you can do the same with a browser bookmarklet or extension later — ask anytime.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value, mono, copied, onCopy }: { label: string; value: string; mono?: boolean; copied: boolean; onCopy: () => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-ink-muted">{label}</label>
      <div className="flex items-center gap-2">
        <code className={`flex-1 min-w-0 truncate rounded-md border border-hairline bg-surface-card px-3 py-2 text-xs text-ink ${mono ? "font-mono" : ""}`}>{value}</code>
        <button type="button" onClick={onCopy} className="shrink-0 rounded-md border border-hairline px-3 py-2 text-xs font-medium text-ink-muted transition hover:border-coral hover:text-coral">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
