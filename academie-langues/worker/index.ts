/// <reference lib="webworker" />
export {};  // isole ce fichier en module pour éviter les conflits de déclaration

const sw = self as unknown as ServiceWorkerGlobalScope;

// ─── PUSH REÇU ────────────────────────────────────────────────────────────────
sw.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload: { title: string; body: string; url?: string; icon?: string };
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "NEXA", body: event.data.text() };
  }

  event.waitUntil(
    sw.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/apple-touch-icon.png",
      badge: "/favicon-32x32.png",
      data: { url: payload.url || "/dashboard" },
    } as NotificationOptions)
  );
});

// ─── CLIC SUR LA NOTIFICATION ─────────────────────────────────────────────────
sw.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    sw.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        // Si une fenêtre est déjà ouverte → focus + navigation
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        // Sinon → ouvrir un nouvel onglet
        return sw.clients.openWindow(targetUrl);
      })
  );
});
