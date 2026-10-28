// Offline support: pages, photos and map tiles you've already looked at stay readable without signal.
// Everything is kept in this browser's cache only. Nothing is prefetched in bulk.
const VERSION = "v1";
const PAGES = `pages-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const TILES = `tiles-${VERSION}`;
const OFFLINE_URL = "/offline";
const LIMITS = { [PAGES]: 80, [ASSETS]: 400, [TILES]: 600 };

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.addAll([OFFLINE_URL, "/", "/map"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !(k in LIMITS)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin === "https://tile.openstreetmap.org") {
    event.respondWith(cacheFirst(request, TILES));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Build files and photos never change under the same URL, so the cached copy is always right.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/photos/")) {
    event.respondWith(cacheFirst(request, ASSETS));
    return;
  }
  // Pages (and Next's page data requests): fresh when online, the saved copy when not.
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    await cache.put(request, response.clone());
    trim(name);
  }
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(PAGES);
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      await cache.put(request, response.clone());
      trim(PAGES);
    }
    return response;
  } catch (error) {
    const hit = await cache.match(request);
    if (hit) return hit;
    if (request.mode === "navigate") {
      const offline = await cache.match(OFFLINE_URL);
      if (offline) return offline;
    }
    throw error;
  }
}

// Drop the oldest entries once a cache grows past its limit.
async function trim(name) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  const extra = keys.length - LIMITS[name];
  for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
}
