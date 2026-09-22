/* LyricsCloud caches only immutable, content-addressed framework assets. */
const CACHE_PREFIX = "lyricscloud-shell-";
const BUILD_ID = new URL(self.location.href).searchParams.get("build") || "unknown";
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 128)}`;
const STATIC_PATH = "/_next/static/";
const CONTENT_ADDRESSED_FONT = /^\/fonts\/[A-Za-z0-9_-]+\.[0-9a-f]{8,64}\.(?:otf|woff2)$/i;
const staticAssetLoads = new Map();
// Unknown/unresponsive (including pre-protocol) tabs pin all earlier builds.
// This map may be lost on worker restart: missing reports must never imply consent.
const clientBuilds = new Map();

function buildCacheName(build) {
  return `${CACHE_PREFIX}${build.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 128)}`;
}

async function collectUnusedBuilds() {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  const live = new Set(clients.map((client) => client.id));
  for (const id of clientBuilds.keys()) if (!live.has(id)) clientBuilds.delete(id);
  if (clients.some((client) => !clientBuilds.has(client.id))) return;
  const retained = new Set([CACHE_NAME, ...clients.map((client) => buildCacheName(clientBuilds.get(client.id)))]);
  const names = await caches.keys();
  await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && !retained.has(name)).map((name) => caches.delete(name)));
}

async function matchRetainedAsset(cache, request) {
  const current = await cache.match(request);
  if (current) return current;
  // Only called after the public content-addressed URL allowlist check.
  for (const name of await caches.keys()) {
    if (!name.startsWith(CACHE_PREFIX) || name === CACHE_NAME) continue;
    const response = await (await caches.open(name)).match(request);
    if (response) return response;
  }
}

function contentAddressed(pathname) {
  return pathname.slice(STATIC_PATH.length).split("/").some((segment) => {
    const stem = segment.replace(/\.[^.]+$/, "");
    return stem.length >= 8 && /^[a-z0-9_-]+$/i.test(stem);
  });
}

function cacheableAssetUrl(value) {
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin
      && ((url.pathname.startsWith(STATIC_PATH) && contentAddressed(url.pathname)) || CONTENT_ADDRESSED_FONT.test(url.pathname))
      && !url.search;
  } catch {
    return false;
  }
}

async function cacheAsset(cache, value) {
  if (!cacheableAssetUrl(value)) return;
  const url = new URL(value, self.location.origin);
  url.hash = "";
  if (staticAssetLoads.has(url.href)) return staticAssetLoads.get(url.href);
  const load = (async () => {
    const request = new Request(url.href, { credentials: "same-origin" });
    if (await cache.match(request)) return;
    const response = await fetch(request);
    const policy = response.headers.get("cache-control") || "";
    if (response.ok && /(?:^|,)\s*public\b/i.test(policy) && /\bimmutable\b/i.test(policy) && !response.headers.has("set-cookie")) {
      await cache.put(request, response);
    }
  })();
  staticAssetLoads.set(url.href, load);
  try { await load; }
  finally { staticAssetLoads.delete(url.href); }
}

self.addEventListener("install", () => {
  // An existing worker stays active until the user approves the waiting update.
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clients) client.postMessage({ type: "REPORT_CLIENT_BUILD" });
    await collectUnusedBuilds();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "CLIENT_BUILD") {
    if (!event.source?.id || typeof event.data.buildId !== "string" || !event.data.buildId) return;
    clientBuilds.set(event.source.id, event.data.buildId);
    event.waitUntil(collectUnusedBuilds());
    return;
  }
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
  if (request.method !== "GET" || !cacheableAssetUrl(request.url)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await matchRetainedAsset(cache, request);
    if (cached) return cached;
    const response = await fetch(request);
    const policy = response.headers.get("cache-control") || "";
    if (response.ok && /(?:^|,)\s*public\b/i.test(policy) && /\bimmutable\b/i.test(policy) && !response.headers.has("set-cookie")) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
