"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "focus-tasks-v1";

type SWActionMessage = {
  type: "NOTIFICATION_ACTION";
  action: "done" | "snooze" | "pick-time";
  taskId: string;
};

function applyDone(taskId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const tasks = JSON.parse(raw) as Array<{ id: string; completed: boolean }>;
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: true } : t
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("focus-tasks-updated"));
  } catch { /* ignore */ }
}

function applySnooze(taskId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const tasks = JSON.parse(raw) as Array<{ id: string; dueAt: string | null }>;
    const snoozeUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, dueAt: snoozeUntil } : t
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("focus-tasks-updated"));
  } catch { /* ignore */ }
}

/**
 * Handles notification action button clicks from the service worker.
 * Works in two paths:
 *  1. App is open   → SW sends a postMessage, this hook applies the change.
 *  2. App was closed → SW opens the app with URL params, this hook reads them on mount.
 *
 * @param onPickTime - Called with taskId when the user taps "Pick new time".
 *                     The parent should open that task's edit form.
 */
export function useTaskActions(onPickTime: (taskId: string) => void) {
  // Stable ref so the useEffect doesn't re-run when the callback identity changes
  const onPickTimeRef = useRef(onPickTime);
  useEffect(() => { onPickTimeRef.current = onPickTime; }, [onPickTime]);

  useEffect(() => {
    // ── Path 1: URL params (app opened from a notification while closed) ──
    const params = new URLSearchParams(window.location.search);
    const taskAction = params.get("task_action");
    const taskId = params.get("task_id");

    if (taskAction && taskId) {
      if (taskAction === "done")           applyDone(taskId);
      else if (taskAction === "snooze")    applySnooze(taskId);
      else if (taskAction === "pick-time") onPickTimeRef.current(taskId);

      // Clean up the URL so refresh doesn't re-apply the action
      const clean = new URL(window.location.href);
      clean.searchParams.delete("task_action");
      clean.searchParams.delete("task_id");
      window.history.replaceState({}, "", clean.toString());
    }

    // ── Path 2: postMessage (app was open when user tapped action) ──
    function handleMessage(event: MessageEvent) {
      const data = event.data as SWActionMessage | undefined;
      if (!data || data.type !== "NOTIFICATION_ACTION") return;

      if (data.action === "done")           applyDone(data.taskId);
      else if (data.action === "snooze")    applySnooze(data.taskId);
      else if (data.action === "pick-time") onPickTimeRef.current(data.taskId);
    }

    navigator.serviceWorker?.addEventListener("message", handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleMessage);
    };
  }, []); // runs once on mount — stable via ref
}
