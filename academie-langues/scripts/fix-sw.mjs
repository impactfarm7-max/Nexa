/**
 * Post-build : remplace complètement le sw.js généré par workbox
 * par un service worker minimal dédié aux push notifications.
 * Le SW workbox cause des erreurs "bad-precaching-response" en prod
 * car certains fichiers Next.js internes ne sont pas publiquement accessibles.
 */
import { writeFileSync } from "fs";

const SW_PATH = "public/sw.js";

const MINIMAL_SW = `
// NEXA — Service Worker (push notifications uniquement)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try { payload = event.data.json(); }
  catch { payload = { title: "NEXA", body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/apple-touch-icon.png",
      badge: "/favicon-32x32.png",
      data: { url: payload.url || "/dashboard" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/dashboard";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            client.focus();
            client.navigate(targetUrl);
            return;
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
`.trim();

writeFileSync(SW_PATH, MINIMAL_SW, "utf-8");
console.log("✓ sw.js remplacé par le service worker minimal (push uniquement).");
