"use client";

import { useEffect, useState } from "react";
import { registerServiceWorker, subscribeToPush } from "@/lib/notifications";

type Status = "unknown" | "unsupported" | "denied" | "granted" | "subscribing";

export default function PushSetup() {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission === "granted" ? "granted" : Notification.permission === "denied" ? "denied" : "unknown");
  }, []);

  async function enable() {
    setStatus("subscribing");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { setStatus("denied"); return; }

    const reg = await registerServiceWorker();
    if (!reg) { setStatus("unknown"); return; }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) { setStatus("granted"); return; }

    const sub = await subscribeToPush(reg, vapidKey);
    if (!sub) { setStatus("granted"); return; }

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, keys: { p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")!))), auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")!))) } }),
    });

    setStatus("granted");
  }

  // Don't show if already granted or unsupported
  if (status === "granted" || status === "unsupported") return null;

  return (
    <div className="mx-3 mb-2 rounded-lg border border-coral/20 bg-coral/5 px-3 py-2.5">
      <p className="text-xs font-medium text-ink">Get task reminders</p>
      <p className="mt-0.5 text-[11px] text-ink-muted leading-relaxed">
        Enable notifications to get alerts when tasks are due.
      </p>
      {status === "denied" ? (
        <p className="mt-1.5 text-[11px] text-red-500">Blocked in browser settings.</p>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={status === "subscribing"}
          className="mt-2 rounded-md bg-coral px-3 py-1 text-[11px] font-medium text-white transition hover:bg-coral-active disabled:opacity-60"
        >
          {status === "subscribing" ? "Enabling…" : "Enable notifications"}
        </button>
      )}
    </div>
  );
}
