"use client";

import { useCallback, useRef, useState } from "react";

type State = "idle" | "listening" | "processing" | "done" | "error";

type Result = {
  type: "task" | "project" | "idea" | "feedback";
  entity: { title: string };
};

export default function VoiceButton({ onCreated }: { onCreated?: (result: Result) => void }) {
  const [state, setState] = useState<State>("idle");
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Use refs so callbacks always see latest values without stale closure issues
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const stoppedIntentionallyRef = useRef(false);

  const isSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  async function sendToAPI(text: string) {
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult(data);
        setState("done");
        onCreated?.(data);
        setTimeout(() => { setState("idle"); setResult(null); setTranscript(""); }, 4000);
      } else {
        setState("error");
        setErrorMsg("Couldn't create item. Try again.");
        setTimeout(() => setState("idle"), 3000);
      }
    } catch {
      setState("error");
      setErrorMsg("Network error. Try again.");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string; interimResults: boolean; maxAlternatives: number;
        start(): void; stop(): void; abort(): void;
        onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
        onerror: ((e: { error: string }) => void) | null;
        onend: (() => void) | null;
      };
      webkitSpeechRecognition?: new () => {
        lang: string; interimResults: boolean; maxAlternatives: number;
        start(): void; stop(): void; abort(): void;
        onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
        onerror: ((e: { error: string }) => void) | null;
        onend: (() => void) | null;
      };
    };
    const SRClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SRClass) return;

    stoppedIntentionallyRef.current = false;
    const recognition = new SRClass();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    setState("listening");
    setTranscript("");
    setResult(null);
    setErrorMsg("");

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setState("processing");
      sendToAPI(text);
    };

    recognition.onerror = (e) => {
      // "aborted" fires when we call stop() intentionally — ignore it
      if (e.error === "aborted" || stoppedIntentionallyRef.current) return;
      setState("error");
      setErrorMsg("Couldn't hear you. Try again.");
      setTimeout(() => setState("idle"), 3000);
    };

    recognition.onend = () => {
      // If still in listening state after end (no result), go back to idle
      setState((prev) => prev === "listening" ? "idle" : prev);
    };

    recognition.start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupported]);

  function stop() {
    stoppedIntentionallyRef.current = true;
    recognitionRef.current?.stop();
    setState("idle");
  }

  if (!isSupported) return null;

  return (
    <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={state === "listening" ? stop : startListening}
        disabled={state === "processing"}
        className={`flex h-12 w-12 items-center justify-center rounded-full border-2 transition-all duration-200 ${
          state === "listening"
            ? "animate-pulse border-coral bg-coral text-white shadow-lg shadow-coral/30"
            : state === "processing"
            ? "border-coral/50 bg-coral/10 text-coral"
            : state === "done"
            ? "border-green-500 bg-green-50 text-green-600"
            : state === "error"
            ? "border-red-400 bg-red-50 text-red-500"
            : "border-hairline bg-canvas text-ink-muted hover:border-coral hover:text-coral"
        }`}
        aria-label="Voice command"
        title="Tap and speak to create a task, project, or idea"
      >
        {state === "processing" ? (
          <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.4" strokeDashoffset="10"/>
          </svg>
        ) : state === "done" ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 9l4.5 4.5L15 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="6" y="1" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M3 9a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="9" y1="15" x2="9" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {state === "listening" && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-coral/30 bg-canvas px-3 py-1.5 text-xs text-coral shadow-sm">
          Listening… tap to stop
        </div>
      )}
      {state === "processing" && transcript && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 max-w-[200px] rounded-lg border border-hairline bg-canvas px-3 py-1.5 text-center text-xs text-ink-muted shadow-sm">
          &quot;{transcript}&quot;
        </div>
      )}
      {state === "done" && result && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs text-green-700 shadow-sm">
          ✓ {result.type} created
        </div>
      )}
      {state === "error" && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 shadow-sm">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
