// Kintsugi Health OS - service worker.
//
// Privacy-aware by design: we cache only the offline shell and same-origin
// static assets. We NEVER cache navigation HTML (which can contain private
// health data), API responses, or anything from Supabase / other origins.
const CACHE = "kintsugi-static-v1";
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave Supabase / cross-origin alone
  if (url.pathname.startsWith("/api")) return; // never touch API routes

  // Navigations: network-first, fall back to the offline shell when offline.
  // Private page HTML is never written to the cache.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Static assets only: cache-first, then network (and cache the result).
  const isStatic =
    url.pathname.startsWith("/_next/static") ||
    url.pathname.startsWith("/icons") ||
    url.pathname === "/manifest.webmanifest";
  if (!isStatic) return;

  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
          return res;
        }),
    ),
  );
});
