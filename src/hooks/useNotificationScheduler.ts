"use client";

import { useEffect, useRef } from "react";

import { getReminderWindows, REMINDER_WINDOW_OPTIONS } from "@/lib/notifications";

type Task = {
  id: string;
  title: string;
  completed: boolean;
  dueAt: string | null;
};

// `actions` is a valid web notification option but not in all TS DOM libs
type NotificationAction = { action: string; title: string; icon?: string };
type NotificationOptionsWithActions = NotificationOptions & {
  actions?: NotificationAction[];
  data?: Record<string, unknown>;
};

const STORAGE_KEY = "focus-tasks-v1";
const FIRED_KEY = "focus-notif-fired-v1";

function getTasks(): Task[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as Task[];
  } catch {
    return [];
  }
}

function getFired(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) || "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

function markFired(key: string) {
  const fired = getFired();
  fired[key] = true;
  localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
}

function windowLabel(minutes: number): string {
  const opt = REMINDER_WINDOW_OPTIONS.find((o) => o.minutes === minutes);
  if (opt) return opt.label.replace(" before", "");
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1440) return `${minutes / 60}h`;
  return `${minutes / 1440}d`;
}

// Use SW showNotification as primary — required for action buttons (Done / Snooze / Pick time).
// Falls back to new Notification() if SW is unavailable.
async function showNotification(title: string, options: NotificationOptionsWithActions) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, options as NotificationOptions);
    } else {
      new Notification(title, options as NotificationOptions);
    }
  } catch {
    // Last-resort fallback
    try { new Notification(title, options as NotificationOptions); } catch { /* ignore */ }
  }
}

export function useNotificationScheduler() {
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearAll() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function schedule() {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    clearAll();

    const tasks = getTasks();
    const fired = getFired();
    const windows = getReminderWindows();
    const now = Date.now();

    // Prune fired keys older than 2 days
    const twoDaysAgo = now - 2 * 24 * 60 * 60 * 1000;
    let pruned = false;
    for (const key of Object.keys(fired)) {
      const parts = key.split(":");
      const ts = Number(parts[parts.length - 1]);
      if (ts && ts < twoDaysAgo) { delete fired[key]; pruned = true; }
    }
    if (pruned) localStorage.setItem(FIRED_KEY, JSON.stringify(fired));

    for (const task of tasks) {
      if (task.completed || !task.dueAt) continue;
      const due = new Date(task.dueAt).getTime();
      if (!Number.isFinite(due)) continue;

      // Reminder windows
      const taskActions: Array<NotificationAction> = [
        { action: "done",      title: "✅ Done"          },
        { action: "snooze",    title: "⏰ Snooze 1 hr"   },
        { action: "pick-time", title: "📅 Pick new time"  }
      ];

      for (const win of windows) {
        const fireAt = due - win * 60_000;
        const key = `${task.id}:pre${win}:${fireAt}`;
        if (fired[key] || fireAt <= now) continue;

        const delay = fireAt - now;
        const timer = setTimeout(() => {
          showNotification(`Upcoming: ${task.title}`, {
            body: `Due in ${windowLabel(win)}`,
            tag: `${task.id}-pre${win}`,
            data: { taskId: task.id },
            actions: taskActions
          });
          markFired(key);
        }, delay);
        timersRef.current.push(timer);
      }

      // At-due notification
      const dueKey = `${task.id}:due:${due}`;
      if (!fired[dueKey] && due > now) {
        const delay = due - now;
        const timer = setTimeout(() => {
          showNotification(`Due now: ${task.title}`, {
            body: "This task is due.",
            tag: `${task.id}-due`,
            data: { taskId: task.id },
            actions: taskActions
          });
          markFired(dueKey);
        }, delay);
        timersRef.current.push(timer);
      }
    }
  }

  useEffect(() => {
    schedule();

    const onTasksUpdate = () => schedule();
    const onWindowsChange = () => schedule();
    window.addEventListener("focus-tasks-updated", onTasksUpdate);
    window.addEventListener("focus-reminder-windows-changed", onWindowsChange);

    return () => {
      clearAll();
      window.removeEventListener("focus-tasks-updated", onTasksUpdate);
      window.removeEventListener("focus-reminder-windows-changed", onWindowsChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
