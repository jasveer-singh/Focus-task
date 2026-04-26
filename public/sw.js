self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Focus Tasks", body: event.data.text() };
  }

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

  event.waitUntil(self.registration.showNotification(title, options));
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
