self.addEventListener("push", (event) => {
  console.log("[SW] push event received", event.data ? "with data" : "no data");

  if (!event.data) {
    console.log("[SW] no data, showing default notification");
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

  console.log("[SW] showing notification:", payload.title || "Focus Tasks");

  const title = payload.title || "Focus Tasks";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "focus-tasks",
    data: payload.data || {},
    requireInteraction: payload.requireInteraction || false,
    actions: payload.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => console.log("[SW] notification shown"))
      .catch((err) => console.error("[SW] showNotification failed:", err))
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});
