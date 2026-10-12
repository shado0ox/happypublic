const CACHE = __CACHE__;
const FILES = __FILES__;
self.addEventListener("install", (event) =>
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES))),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const previous = (await caches.keys()).filter(
        (name) => name.startsWith("happy-shell-") && name !== CACHE,
      );
      // Retain the preceding shell for other tabs that still use its lazy chunks.
      for (const name of previous.slice(0, -1)) await caches.delete(name);
      await self.clients.claim();
    })(),
  ),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "APPLY_UPDATE") self.skipWaiting();
});
self.addEventListener("fetch", (event) => {
  const request = event.request,
    url = new URL(request.url);
  // Never cache API responses, authentication, mutations or third-party requests.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/")
  )
    return;
  if (request.mode === "navigate") {
    // The installed shell opens immediately; a new build is applied explicitly.
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) => (await cache.match("/index.html")) || fetch(request),
        ),
    );
  } else if (
    FILES.includes(url.pathname) ||
    url.pathname.startsWith("/assets/")
  ) {
    event.respondWith(
      caches
        .open(CACHE)
        .then(
          async (cache) =>
            (await cache.match(url.pathname)) ||
            (await caches.match(url.pathname)) ||
            fetch(request),
        ),
    );
  }
});
