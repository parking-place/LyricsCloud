import { Dexie, type Table } from "dexie";
import * as Y from "yjs";

export interface LocalDocument {
  resourceId: string;
  documentKey: string;
  snapshot: Uint8Array;
}

export interface QueuedUpdate {
  sequence?: number;
  updateId: string;
  documentKey: string;
  payload: Uint8Array;
  grantId?: string;
  permissionEpoch?: number;
  writeEpoch?: number;
  authoredText?: string;
}

export const LOCAL_SYNC_QUEUE_LIMITS = Object.freeze({ count: 64, bytes: 1_048_576 });

export function sameQueuedUpdateCapability(left: QueuedUpdate, right: QueuedUpdate): boolean {
  return left.documentKey === right.documentKey && left.grantId === right.grantId
    && left.permissionEpoch === right.permissionEpoch && left.writeEpoch === right.writeEpoch;
}

export function compactQueuedUpdates(items: readonly QueuedUpdate[],
  createUpdateId: () => string = () => crypto.randomUUID()): QueuedUpdate[] {
  if (items.length < 2 || (items.length <= LOCAL_SYNC_QUEUE_LIMITS.count
    && items.reduce((total, item) => total + item.payload.byteLength, 0) <= LOCAL_SYNC_QUEUE_LIMITS.bytes)) {
    return [...items];
  }
  const first = items[0]!;
  if (!items.every((item) => sameQueuedUpdateCapability(first, item))) throw new Error("SYNC_QUEUE_CAPABILITY_MIXED");
  return [{
    updateId: createUpdateId(), documentKey: first.documentKey,
    payload: Y.mergeUpdates(items.map((item) => item.payload)),
    ...(first.grantId ? { grantId: first.grantId } : {}),
    ...(first.permissionEpoch !== undefined ? { permissionEpoch: first.permissionEpoch } : {}),
    ...(first.writeEpoch !== undefined ? { writeEpoch: first.writeEpoch } : {}),
    authoredText: items.map((item) => item.authoredText ?? "").join("")
  }];
}

export function enqueueRemoteUpdate(queue: Uint8Array[], update: Uint8Array): void {
  queue.push(update);
  if (queue.length > LOCAL_SYNC_QUEUE_LIMITS.count
    || queue.reduce((total, item) => total + item.byteLength, 0) > LOCAL_SYNC_QUEUE_LIMITS.bytes) {
    queue.splice(0, queue.length, Y.mergeUpdates(queue));
  }
}

export interface RejectedWriterDraft {
  updateId: string;
  resourceId: string;
  documentKey: string;
  grantId: string;
  permissionEpoch: number;
  writeEpoch: number;
  authoredText: string;
  reason: "write-revoked" | "read-revoked" | "epoch-stale" | "rate-limited";
  rejectedAt: string;
}

interface SyncMetadata {
  key: string;
  value: number;
}

export class SyncStorage extends Dexie {
  documents!: Table<LocalDocument, string>;
  updates!: Table<QueuedUpdate, number>;
  metadata!: Table<SyncMetadata, string>;
  rejected!: Table<RejectedWriterDraft, string>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ documents: "&resourceId,&documentKey", updates: "++sequence,&updateId,documentKey" });
    this.version(2).stores({ documents: "&resourceId,&documentKey", updates: "++sequence,&updateId,documentKey", metadata: "&key" });
    this.version(3).stores({ documents: "&resourceId,&documentKey", updates: "++sequence,&updateId,documentKey,[documentKey+grantId+permissionEpoch+writeEpoch]",
      metadata: "&key", rejected: "&updateId,resourceId,documentKey,[grantId+permissionEpoch+writeEpoch],rejectedAt" });
  }

  async markCurrentSchema(): Promise<void> {
    await this.metadata.put({ key: "schema", value: 3 });
  }

  // A tab must never replace another tab's newer snapshot or persist a draft
  // without the update that will eventually receive its durable server ACK.
  async persist(document: LocalDocument, update?: QueuedUpdate, protectedUpdateId?: string): Promise<void> {
    await this.transaction("rw", this.documents, this.updates, async () => {
      const current = await this.documents.get(document.resourceId);
      if (current && current.documentKey !== document.documentKey) throw new Error("SYNC_DOCUMENT_CHANGED");
      const snapshot = current ? Y.mergeUpdates([current.snapshot, document.snapshot]) : document.snapshot;
      await this.documents.put({ ...document, snapshot });
      if (update) {
        await this.updates.put(update);
        const sameCapability = (await this.updates.where("documentKey").equals(document.documentKey).toArray())
          .filter((item) => item.updateId !== protectedUpdateId && sameQueuedUpdateCapability(update, item));
        const compacted = compactQueuedUpdates(sameCapability);
        if (compacted.length < sameCapability.length) {
          const sequences = sameCapability.map((item) => item.sequence).filter((value): value is number => value !== undefined);
          await this.updates.bulkDelete(sequences);
          await this.updates.put(compacted[0]!);
        }
      }
    });
  }

  async rejectWriterEpoch(resourceId: string, documentKey: string, capability: {
    grantId: string; permissionEpoch: number; writeEpoch: number;
  }, reason: RejectedWriterDraft["reason"], now = new Date()): Promise<number> {
    return this.transaction("rw", this.documents, this.updates, this.rejected, async () => {
      const pending = await this.updates.where("documentKey").equals(documentKey).toArray();
      const rejected = pending.filter((item) => item.grantId === capability.grantId
        && item.permissionEpoch === capability.permissionEpoch && item.writeEpoch === capability.writeEpoch);
      for (const item of rejected) {
        await this.rejected.put({ updateId: item.updateId, resourceId, documentKey,
          grantId: capability.grantId, permissionEpoch: capability.permissionEpoch, writeEpoch: capability.writeEpoch,
          authoredText: item.authoredText ?? "", reason, rejectedAt: now.toISOString() });
        await this.updates.where("updateId").equals(item.updateId).delete();
      }
      // Once read access is gone, the cached server projection must not remain
      // reachable through recovery. Rejected rows retain only text authored by
      // this actor, never the merged private snapshot or CRDT payload.
      if (reason === "read-revoked") await this.documents.delete(resourceId);
      return rejected.length;
    });
  }
}
