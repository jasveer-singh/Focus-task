self.addEventListener("push", (event) => {
  if (!event.data) {
    event.waitUntil(
      self.registration.showNotification("Focus Tasks", { body: "You have a new notification." })
    );
    return;
  }

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Focus Tasks", body: event.data.text() };
  }

  const title = payload.title || "Focus Tasks";
  const taskId = payload.data?.taskId;

  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "focus-tasks",
    data: payload.data || {},
    requireInteraction: payload.requireInteraction || false,
    actions: taskId
      ? [
          { action: "done",      title: "✅ Done"         },
          { action: "snooze",    title: "⏰ Snooze 1 hr"  },
          { action: "pick-time", title: "📅 Pick new time" }
        ]
      : (payload.actions || [])
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .catch((err) => console.error("[SW] showNotification failed:", err))
  );
});

self.addEventListener("notificationclick", (event) => {
  const action = event.action;           // "done" | "snooze" | "pick-time" | ""
  const taskId = event.notification.data?.taskId;
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        const appClient = windowClients.find((c) =>
          c.url.includes(self.location.origin)
        );

        // Actions that need the app to handle task state
        if (action === "done" || action === "snooze" || action === "pick-time") {
          if (appClient && "focus" in appClient) {
            // App is open — send a message and focus the window
            appClient.postMessage({ type: "NOTIFICATION_ACTION", action, taskId });
            return appClient.focus();
          }
          // App is closed — open with URL params so it can apply the action on load
          return clients.openWindow(
            `/?task_action=${action}&task_id=${encodeURIComponent(taskId || "")}`
          );
        }

        // Default click: focus existing window or open app
        if (appClient && "focus" in appClient) {
          return appClient.focus();
        }
        const url = event.notification.data?.url || "/";
        return clients.openWindow(url);
      })
  );
});
