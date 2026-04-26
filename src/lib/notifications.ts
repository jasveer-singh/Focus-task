export const REMINDER_WINDOWS_KEY = "focus-reminder-windows-v1";

export const REMINDER_WINDOW_OPTIONS: Array<{ label: string; minutes: number }> = [
  { label: "5 min before", minutes: 5 },
  { label: "15 min before", minutes: 15 },
  { label: "30 min before", minutes: 30 },
  { label: "1 hour before", minutes: 60 },
  { label: "2 hours before", minutes: 120 },
  { label: "1 day before", minutes: 1440 }
];

export function getReminderWindows(): number[] {
  if (typeof window === "undefined") return [30];
  const raw = localStorage.getItem(REMINDER_WINDOWS_KEY);
  if (!raw) return [30];
  try {
    const parsed = JSON.parse(raw) as number[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [30];
  } catch {
    return [30];
  }
}

export function setReminderWindows(windows: number[]) {
  localStorage.setItem(REMINDER_WINDOWS_KEY, JSON.stringify(windows));
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch {
    return null;
  }
}

export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer
    });
    return subscription;
  } catch {
    return null;
  }
}

export async function unsubscribeFromPush(
  registration: ServiceWorkerRegistration
): Promise<boolean> {
  try {
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return true;
    return sub.unsubscribe();
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export interface SchedulePayload {
  sourceId: string;
  sourceType: "task" | "reminder";
  title: string;
  dueAt: string;
  reminderWindows: number[];
}

export async function scheduleNotifications(payload: SchedulePayload): Promise<void> {
  try {
    await fetch("/api/push/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch {
    // non-blocking
  }
}

export async function cancelNotifications(sourceId: string): Promise<void> {
  try {
    await fetch(`/api/push/schedule?sourceId=${encodeURIComponent(sourceId)}`, {
      method: "DELETE"
    });
  } catch {
    // non-blocking
  }
}
