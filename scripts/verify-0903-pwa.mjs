import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const sourceWorker = await readFile(new URL("apps/web/public/sw.js", root), "utf8");
const builtWorker = await readFile(new URL("apps/web/.next/standalone/apps/web/public/sw.js", root), "utf8");
assert.equal(builtWorker, sourceWorker, "standalone service worker must match the reviewed source");

const listeners = new Map();
const sandbox = {
  self: {
    location: { origin: "https://lyrics.example" },
    addEventListener(type, listener) { listeners.set(type, listener); },
    clients: { claim: async () => undefined },
    skipWaiting: async () => undefined
  },
  caches: { keys: async () => [], delete: async () => true, open: async () => ({}) },
  URL,
  Request,
  fetch
};
vm.runInNewContext(`${sourceWorker}\nthis.__staticAssetUrl = staticAssetUrl;`, sandbox);
const allowed = sandbox.__staticAssetUrl;
assert.equal(allowed("https://lyrics.example/_next/static/chunks/app-1234abcd.js"), true);
for (const rejected of [
  "https://lyrics.example/_next/static/chunks/runtime.js",
  "https://lyrics.example/_next/static/chunks/app-1234abcd.js?private=1",
  "https://lyrics.example/api/songs",
  "https://lyrics.example/lyrics/private-id",
  "https://other.example/_next/static/chunks/app-1234abcd.js"
]) assert.equal(allowed(rejected), false, `must not cache ${rejected}`);
assert.deepEqual([...listeners.keys()].sort(), ["activate", "fetch", "install", "message"]);

const manifest = JSON.parse(await readFile(new URL("apps/web/.next/server/app/manifest.webmanifest.body", root), "utf8"));
assert.equal(manifest.name, "LyricsCloud");
assert.equal(manifest.start_url, "/workspace");
assert.equal(manifest.scope, "/");
assert.equal(manifest.display, "standalone");
assert.equal(manifest.icons.some((icon) => icon.sizes === "192x192" && icon.purpose === "any"), true);
assert.equal(manifest.icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable"), true);

for (const [size, file] of [[192, "lyricscloud-192-0903.svg"], [512, "lyricscloud-512-0903.svg"]]) {
  const icon = await readFile(new URL(`apps/web/public/icons/${file}`, root), "utf8");
  assert.match(icon, new RegExp(`width="${size}" height="${size}"`));
}

const nextConfig = await readFile(new URL("apps/web/next.config.ts", root), "utf8");
for (const route of ["/auth", "/account/:path*", "/api/:path*", "/songs/:path*", "/lyrics/:path*", "/rhymes/:path*", "/prompts/:path*"]) {
  assert.equal(nextConfig.includes(`"${route}"`), true, `${route} must be private/no-store`);
}
console.log("0.9.0 Phase 3 PWA static and cache contract: OK");
