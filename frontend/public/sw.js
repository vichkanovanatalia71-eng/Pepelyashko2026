/* MedFlow Finance — Service Worker v3 (enhanced PWA) */
const CACHE_NAME = "medflow-v3";
const API_CACHE = "medflow-api-v1";
const OFFLINE_URL = "/offline.html";

// Assets to pre-cache on install
const PRECACHE = ["/", OFFLINE_URL];

// API routes that can be cached for offline viewing (GET only, read-only data)
const CACHEABLE_API = [
  "/api/monthly-expenses",
  "/api/services",
  "/api/nhsu",
  "/api/revenue",
  "/api/dashboard",
  "/api/staff",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API requests: network-first with stale cache fallback
  if (url.pathname.startsWith("/api/")) {
    const isCacheable = CACHEABLE_API.some((prefix) =>
      url.pathname.startsWith(prefix)
    );

    if (isCacheable) {
      event.respondWith(
        fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(API_CACHE).then((c) => c.put(request, clone));
            }
            return res;
          })
          .catch(() =>
            caches.open(API_CACHE).then((c) => c.match(request))
          )
      );
      return;
    }
    // Non-cacheable API — network only
    return;
  }

  // Navigation requests: network-first, fallback to offline page
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
    )
  );
});

// Listen for messages from the app (e.g., cache invalidation)
self.addEventListener("message", (event) => {
  if (event.data?.type === "CLEAR_API_CACHE") {
    caches.delete(API_CACHE);
  }
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
