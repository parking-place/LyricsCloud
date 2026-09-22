import { readFileSync } from "node:fs";
import vm from "node:vm";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../../apps/web/public/sw.js", import.meta.url), "utf8");
const origin = "https://lyrics.example";
const asset = `${origin}/_next/static/chunks/app-1234abcd.js`;
const immutable = () => new Response("asset", { headers: { "cache-control": "public, max-age=31536000, immutable" } });

function worker(build = "build-a", stores = new Map<string, Map<string, Response>>(), fetchAsset = vi.fn(async () => immutable()), clients: { id: string; postMessage: ReturnType<typeof vi.fn> }[] = []) {
  const listeners = new Map<string, (event: unknown) => void>();
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
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
    self: { location: { origin, href: `${origin}/sw.js?build=${build}` }, clients: { matchAll: async () => clients, claim: async () => undefined }, addEventListener: (type: string, listener: (event: unknown) => void) => listeners.set(type, listener) },
    caches, URL, Request, fetch: fetchAsset
  });
  return {
    fetchAsset, stores,
    activate() {
      let pending: Promise<unknown> = Promise.resolve();
      listeners.get("activate")!({ waitUntil: (work: Promise<unknown>) => { pending = work; } });
      return pending;
    },
    report(clientId: string, clientBuild: string) {
      let pending: Promise<unknown> = Promise.resolve();
      listeners.get("message")!({ source: { id: clientId }, data: { type: "CLIENT_BUILD", buildId: clientBuild }, waitUntil: (work: Promise<unknown>) => { pending = work; } });
      return pending;
    },
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
  it("PWA-01 retains an old tab's lazy chunk through a second worker build and offline activation", async () => {
    const clients = [{ id: "dirty-old-tab", postMessage: vi.fn() }, { id: "approved-tab", postMessage: vi.fn() }];
    const first = worker("build-a", undefined, undefined, clients);
    await first.precache([asset]);
    const network = vi.fn(async () => { throw new Error("old build unavailable offline or after deployment"); });
    const second = worker("build-b", first.stores, network, clients);
    await second.activate();
    await second.report("approved-tab", "build-b");
    expect(await (await second.request(asset))!.text()).toBe("asset");
    await second.report("dirty-old-tab", "build-a");
    expect(await (await second.request(asset))!.text()).toBe("asset");
    expect(network).not.toHaveBeenCalled();
    expect(first.stores.has("lyricscloud-shell-build-a")).toBe(true);
    // Closing the old document permits collection on the next live build report.
    clients.shift();
    await second.report("approved-tab", "build-b");
    expect(first.stores.has("lyricscloud-shell-build-a")).toBe(false);
  });

  it("keeps unknown clients safe after worker restart and only collects its own caches", async () => {
    const stores = new Map([["lyricscloud-shell-build-a", new Map([[asset, immutable()]])], ["unrelated-cache", new Map<string, Response>()]]);
    const clients = [{ id: "unknown-old-tab", postMessage: vi.fn() }];
    const restarted = worker("build-b", stores, undefined, clients);
    await restarted.activate();
    expect(stores.has("lyricscloud-shell-build-a")).toBe(true);
    await restarted.report("not-a-live-client", "build-b");
    expect(stores.has("lyricscloud-shell-build-a")).toBe(true);
    await restarted.report("unknown-old-tab", "build-b");
    expect(stores.has("lyricscloud-shell-build-a")).toBe(false);
    expect(stores.has("unrelated-cache")).toBe(true);
    expect(restarted.request(`${origin}/lyrics/private`)).toBeUndefined();
    expect(restarted.request(`${origin}/api/auth/session`)).toBeUndefined();
  });
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
