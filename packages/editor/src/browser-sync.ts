import { Dexie } from "dexie";
import * as Y from "yjs";
import type { CheckpointReason, LyricRevision, RestoreRevisionInput, RevisionHistory } from "@lyricscloud/domain";
import type { EditorDocumentTransaction, EditorTextChange } from "./codemirror.js";
import { createLyricDocument, lyricBody } from "./crdt.js";
import { SyncStorage, type QueuedUpdate } from "./sync-storage.js";

export type LocalSyncState = "loading" | "saving-local" | "ready" | "local" | "syncing" | "projection" | "offline" | "error" | "unavailable" | "conflict";
export interface BrowserLyricSync {
  applyLocalTransaction(transaction: EditorDocumentTransaction): void;
  setComposing(composing: boolean): void;
  flush(): Promise<boolean>;
  checkpoint(reason: Exclude<CheckpointReason, "interval">): Promise<boolean>;
  leave(): void;
  listRevisions(): Promise<RevisionHistory>;
  getRevision(id: string): Promise<LyricRevision>;
  restoreRevision(id: string, input: RestoreRevisionInput): Promise<void>;
  retry(): void;
  destroy(): Promise<void>;
}
export type BrowserRhymeSync = BrowserLyricSync;
export type BrowserEditableSyncOptions = {
  ownerId: string; resourceId: string; initialBody: string;
  onRemoteBody: (body: string, changes?: readonly EditorTextChange[]) => void;
  onStateChange: (state: LocalSyncState) => void;
  onEditableChange?: (editable: boolean) => void;
  onLegacyConflict?: (draft: { localBody: string; serverBody: string }) => void;
};
const localOrigin = Symbol("lyricscloud-local");
const remoteOrigin = Symbol("lyricscloud-remote");

export async function createBrowserLyricSync(options: BrowserEditableSyncOptions): Promise<BrowserLyricSync> {
  options.onStateChange("loading");
  options.onEditableChange?.(false);
  const prefix = await ownerPrefix(options.ownerId);
  const storage = new SyncStorage(`${prefix}sync-v2`);
  const document = createLyricDocument();
  const text = lyricBody(document);
  const accountChannel = new BroadcastChannel(prefix);
  let channel: BroadcastChannel | undefined;
  let documentKey = "";
  let socket: WebSocket | undefined;
  let initialized = false;
  let connected = false;
  let destroyed = false;
  let composing = false;
  let pumping = false;
  let pumpAgain = false;
  let connecting = false;
  let pendingWrites = 0;
  let inFlight: string | undefined;
  let projectionPending = false;
  let halted: "error" | "unavailable" | "conflict" | undefined;
  let state: LocalSyncState = "loading";
  let legacyBody: string | null = null;
  let retryDelay = 500;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let ackTimer: ReturnType<typeof setTimeout> | undefined;
  let writes = Promise.resolve();
  const remoteQueue: Uint8Array[] = [];
  const waiters = new Set<(saved: boolean) => void>();
  const abort = new AbortController();

  function emit(next: LocalSyncState) {
    state = next;
    if (destroyed) return;
    options.onStateChange(next);
    options.onEditableChange?.(initialized && !halted);
    if (next === "ready") for (const resolve of waiters) resolve(true);
    if (halted || next === "offline") for (const resolve of waiters) resolve(false);
  }
  function fail(reason: typeof halted) {
    halted = reason;
    socket?.close();
    emit(reason ?? "error");
  }
  async function report() {
    if (destroyed) return;
    if (halted) return emit(halted);
    if (!initialized) return emit("loading");
    if (pendingWrites) return emit("saving-local");
    if (!navigator.onLine) return emit("offline");
    if (!connected) return emit("local");
    const queued = await storage.updates.where("documentKey").equals(documentKey).count();
    if (destroyed || halted || pendingWrites || !connected) return;
    emit(queued ? "syncing" : projectionPending ? "projection" : "ready");
  }
  function persist(update?: Uint8Array) {
    if (!initialized || destroyed) return;
    const snapshot = Y.encodeStateAsUpdate(document);
    const queued: QueuedUpdate | undefined = update ? { documentKey, updateId: crypto.randomUUID(), payload: update } : undefined;
    pendingWrites++;
    emit("saving-local");
    writes = writes.then(() => storage.persist({ resourceId: options.resourceId, documentKey, snapshot }, queued))
      .catch(() => { fail("error"); })
      .finally(() => { pendingWrites--; });
    void writes.then(() => pump()).catch(() => fail("error"));
  }
  text.observe((event, transaction) => {
    if (initialized && transaction.origin !== localOrigin) {
      let offset = 0;
      const changes: EditorTextChange[] = [];
      for (const delta of event.delta) {
        if (delta.retain) offset += delta.retain;
        if (delta.delete) { changes.push({ from: offset, to: offset + delta.delete, insert: "" }); offset += delta.delete; }
        if (typeof delta.insert === "string") changes.push({ from: offset, to: offset, insert: delta.insert });
      }
      options.onRemoteBody(text.toString(), changes);
    }
  });
  document.on("update", (update: Uint8Array, origin: unknown) => {
    if (!initialized) return;
    persist(origin === localOrigin ? update : undefined);
    if (origin === localOrigin) channel?.postMessage(update);
  });
  function applyRemote(update: Uint8Array) {
    if (composing) remoteQueue.push(update);
    else Y.applyUpdate(document, update, remoteOrigin);
  }
  async function pump() {
    if (destroyed || halted) return;
    if (pumping) { pumpAgain = true; return; }
    pumping = true;
    try {
      await writes;
      if (connected && socket?.readyState === WebSocket.OPEN && !inFlight) {
        const next = await storage.updates.where("documentKey").equals(documentKey).first();
        if (next && connected && !destroyed && socket.readyState === WebSocket.OPEN) {
          inFlight = next.updateId;
          socket.send(JSON.stringify({ type: "update", updateId: next.updateId, payload: encode(next.payload) }));
          // Reconnect after a lost ACK and resend the same durable ID.
          ackTimer = setTimeout(() => socket?.close(), 8_000);
        }
      }
      await report();
    } catch { fail("error"); }
    finally {
      pumping = false;
      if (pumpAgain) { pumpAgain = false; void pump(); }
    }
  }
  async function receive(raw: string) {
    const message = JSON.parse(raw) as { type: string; payload?: string; updateId?: string; projection?: string };
    if (destroyed || halted) return;
    if (message.type === "snapshot" && message.payload) {
      const update = decode(message.payload);
      if (!initialized) {
        Y.applyUpdate(document, update, remoteOrigin);
        if (legacyBody !== null && legacyBody !== text.toString()) {
          options.onLegacyConflict?.({ localBody: legacyBody, serverBody: text.toString() });
          return fail("conflict");
        }
        initialized = true;
        options.onRemoteBody(text.toString());
        persist();
      } else applyRemote(update);
      connected = true;
      projectionPending = message.projection === "pending";
      retryDelay = 500;
      await pump();
    } else if (message.type === "update" && message.payload) {
      applyRemote(decode(message.payload));
    } else if (message.type === "ack" && message.updateId === inFlight) {
      clearTimeout(ackTimer);
      await storage.updates.where("updateId").equals(message.updateId!).delete();
      inFlight = undefined;
      projectionPending = message.projection === "pending";
      await pump();
    } else if (message.type === "projection") {
      projectionPending = message.projection === "pending";
      await report();
    }
  }
  function reconnect() {
    if (destroyed || halted || !navigator.onLine || retryTimer) return;
    retryTimer = setTimeout(() => { retryTimer = undefined; void connect(); }, retryDelay);
    retryDelay = Math.min(30_000, retryDelay * 2);
  }
  async function connect() {
    if (destroyed || halted || connecting || !navigator.onLine || (socket && socket.readyState <= WebSocket.OPEN)) return;
    connecting = true;
    try {
      const response = await fetch(`/collaboration/documents/${options.resourceId}`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10_000)])
      });
      if (destroyed) return;
      if ([401, 403, 404].includes(response.status)) return fail("unavailable");
      if (!response.ok) throw new Error("SYNC_CONNECT_FAILED");
      const result = await response.json() as { documentKey: string };
      if (!/^[0-9a-f-]{36}$/i.test(result.documentKey)) throw new Error("SYNC_CONNECT_FAILED");
      if (documentKey && documentKey !== result.documentKey) return fail("conflict");
      documentKey = result.documentKey;
      if (!channel) {
        channel = new BroadcastChannel(`${prefix}${documentKey}`);
        channel.onmessage = (event: MessageEvent<Uint8Array>) => {
          if (event.data instanceof Uint8Array && !halted) applyRemote(event.data);
        };
      }
      const url = new URL(`/collaboration/sync/${documentKey}`, location.origin);
      url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
      const current = new WebSocket(url);
      socket = current;
      let messages = Promise.resolve();
      current.onmessage = (event: MessageEvent<string>) => {
        messages = messages.then(() => receive(event.data)).catch(() => fail("error"));
      };
      current.onclose = (event) => {
        if (socket !== current) return;
        connected = false;
        inFlight = undefined;
        clearTimeout(ackTimer);
        if (event.code === 4404) return fail("unavailable");
        if (event.code === 4400) return fail("error");
        void report().catch(() => fail("error"));
        reconnect();
      };
      current.onerror = () => current.close();
    } catch {
      void report().catch(() => fail("error"));
      reconnect();
    } finally { connecting = false; }
  }
  function online() { clearTimeout(retryTimer); retryTimer = undefined; retryDelay = 500; void connect(); }
  function offline() { connected = false; socket?.close(); void report().catch(() => fail("error")); }
  async function destroy() {
    if (destroyed) return;
    destroyed = true;
    abort.abort();
    clearTimeout(retryTimer);
    clearTimeout(ackTimer);
    socket?.close();
    channel?.close();
    accountChannel.close();
    window.removeEventListener("online", online);
    window.removeEventListener("offline", offline);
    for (const resolve of waiters) resolve(false);
    await writes;
    storage.close();
    document.destroy();
  }
  accountChannel.onmessage = () => { fail("unavailable"); void destroy(); };
  storage.on("versionchange", () => { fail("unavailable"); void destroy(); });
  window.addEventListener("online", online);
  window.addEventListener("offline", offline);
  async function flush(): Promise<boolean> {
    await writes;
    if (halted || composing || !navigator.onLine || destroyed) return false;
    if (state === "ready") return true;
    return new Promise<boolean>((resolve) => {
      const finish = (saved: boolean) => { clearTimeout(timer); waiters.delete(finish); resolve(saved); };
      const timer = setTimeout(() => finish(false), 8_000);
      waiters.add(finish);
      void pump();
    });
  }
  async function revisionRequest<T>(path = "", input?: unknown): Promise<T> {
    if (!documentKey || halted || destroyed || !navigator.onLine) throw new Error("REVISION_UNAVAILABLE");
    const response = await fetch(`/collaboration/documents/${documentKey}/revisions${path}`, {
      method: input ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
      ...(input ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}),
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10_000)])
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(error.error ?? "REVISION_UNAVAILABLE");
    }
    return response.json() as Promise<T>;
  }
  try {
    const cached = await storage.documents.get(options.resourceId);
    if (cached) {
      documentKey = cached.documentKey;
      Y.applyUpdate(document, cached.snapshot, remoteOrigin);
      initialized = true;
      options.onRemoteBody(text.toString());
      await report();
    } else {
      legacyBody = await readLegacyDraft(`${prefix}${await digest(options.resourceId)}`);
    }
    void connect();
  } catch { fail("error"); }
  return {
    applyLocalTransaction(transaction) {
      if (!initialized || halted || transaction.origin !== "user" || transaction.composing || !transaction.changes.length) return;
      document.transact(() => {
        for (const change of [...transaction.changes].sort((left, right) => right.from - left.from)) {
          if (change.to > change.from) text.delete(change.from, change.to - change.from);
          if (change.insert) text.insert(change.from, change.insert);
        }
      }, localOrigin);
    },
    setComposing(value) {
      composing = value;
      if (!value) for (const update of remoteQueue.splice(0)) applyRemote(update);
    },
    flush,
    async checkpoint(reason) {
      if (!await flush()) return false;
      try { await revisionRequest("", { reason }); return true; } catch { return false; }
    },
    leave() {
      // Browsers may terminate pagehide work. Capture the durable server state;
      // unacknowledged edits remain in the existing local outbox for reconnect.
      if (!documentKey || halted || destroyed || !navigator.onLine) return;
      void fetch(`/collaboration/documents/${documentKey}/revisions`, { method: "POST", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "leave" }) }).catch(() => undefined);
    },
    listRevisions() { return revisionRequest<RevisionHistory>(); },
    getRevision(id) { return revisionRequest<LyricRevision>(`/${id}`); },
    async restoreRevision(id, input) {
      if (!await flush()) throw new Error("REVISION_UNAVAILABLE");
      const result = await revisionRequest<{ payload: string }>(`/${id}/restore`, input);
      applyRemote(decode(result.payload));
      projectionPending = false;
      await writes;
      await report();
      if (halted) throw new Error("REVISION_LOCAL_SAVE_FAILED");
    },
    retry() {
      if (halted === "conflict" || destroyed) return;
      if (halted === "error") { halted = undefined; persist(Y.encodeStateAsUpdate(document)); }
      // Revalidate the owner and document after a user completes login again.
      if (halted === "unavailable") halted = undefined;
      online();
      void pump();
    },
    destroy
  };
}

/** Rhyme notes reuse the owner-scoped text/outbox protocol; the server validates the resource subtype. */
export function createBrowserRhymeSync(options: BrowserEditableSyncOptions): Promise<BrowserRhymeSync> {
  return createBrowserLyricSync(options);
}

export async function clearOwnerLocalDrafts(ownerId: string): Promise<void> {
  const prefix = await ownerPrefix(ownerId);
  const channel = new BroadcastChannel(prefix);
  channel.postMessage("clear");
  channel.close();
  for (const name of await Dexie.getDatabaseNames()) if (name.startsWith(prefix)) await Dexie.delete(name);
}
export async function hasOwnerPendingDrafts(ownerId: string): Promise<boolean> {
  const name = `${await ownerPrefix(ownerId)}sync-v2`;
  if (!(await Dexie.getDatabaseNames()).includes(name)) return false;
  const storage = new SyncStorage(name);
  try { return (await storage.updates.count()) > 0; }
  finally { storage.close(); }
}
export async function readOwnerPendingDrafts(ownerId: string): Promise<Array<{ resourceId: string; body: string }>> {
  const name = `${await ownerPrefix(ownerId)}sync-v2`;
  if (!(await Dexie.getDatabaseNames()).includes(name)) return [];
  const storage = new SyncStorage(name);
  try {
    return await storage.transaction("r", storage.documents, storage.updates, async () => {
      const pending = new Set((await storage.updates.toArray()).map(({ documentKey }) => documentKey));
      return (await storage.documents.toArray()).filter(({ documentKey }) => pending.has(documentKey)).map((cached) => {
        const document = createLyricDocument();
        try { Y.applyUpdate(document, cached.snapshot); return { resourceId: cached.resourceId, body: lyricBody(document).toString() }; }
        finally { document.destroy(); }
      });
    });
  } finally { storage.close(); }
}
export async function clearOtherOwnerLocalDrafts(ownerId: string): Promise<void> {
  const current = await ownerPrefix(ownerId);
  const names = (await Dexie.getDatabaseNames()).filter((name) => /^lyricscloud-draft-[a-f0-9]{64}-/.test(name) && !name.startsWith(current));
  for (const prefix of new Set(names.map((name) => name.slice(0, "lyricscloud-draft-".length + 65)))) {
    const channel = new BroadcastChannel(prefix);
    channel.postMessage("clear"); channel.close();
  }
  for (const name of names) await Dexie.delete(name);
}
async function readLegacyDraft(name: string): Promise<string | null> {
  if (!(await Dexie.getDatabaseNames()).includes(name)) return null;
  const { IndexeddbPersistence } = await import("y-indexeddb");
  const document = createLyricDocument();
  const persistence = new IndexeddbPersistence(name, document);
  try { await persistence.whenSynced; return lyricBody(document).toString(); }
  finally { await persistence.destroy(); document.destroy(); }
}
async function ownerPrefix(ownerId: string) { return `lyricscloud-draft-${await digest(ownerId)}-`; }
async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
function encode(bytes: Uint8Array) {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 8_192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8_192));
  return btoa(binary);
}
function decode(payload: string) { return Uint8Array.from(atob(payload), (character) => character.charCodeAt(0)); }
