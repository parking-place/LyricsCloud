import * as Y from "yjs";
import type { EditorDocumentTransaction, EditorTextChange } from "./codemirror.js";
import { createLyricDocument, lyricBody } from "./crdt.js";

export type LocalSyncState = "loading" | "ready" | "local" | "offline";

export interface BrowserLyricSync {
  applyLocalTransaction(transaction: EditorDocumentTransaction): void;
  destroy(): Promise<void>;
}

const localOrigin = Symbol("lyricscloud-local");
const remoteOrigin = Symbol("lyricscloud-remote");

export async function createBrowserLyricSync(options: {
  ownerId: string;
  resourceId: string;
  initialBody: string;
  onRemoteBody: (body: string) => void;
  onStateChange: (state: LocalSyncState) => void;
}): Promise<BrowserLyricSync> {
  options.onStateChange("loading");
  const key = await localDocumentKey(options.ownerId, options.resourceId);
  const document = createLyricDocument();
  const text = lyricBody(document);
  const { IndexeddbPersistence } = await import("y-indexeddb");
  const persistence = new IndexeddbPersistence(key, document);
  const channel = new BroadcastChannel(key);
  let ready = false;

  const reportConnectivity = () => options.onStateChange(navigator.onLine ? "ready" : "offline");
  const observer = (event: Y.YTextEvent, transaction: Y.Transaction) => {
    if (ready && transaction.origin !== localOrigin) options.onRemoteBody(event.target.toString());
  };
  text.observe(observer);
  document.on("update", (update: Uint8Array, origin: unknown) => {
    if (origin === localOrigin) {
      channel.postMessage(update.slice().buffer);
      options.onStateChange(navigator.onLine ? "local" : "offline");
    }
  });
  channel.onmessage = (event) => {
    if (event.data instanceof ArrayBuffer) Y.applyUpdate(document, new Uint8Array(event.data), remoteOrigin);
  };
  window.addEventListener("online", reportConnectivity);
  window.addEventListener("offline", reportConnectivity);

  await persistence.whenSynced;
  await withDocumentLock(key, () => {
    if (text.length === 0 && options.initialBody) document.transact(() => text.insert(0, options.initialBody), localOrigin);
  });
  ready = true;
  if (text.toString() !== options.initialBody) options.onRemoteBody(text.toString());
  reportConnectivity();

  return {
    applyLocalTransaction(transaction) {
      if (transaction.origin !== "user" || transaction.composing || transaction.changes.length === 0) return;
      document.transact(() => applyChanges(text, transaction.changes), localOrigin);
    },
    async destroy() {
      ready = false;
      text.unobserve(observer);
      window.removeEventListener("online", reportConnectivity);
      window.removeEventListener("offline", reportConnectivity);
      channel.close();
      await persistence.destroy();
      document.destroy();
    }
  };
}

export async function clearOwnerLocalDrafts(ownerId: string): Promise<void> {
  if (typeof indexedDB.databases !== "function") return;
  const prefix = await ownerPrefix(ownerId);
  const databases = await indexedDB.databases();
  await Promise.all(databases.flatMap((database) => database.name?.startsWith(prefix) ? [deleteDatabase(database.name)] : []));
}

function applyChanges(text: Y.Text, changes: readonly EditorTextChange[]) {
  for (const change of [...changes].sort((left, right) => right.from - left.from)) {
    if (change.to > change.from) text.delete(change.from, change.to - change.from);
    if (change.insert) text.insert(change.from, change.insert);
  }
}

async function localDocumentKey(ownerId: string, resourceId: string) {
  return `${await ownerPrefix(ownerId)}${await digest(resourceId)}`;
}

async function ownerPrefix(ownerId: string) {
  return `lyricscloud-draft-${await digest(ownerId)}-`;
}

async function digest(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function withDocumentLock(key: string, work: () => void) {
  if (navigator.locks) await navigator.locks.request(key, work);
  else work();
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); request.onblocked = () => resolve();
  });
}
