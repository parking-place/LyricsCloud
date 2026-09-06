import { Dexie } from "dexie";
import * as Y from "yjs";
import {
  normalizePromptToken, PROMPT_LIMITS, type CheckpointReason, type LyricRevision, type PromptDuplicate,
  type PromptTokenValue, type RestoreRevisionInput, type RevisionHistory
} from "@lyricscloud/domain";
import {
  createPromptDocument, insertPromptToken, projectPrompt,
  promptTitle, promptTokenSequence, removePromptToken, type PromptSequenceItem
} from "./crdt.js";
import type { LocalSyncState } from "./browser-sync.js";
import { SyncStorage, type QueuedUpdate } from "./sync-storage.js";

export interface PromptEditorSnapshot {
  readonly title: string;
  readonly items: readonly PromptSequenceItem[];
  readonly tokens: readonly PromptTokenValue[];
  readonly readTokens: readonly PromptTokenValue[];
  readonly plainText: string;
  readonly duplicates: readonly PromptDuplicate[];
}

export interface BrowserPromptSync {
  setTitle(value: string): void;
  insertTokens(values: readonly string[], index?: number): void;
  removeToken(occurrenceId: string): void;
  cleanupDuplicates(): void;
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

export interface BrowserPromptSyncOptions {
  readonly ownerId: string;
  readonly resourceId: string;
  readonly onPromptChange: (snapshot: PromptEditorSnapshot) => void;
  readonly onStateChange: (state: LocalSyncState) => void;
  readonly onEditableChange?: (editable: boolean) => void;
}

const localOrigin = Symbol("lyricscloud-prompt-local");
const remoteOrigin = Symbol("lyricscloud-prompt-remote");

export async function createBrowserPromptSync(options: BrowserPromptSyncOptions): Promise<BrowserPromptSync> {
  options.onStateChange("loading");
  options.onEditableChange?.(false);
  const prefix = await ownerPrefix(options.ownerId);
  const storage = new SyncStorage(`${prefix}sync-v2`);
  const document = createPromptDocument();
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
  let retryDelay = 500;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let ackTimer: ReturnType<typeof setTimeout> | undefined;
  let writes = Promise.resolve();
  const remoteQueue: Uint8Array[] = [];
  const waiters = new Set<(saved: boolean) => void>();
  const abort = new AbortController();

  function snapshot(): PromptEditorSnapshot {
    const projected = projectPrompt(document);
    return { ...projected, items: promptTokenSequence(document).toArray() };
  }
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
    const cached = Y.encodeStateAsUpdate(document);
    const queued: QueuedUpdate | undefined = update ? { documentKey, updateId: crypto.randomUUID(), payload: update } : undefined;
    pendingWrites++;
    emit("saving-local");
    writes = writes.then(() => storage.persist({ resourceId: options.resourceId, documentKey, snapshot: cached }, queued))
      .catch(() => fail("error"))
      .finally(() => { pendingWrites--; });
    void writes.then(() => pump()).catch(() => fail("error"));
  }
  document.on("update", (update: Uint8Array, origin: unknown) => {
    if (!initialized) return;
    try { options.onPromptChange(snapshot()); } catch { return fail("error"); }
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
          ackTimer = setTimeout(() => socket?.close(), 8_000);
        }
      }
      await report();
    } catch { fail("error"); }
    finally { pumping = false; if (pumpAgain) { pumpAgain = false; void pump(); } }
  }
  async function receive(raw: string) {
    const message = JSON.parse(raw) as { type: string; payload?: string; updateId?: string; projection?: string };
    if (destroyed || halted) return;
    if (message.type === "snapshot" && message.payload) {
      const update = decode(message.payload);
      if (!initialized) {
        Y.applyUpdate(document, update, remoteOrigin);
        initialized = true;
        options.onPromptChange(snapshot());
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
        connected = false; inFlight = undefined; clearTimeout(ackTimer);
        if (event.code === 4404) return fail("unavailable");
        if (event.code === 4400) return fail("error");
        void report().catch(() => fail("error")); reconnect();
      };
      current.onerror = () => current.close();
    } catch { void report().catch(() => fail("error")); reconnect(); }
    finally { connecting = false; }
  }
  function online() { clearTimeout(retryTimer); retryTimer = undefined; retryDelay = 500; void connect(); }
  function offline() { connected = false; socket?.close(); void report().catch(() => fail("error")); }
  async function destroy() {
    if (destroyed) return;
    destroyed = true; abort.abort(); clearTimeout(retryTimer); clearTimeout(ackTimer); socket?.close(); channel?.close(); accountChannel.close();
    window.removeEventListener("online", online); window.removeEventListener("offline", offline);
    for (const resolve of waiters) resolve(false);
    await writes; storage.close(); document.destroy();
  }
  accountChannel.onmessage = () => { fail("unavailable"); void destroy(); };
  storage.on("versionchange", () => { fail("unavailable"); void destroy(); });
  window.addEventListener("online", online); window.addEventListener("offline", offline);

  async function flush(): Promise<boolean> {
    await writes;
    if (halted || composing || !navigator.onLine || destroyed) return false;
    if (state === "ready") return true;
    return new Promise<boolean>((resolve) => {
      const finish = (saved: boolean) => { clearTimeout(timer); waiters.delete(finish); resolve(saved); };
      const timer = setTimeout(() => finish(false), 8_000);
      waiters.add(finish); void pump();
    });
  }
  async function revisionRequest<T>(path = "", input?: unknown): Promise<T> {
    if (!documentKey || halted || destroyed || !navigator.onLine) throw new Error("REVISION_UNAVAILABLE");
    const response = await fetch(`/collaboration/documents/${documentKey}/revisions${path}`, {
      method: input ? "POST" : "GET", credentials: "same-origin", cache: "no-store",
      ...(input ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) } : {}),
      signal: AbortSignal.any([abort.signal, AbortSignal.timeout(10_000)])
    });
    if (!response.ok) throw new Error("REVISION_UNAVAILABLE");
    return response.json() as Promise<T>;
  }

  try {
    const cached = await storage.documents.get(options.resourceId);
    if (cached) {
      documentKey = cached.documentKey;
      Y.applyUpdate(document, cached.snapshot, remoteOrigin);
      initialized = true;
      options.onPromptChange(snapshot());
      await report();
    }
    void connect();
  } catch { fail("error"); }

  return {
    setTitle(value) {
      if (!initialized || halted) return;
      const title = promptTitle(document);
      if (title.toString() === value) return;
      document.transact(() => { title.delete(0, title.length); if (value) title.insert(0, value); }, localOrigin);
    },
    insertTokens(values, index = promptTokenSequence(document).length) {
      if (!initialized || halted || !values.length) return;
      const normalized = values.map((value) => normalizePromptToken(value).displayValue);
      if (promptTokenSequence(document).length + normalized.length > PROMPT_LIMITS.tokensPerPrompt) throw new RangeError("PROMPT_TOKEN_LIMIT");
      document.transact(() => normalized.forEach((displayValue, offset) => insertPromptToken(document, index + offset, {
        occurrenceId: crypto.randomUUID(), displayValue
      })), localOrigin);
    },
    removeToken(occurrenceId) {
      if (!initialized || halted) return;
      document.transact(() => removePromptToken(document, occurrenceId), localOrigin);
    },
    cleanupDuplicates() {
      if (!initialized || halted) return;
      const seen = new Set<string>();
      const duplicateIds: string[] = [];
      for (const item of promptTokenSequence(document).toArray()) {
        const key = normalizePromptToken(item.displayValue).normalizedValue;
        if (seen.has(key)) duplicateIds.push(item.occurrenceId); else seen.add(key);
      }
      document.transact(() => duplicateIds.forEach((id) => removePromptToken(document, id)), localOrigin);
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
      if (!documentKey || halted || destroyed || !navigator.onLine) return;
      void fetch(`/collaboration/documents/${documentKey}/revisions`, { method: "POST", credentials: "same-origin", keepalive: true,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: "leave" }) }).catch(() => undefined);
    },
    listRevisions() { return revisionRequest<RevisionHistory>(); },
    getRevision(id) { return revisionRequest<LyricRevision>(`/${id}`); },
    async restoreRevision(id, input) {
      if (!await flush()) throw new Error("REVISION_UNAVAILABLE");
      const result = await revisionRequest<{ payload: string }>(`/${id}/restore`, input);
      applyRemote(decode(result.payload)); projectionPending = false; await writes; await report();
      if (halted) throw new Error("REVISION_LOCAL_SAVE_FAILED");
    },
    retry() {
      if (halted === "conflict" || destroyed) return;
      if (halted === "error") { halted = undefined; persist(Y.encodeStateAsUpdate(document)); }
      if (halted === "unavailable") halted = undefined;
      online(); void pump();
    },
    destroy
  };
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
