/* LyricsCloud caches only immutable, content-addressed framework assets. */
const CACHE_PREFIX = "lyricscloud-shell-";
const CACHE_NAME = `${CACHE_PREFIX}0.9.0-p3-1`;
const STATIC_PATH = "/_next/static/";

function contentAddressed(pathname) {
  return pathname.slice(STATIC_PATH.length).split("/").some((segment) => {
    const stem = segment.replace(/\.[^.]+$/, "");
    return stem.length >= 8 && /^[a-z0-9_-]+$/i.test(stem);
  });
}

function staticAssetUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin
      && url.pathname.startsWith(STATIC_PATH)
      && contentAddressed(url.pathname)
      && !url.search;
  } catch {
    return false;
  }
}

async function cacheAsset(cache, value) {
  if (!staticAssetUrl(value)) return;
  const request = new Request(value, { credentials: "same-origin", cache: "reload" });
  const response = await fetch(request);
  const policy = response.headers.get("cache-control") || "";
  if (response.ok && /(?:^|,)\s*public\b/i.test(policy) && /\bimmutable\b/i.test(policy) && !response.headers.has("set-cookie")) {
    await cache.put(request, response);
  }
}

self.addEventListener("install", () => {
  // An existing worker stays active until the user approves the waiting update.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data?.type !== "PRECACHE_STATIC" || !Array.isArray(event.data.urls)) return;
  const urls = [...new Set(event.data.urls)].slice(0, 512);
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => Promise.allSettled(urls.map((url) => cacheAsset(cache, url)))));
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || !staticAssetUrl(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    const policy = response.headers.get("cache-control") || "";
    if (response.ok && /(?:^|,)\s*public\b/i.test(policy) && /\bimmutable\b/i.test(policy) && !response.headers.has("set-cookie")) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
