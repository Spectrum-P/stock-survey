const CACHE = "stock-survey-static-v2";
const PRE_CACHE = ["/offline.html", "/icons/stock-condition-192.svg", "/icons/stock-condition-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRE_CACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html")));
    return;
  }
  if (event.request.destination !== "image" && event.request.destination !== "style" && event.request.destination !== "script" && event.request.destination !== "font") return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    if (!response.ok || response.type === "opaque") return response;
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});

self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() ?? {}; } catch { payload = { body: event.data?.text() }; }
  event.waitUntil(self.registration.showNotification(payload.title ?? "Report ready", {
    body: payload.body ?? "Your stock condition report is ready to review.",
    icon: "/icons/stock-condition-192.svg",
    badge: "/icons/stock-condition-192.svg",
    tag: payload.reportId ? `report-${payload.reportId}` : "report-ready",
    data: { url: payload.url ?? "/reports" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/reports", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
    const existing = clients.find((client) => client.url === target);
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  }));
});
