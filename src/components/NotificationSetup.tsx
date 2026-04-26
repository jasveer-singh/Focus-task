"use client";

import { useEffect, useState } from "react";

import {
  REMINDER_WINDOW_OPTIONS,
  getReminderWindows,
  registerServiceWorker,
  setReminderWindows,
  subscribeToPush,
  unsubscribeFromPush
} from "@/lib/notifications";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export default function NotificationSetup() {
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "unsupported"
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [windows, setWindows] = useState<number[]>([30]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
    setWindows(getReminderWindows());

    navigator.serviceWorker?.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  async function enable() {
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;

      const reg = await registerServiceWorker();
      if (!reg) return;

      const sub = await subscribeToPush(reg, VAPID_PUBLIC_KEY);
      if (!sub) return;

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth }
        })
      });
      setSubscribed(true);
    } finally {
      setLoading(false);
    }
  }

  async function disable() {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker?.ready;
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        });
        await unsubscribeFromPush(reg);
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  function toggleWindow(minutes: number) {
    const next = windows.includes(minutes)
      ? windows.filter((w) => w !== minutes)
      : [...windows, minutes];
    const safe = next.length === 0 ? [30] : next;
    setWindows(safe);
    setReminderWindows(safe);
    window.dispatchEvent(new Event("focus-reminder-windows-changed"));
  }

  if (permission === "unsupported") return null;

  return (
    <div className="border-t border-mist-200 pt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left hover:bg-mist-100 transition"
      >
        <div>
          <p className="text-xs font-semibold text-ink-700">Notifications</p>
          <p className="text-xs text-ink-300">
            {subscribed ? "Active" : permission === "denied" ? "Blocked" : "Off"}
          </p>
        </div>
        <span className="text-xs text-ink-300">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="mt-2 flex flex-col gap-3 rounded-2xl border border-mist-200 bg-mist-50 px-4 py-3 text-xs">
          {permission === "denied" ? (
            <p className="text-ink-500">
              Notifications are blocked. Allow them in your browser settings to enable alerts.
            </p>
          ) : subscribed ? (
            <>
              <p className="font-semibold text-ink-700">Remind me before due time</p>
              <div className="flex flex-wrap gap-2">
                {REMINDER_WINDOW_OPTIONS.map((opt) => {
                  const active = windows.includes(opt.minutes);
                  return (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={() => toggleWindow(opt.minutes)}
                      className={`rounded-full px-3 py-1 font-semibold transition ${
                        active
                          ? "bg-accent-500 text-white"
                          : "border border-mist-200 bg-white text-ink-500 hover:border-accent-500 hover:text-accent-500"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={disable}
                disabled={loading}
                className="rounded-full border border-mist-200 bg-white px-3 py-1 font-semibold text-ink-500 hover:border-accent-500 hover:text-accent-500 transition disabled:opacity-50"
              >
                {loading ? "Disabling…" : "Disable notifications"}
              </button>
            </>
          ) : (
            <>
              <p className="text-ink-500">
                Get browser and device push notifications when tasks are due.
              </p>
              <button
                type="button"
                onClick={enable}
                disabled={loading}
                className="w-full rounded-2xl bg-accent-500 px-4 py-2 font-semibold text-white shadow-glow hover:bg-accent-600 transition disabled:opacity-50"
              >
                {loading ? "Enabling…" : "Enable alerts"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
