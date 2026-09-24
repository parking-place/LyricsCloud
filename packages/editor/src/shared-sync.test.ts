import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { createBrowserSharedLyricSync, type BrowserSharedLyricSync, type SharedLyricAccess,
  type SharedLyricSyncState } from "./browser-sync.js";
import { createLyricDocument, lyricBody } from "./crdt.js";
import type { LocalDocument, QueuedUpdate, RejectedWriterDraft } from "./sync-storage.js";

const memory = vi.hoisted(() => ({ stores: new Map<string, any>(), failures: 0 }));

vi.mock("./sync-storage.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sync-storage.js")>();
  class Table<T extends object> {
    rows = new Map<string, T>();
    constructor(private key: keyof T) {}
    async get(key: string) { return this.rows.get(key); }
    async put(row: T) { this.rows.set(String(row[this.key]), row); }
    async delete(key: string) { this.rows.delete(key); }
    async bulkDelete(keys: readonly string[]) { for (const key of keys) this.rows.delete(key); }
    where(field: keyof T) {
      return { equals: (value: unknown) => {
        const matches = () => [...this.rows.values()].filter((row) => row[field] === value);
        const query = {
          toArray: async () => matches(), first: async () => matches()[0], count: async () => matches().length,
          delete: async () => { for (const row of matches()) this.rows.delete(String(row[this.key])); },
          reverse: () => query,
          sortBy: async (key: keyof T) => matches().sort((a, b) => String(b[key]).localeCompare(String(a[key])))
        };
        return query;
      } };
    }
  }
  class MemoryStorage {
    documents = new Table<LocalDocument>("resourceId");
    updates = new Table<QueuedUpdate>("updateId");
    rejected = new Table<RejectedWriterDraft>("updateId");
    constructor(name: string) {
      if (memory.stores.has(name)) return memory.stores.get(name);
      memory.stores.set(name, this);
    }
    async transaction(...args: unknown[]) {
      if (memory.failures > 0) { memory.failures -= 1; throw new Error("QuotaExceededError"); }
      return (args.at(-1) as () => Promise<unknown>)();
    }
    persist = actual.SyncStorage.prototype.persist;
    rejectWriterEpoch = actual.SyncStorage.prototype.rejectWriterEpoch;
    on() {}
    close() {}
  }
  return { ...actual, SyncStorage: MemoryStorage };
});

class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = Socket.OPEN;
  sent: Array<Record<string, any>> = [];
  onmessage?: (event: { data: string }) => void;
  onclose?: (event: { code: number }) => void;
  constructor(_url: URL) { Socket.instances.push(this); }
  send(value: string) { this.sent.push(JSON.parse(value)); }
  receive(message: object) { this.onmessage?.({ data: JSON.stringify(message) }); }
  close(code = 1000) { this.readyState = 3; this.onclose?.({ code }); }
}

const resourceId = "11700000-0000-4000-8000-000000000001";
const documentKey = "11700000-0000-4000-8000-000000000002";
const access: SharedLyricAccess = { mode: "write", grantId: "11700000-0000-4000-8000-000000000003",
  permissionEpoch: 1, writeEpoch: 1 };
const wireAccess = { access: "write", grantId: access.grantId, permissionEpoch: 1, writeEpoch: 1 };
let active: BrowserSharedLyricSync | undefined;

beforeEach(() => {
  memory.stores.clear(); memory.failures = 0; Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("BroadcastChannel", class { onmessage?: (event: unknown) => void; postMessage() {} close() {} });
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("location", { origin: "http://127.0.0.1:3000", protocol: "http:" });
  vi.stubGlobal("fetch", async () => ({ ok: true, status: 200,
    json: async () => ({ documentKey, ...wireAccess }) }));
});
afterEach(async () => { await active?.destroy(); active = undefined; vi.unstubAllGlobals(); });

async function start() {
  let body = "base";
  let state: SharedLyricSyncState = "connecting";
  let ready = false;
  let drafts: readonly RejectedWriterDraft[] = [];
  const readiness: boolean[] = [];
  active = await createBrowserSharedLyricSync({ actorId: "synthetic-actor", resourceId, initialAccess: access,
    onBody(value) { body = value; }, onStateChange(value) { state = value; }, onAccessChange() {},
    onReadinessChange(value) { ready = value; readiness.push(value); }, onPresenceChange() {},
    onRejectedDrafts(value) { drafts = value; } });
  return { get body() { return body; }, get state() { return state; }, get ready() { return ready; },
    get drafts() { return drafts; }, readiness };
}

function snapshot(body = "base") {
  const document = createLyricDocument(body);
  try { return { type: "snapshot", ...wireAccess, payload: Buffer.from(Y.encodeStateAsUpdate(document)).toString("base64") }; }
  finally { document.destroy(); }
}

describe("selected shared writer readiness and local durability", () => {
  it("keeps first-load input disabled until the actual snapshot and local handle are ready", async () => {
    let resolveFetch!: (value: object) => void;
    vi.stubGlobal("fetch", () => new Promise((resolve) => { resolveFetch = resolve; }));
    const view = await start();
    expect(view.ready).toBe(false);
    active!.applyLocalTransaction({ origin: "user", composing: false, changes: [{ from: 4, to: 4, insert: " LOST" }] });
    expect(view.body).toBe("base");
    resolveFetch({ ok: true, status: 200, json: async () => ({ documentKey, ...wireAccess }) });
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    expect(view.ready).toBe(false);
    Socket.instances[0]!.receive(snapshot());
    await vi.waitFor(() => expect(view.ready).toBe(true));
    expect(view.body).toBe("base");
    expect(view.readiness).toEqual([true]);
  });

  it("never reports live after a failed local transaction and requeues the exact edit on retry", async () => {
    const view = await start();
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    const socket = Socket.instances[0]!;
    const initial = snapshot();
    socket.receive(initial);
    await vi.waitFor(() => expect(view.ready).toBe(true));
    memory.failures = 1;
    active!.applyLocalTransaction({ origin: "user", composing: false, changes: [{ from: 4, to: 4, insert: " LOCAL" }] });
    await vi.waitFor(() => expect(view.state).toBe("error"));
    expect(view.ready).toBe(false);
    expect(view.drafts.map((draft) => draft.authoredText)).toEqual([" LOCAL"]);
    expect(view.drafts[0]?.reason).toBe("storage-failed");
    expect(socket.sent.filter((message) => message.type === "update")).toHaveLength(0);
    active!.retry();
    await vi.waitFor(() => expect(view.ready).toBe(true));
    await vi.waitFor(() => expect(socket.sent.filter((message) => message.type === "update")).toHaveLength(1));
    const update = socket.sent.find((message) => message.type === "update")!;
    const restored = createLyricDocument();
    try {
      Y.applyUpdate(restored, Buffer.from(initial.payload, "base64"));
      Y.applyUpdate(restored, Buffer.from(update.payload, "base64"));
      expect(lyricBody(restored).toString()).toContain(" LOCAL");
    } finally { restored.destroy(); }
    expect(view.drafts).toHaveLength(0);
  });

  it("does not enable writing when the first snapshot cannot be saved locally", async () => {
    const view = await start();
    await vi.waitFor(() => expect(Socket.instances).toHaveLength(1));
    memory.failures = 1;
    Socket.instances[0]!.receive(snapshot());
    await vi.waitFor(() => expect(view.state).toBe("error"));
    expect(view.ready).toBe(false);
    active!.retry();
    await vi.waitFor(() => expect(view.ready).toBe(true));
  });
});
