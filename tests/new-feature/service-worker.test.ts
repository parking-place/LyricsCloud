import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../apps/web/public/sw.js", import.meta.url), "utf8");
const origin = "https://lyrics.example";
const asset = `${origin}/_next/static/chunks/app-1234abcd.js`;
const immutable = () => new Response("asset", { headers: { "cache-control": "public, max-age=31536000, immutable" } });

function worker(build = "build-a", stores = new Map<string, Map<string, Response>>(), fetchAsset = vi.fn(async () => immutable())) {
  const listeners = new Map<string, (event: unknown) => void>();
  const caches = {
    async open(name: string) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name)!;
      return {
        match: async (request: Request) => entries.get(request.url)?.clone(),
        put: async (request: Request, response: Response) => { entries.set(request.url, response); }
      };
    }
  };
  vm.runInNewContext(source, {
    self: { location: { origin, href: `${origin}/sw.js?build=${build}` }, addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener) },
    caches, URL, Request, fetch: fetchAsset
  });
  return {
    fetchAsset, stores,
    precache(urls: string[]) {
      let pending: Promise<unknown> = Promise.resolve();
      listeners.get("message")!({ data: { type: "PRECACHE_STATIC", urls }, waitUntil: (work: Promise<unknown>) => { pending = work; } });
      return pending;
    },
    request(url: string) {
      let pending: Promise<Response> | undefined;
      listeners.get("fetch")!({ request: new Request(url), respondWith: (work: Promise<Response>) => { pending = work; } });
      return pending;
    }
  };
}

describe("static asset precache", () => {
  it("reuses immutable cache entries across repeated messages and worker restarts", async () => {
    const first = worker();
    await first.precache([asset, asset]);
    await first.precache([asset]);
    expect(first.fetchAsset).toHaveBeenCalledTimes(1);
    expect(await (await first.request(asset))?.text()).toBe("asset");
    const restarted = worker("build-a", first.stores);
    await restarted.precache([asset]);
    expect(restarted.fetchAsset).not.toHaveBeenCalled();
    const nextBuild = worker("build-b", first.stores);
    await nextBuild.precache([asset]);
    expect(nextBuild.fetchAsset).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent messages until the fetch and cache write finish", async () => {
    const pending = Promise.withResolvers<Response>();
    const fetchAsset = vi.fn(() => pending.promise);
    const current = worker("build-a", undefined, fetchAsset);
    const first = current.precache([asset]);
    const second = current.precache([asset]);
    await vi.waitFor(() => expect(fetchAsset).toHaveBeenCalledTimes(1));
    pending.resolve(immutable());
    await Promise.all([first, second]);
    expect(fetchAsset).toHaveBeenCalledTimes(1);
  });

  it("retries failed fetches and never caches private, unsuccessful or cookie-setting responses", async () => {
    const fetchAsset = vi.fn(async () => immutable())
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response("private", { headers: { "cache-control": "private, immutable" } }))
      .mockResolvedValueOnce(new Response("failed", { status: 503, headers: { "cache-control": "public, immutable" } }))
      .mockResolvedValueOnce(new Response("cookie", { headers: { "cache-control": "public, immutable", "set-cookie": "test=1" } }));
    const current = worker("build-a", undefined, fetchAsset);
    for (let attempt = 0; attempt < 5; attempt++) await current.precache([asset]);
    expect(fetchAsset).toHaveBeenCalledTimes(5);
    expect(await (await current.request(asset))?.text()).toBe("asset");
    await current.precache([asset]);
    expect(fetchAsset).toHaveBeenCalledTimes(5);
  });

  it("leaves private routes, foreign origins and query-bearing URLs out of precache", async () => {
    const current = worker();
    await current.precache([`${origin}/api/songs`, `${origin}/lyrics/private`, `${asset}?private=1`, asset.replace(origin, "https://other.example")]);
    expect(current.fetchAsset).not.toHaveBeenCalled();
    expect(current.request(`${origin}/api/songs`)).toBeUndefined();
  });
});
