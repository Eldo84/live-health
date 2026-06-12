// Minimal service worker: exists so the app passes PWA installability checks
// in browsers that still require one (older Chrome/Edge, Samsung Internet).
// Deliberately does NOT cache or intercept anything — a caching SW that serves
// stale bundles is far worse than no SW at all.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// No-op fetch handler: present only to satisfy installability heuristics.
self.addEventListener("fetch", () => {});
