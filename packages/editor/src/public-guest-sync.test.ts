import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Y from "yjs";
import { EditorState, Transaction } from "@codemirror/state";
import { history, undo } from "@codemirror/commands";
import { createBrowserPublicSharedLyricSync, type BrowserPublicSharedLyricSync } from "./browser-sync.js";
import { createLyricDocument, lyricBody } from "./crdt.js";
import type { LocalDocument, QueuedUpdate, RejectedWriterDraft } from "./sync-storage.js";

const memory = vi.hoisted(() => ({ stores: new Map<string, any>() }));

// Isolate only IndexedDB and WebSocket. Persistence/rejection methods and Yjs
// updates run unchanged, including the cache's merge-on-persist behavior.
vi.mock("./sync-storage.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./sync-storage.js")>();
  class Table<T extends object> {
    rows = new Map<string, T>();
    constructor(private key: keyof T) {}
    async get(key: string) { return this.rows.get(key); }
    async put(row: T) { this.rows.set(String(row[this.key]), row); }
    async delete(key: string) { this.rows.delete(key); }
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
    async transaction(...args: unknown[]) { return (args.at(-1) as () => Promise<unknown>)(); }
    persist = actual.SyncStorage.prototype.persist;
    rejectWriterEpoch = actual.SyncStorage.prototype.rejectWriterEpoch;
    close() {}
  }
  return { ...actual, SyncStorage: MemoryStorage };
});

class Socket {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  sent: Array<Record<string, any>> = [];
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: (event: { code: number }) => void;
  constructor(_url: URL) { Socket.instances.push(this); }
  open() { this.readyState = Socket.OPEN; this.onopen?.(); }
  send(value: string) { this.sent.push(JSON.parse(value)); }
  receive(message: object) { this.onmessage?.({ data: JSON.stringify(message) }); }
  close(code = 1000) {
    if (this.readyState === 3) return;
    this.readyState = 3; this.onclose?.({ code });
  }
}

const linkId = "11300000-0000-4000-8000-000000000011";
const guest = { id: "11300000-0000-4000-8000-000000000012", token: "synthetic-guest",
  recoveryId: "11300000-0000-4000-8000-000000000013", permissionEpoch: 1, writeEpoch: 1,
  displayName: "합성 게스트", expiresAt: "2099-01-01T00:00:00.000Z" };
const encode = (document: Y.Doc) => Buffer.from(Y.encodeStateAsUpdate(document)).toString("base64");
let active: BrowserPublicSharedLyricSync | undefined;

beforeEach(() => {
  memory.stores.clear(); Socket.instances = [];
  vi.stubGlobal("WebSocket", Socket);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { onLine: true });
  vi.stubGlobal("location", { origin: "http://127.0.0.1:3000" });
});
afterEach(async () => { await active?.destroy(); active = undefined; vi.unstubAllGlobals(); });

describe("public guest live write revocation", () => {
  it.each([
    { base: "ABCD", change: { from: 1, to: 3, insert: "한" }, at: 2, remote: "원격", merged: "A한원격D" },
    { base: "기준", change: { from: 0, to: 2, insert: "확정" }, at: 2, remote: "\n원격", merged: "확정\n원격" }
  ])("preserves concurrent text and local undo when IME replaces $base", async ({ base, change, at, remote, merged }) => {
    const server = createLyricDocument(base);
    let editor = EditorState.create({ doc: base, extensions: history() });
    let body = ""; let state = ""; let presenceEvents = 0;
    try {
      active = await createBrowserPublicSharedLyricSync({ token: "synthetic-link", linkId, guestSession: guest,
        onBody(value, changes) {
          body = value;
          if (changes) editor = editor.update({ changes, annotations: Transaction.addToHistory.of(false) }).state;
        }, onStateChange(value) { state = value; },
        onAccessChange() {}, onPresenceChange() { presenceEvents++; }, onRejectedDrafts() {} });
      const socket = Socket.instances.at(-1)!; socket.open();
      socket.receive({ type: "snapshot", payload: encode(server), access: "public-write",
        permissionEpoch: 1, writeEpoch: 1, guestSessionId: guest.id });
      await vi.waitFor(() => expect(state).toBe("live"));
      active.setComposing(true);
      lyricBody(server).insert(at, remote);
      socket.receive({ type: "update", payload: encode(server) });
      // Presence is handled on the same socket queue, after the remote edit.
      const previousPresence = presenceEvents;
      socket.receive({ type: "presence", participants: [] });
      await vi.waitFor(() => expect(presenceEvents).toBeGreaterThan(previousPresence));
      expect(body).toBe(base);
      editor = editor.update({ changes: change }).state;
      active.applyLocalTransaction({ origin: "user", composing: false,
        changes: [change] });
      active.setComposing(false);
      expect(body).toBe(merged);
      expect(editor.doc.toString()).toBe(merged);
      expect(undo({ state: editor, dispatch: (transaction) => { editor = transaction.state; } })).toBe(true);
      // CodeMirror restores the replaced characters at the current insertion
      // boundary; the concurrent insertion must survive that local undo.
      expect(editor.doc.toString()).toContain(remote);
      expect(editor.doc.toString().replace(remote, "")).toBe(base);
      await vi.waitFor(() => expect(socket.sent.filter((message) => message.type === "update")).toHaveLength(1));
      const update = socket.sent.find((message) => message.type === "update")!;
      Y.applyUpdate(server, Buffer.from(update.payload, "base64"));
      expect(lyricBody(server).toString()).toBe(body);
      const storage = memory.stores.values().next().value!;
      expect((await storage.updates.where("updateId").equals(update.updateId).first()).authoredText).toBe(change.insert);
    } finally { server.destroy(); }
  });

  it.each(["permission", "write-revoked", "epoch-stale"] as const)(
    "%s removes unaccepted Yjs edits from body/cache while keeping only actor-authored recovery", async (event) => {
      const ownerBody = "소유자 원문";
      const acceptedText = " 승인된 게스트 입력";
      const rejectedText = " 회수된 게스트 입력";
      const remoteText = " 다른 작성자의 입력";
      const server = createLyricDocument(ownerBody);
      let body = ""; let state = "";
      const options = { token: "synthetic-link", linkId, guestSession: guest,
        onBody: (value: string) => { body = value; }, onStateChange: (value: string) => { state = value; },
        onAccessChange() {}, onPresenceChange() {}, onRejectedDrafts() {} };
      try {
        active = await createBrowserPublicSharedLyricSync(options);
        const socket = Socket.instances.at(-1)!; socket.open();
        const writeAccess = { access: "public-write", permissionEpoch: 1, writeEpoch: 1, guestSessionId: guest.id };
        socket.receive({ type: "snapshot", payload: encode(server), ...writeAccess });
        await vi.waitFor(() => expect(state).toBe("live"));

        // One acknowledged local edit must survive alongside later remote edits.
        active.applyLocalTransaction({ origin: "user", composing: false,
          changes: [{ from: ownerBody.length, to: ownerBody.length, insert: acceptedText }] });
        await vi.waitFor(() => expect(socket.sent.filter((message) => message.type === "update")).toHaveLength(1));
        const accepted = socket.sent.find((message) => message.type === "update")!;
        Y.applyUpdate(server, Buffer.from(accepted.payload, "base64"));
        socket.receive({ type: "ack", updateId: accepted.updateId });
        await vi.waitFor(() => expect(state).toBe("live"));

        const position = lyricBody(server).length;
        active.applyLocalTransaction({ origin: "user", composing: false,
          changes: [{ from: position, to: position, insert: rejectedText }] });
        await vi.waitFor(() => expect(socket.sent.filter((message) => message.type === "update")).toHaveLength(2));
        const rejected = socket.sent.filter((message) => message.type === "update")[1]!;
        // This local update never reaches the server; a remote update still does.
        lyricBody(server).insert(position, remoteText);
        socket.receive({ type: "update", payload: encode(server) });
        await vi.waitFor(() => expect(body).toContain(rejectedText));
        const authoritative = lyricBody(server).toString();
        const readAccess = { access: "public-read", permissionEpoch: 1, writeEpoch: 2 };
        socket.receive(event === "permission" ? { type: "permission", ...readAccess }
          : { type: "rejected", updateId: rejected.updateId,
              code: event === "epoch-stale" ? "SYNC_WRITE_EPOCH_STALE" : "SYNC_WRITE_REVOKED", ...readAccess });
        await vi.waitFor(() => expect(body).toBe(authoritative));

        const storage = memory.stores.values().next().value!;
        await vi.waitFor(async () => {
          const cached = await storage.documents.get(linkId) as LocalDocument;
          const restored = createLyricDocument();
          try { Y.applyUpdate(restored, cached.snapshot); expect(lyricBody(restored).toString()).toBe(authoritative); }
          finally { restored.destroy(); }
        });
        const drafts = await active.listRejectedDrafts();
        expect(drafts).toHaveLength(1);
        expect(drafts[0]).toMatchObject({ updateId: rejected.updateId, authoredText: rejectedText,
          reason: event === "epoch-stale" ? "epoch-stale" : "write-revoked" });
        expect(await storage.updates.where("documentKey").equals(linkId).count()).toBe(0);

        // A subsequent read snapshot cannot merge the rejected edit back in.
        socket.close(); active.retry();
        const reader = Socket.instances.at(-1)!; reader.open();
        reader.receive({ type: "snapshot", payload: encode(server), ...readAccess });
        await vi.waitFor(() => expect(state).toBe("live"));
        expect(body).toBe(authoritative);
        await active.destroy(); active = undefined;

        // Regrant uses a new guest session but the same recovery/cache partition.
        state = ""; body = "";
        const renewed = { ...guest, id: "11300000-0000-4000-8000-000000000014", writeEpoch: 3 };
        active = await createBrowserPublicSharedLyricSync({ ...options, guestSession: renewed });
        expect(body).toBe(authoritative);
        const regranted = Socket.instances.at(-1)!; regranted.open();
        regranted.receive({ type: "snapshot", payload: encode(server), ...writeAccess,
          guestSessionId: renewed.id, writeEpoch: renewed.writeEpoch });
        await vi.waitFor(() => expect(state).toBe("live"));
        expect(body).toBe(authoritative);
        expect(regranted.sent.filter((message) => message.type === "update")).toHaveLength(0);
        expect((await active.listRejectedDrafts()).map((draft) => draft.authoredText)).toEqual([rejectedText]);
      } finally { server.destroy(); }
    });
});
